import type { DataPickerValue } from '../C_DataPicker/types'
import type {
  UserPickerSource,
  UserPickerFields,
  UserPickerOrganization,
} from '../C_UserPicker/types'
import type { Department, User, WorkflowNode } from './types'

/** 部门范围通过稳定编码传递；是否包含下级由来源的业务规则决定。 */
export interface WorkflowPeopleFilters {
  departmentId?: DataPickerValue
  includeDescendants?: boolean
}

/** 工作流只消费人员来源，不绑定组织服务、登录态或后端权限协议。 */
export interface WorkflowPeopleOptions {
  source: UserPickerSource<User, string, WorkflowPeopleFilters>
  organization?: UserPickerOrganization<Department, WorkflowPeopleFilters>
  fields?: UserPickerFields<User>
  fixedFilters?: WorkflowPeopleFilters
  rowCheckable?: (user: User) => boolean
  maxSelection?: number
  scope?: string | number
}

interface OrganizationDepartment extends Department {
  children?: OrganizationDepartment[]
}

/** 旧用户、部门输入在包内适配一次；新项目可直接使用远程 people.source。 */
export function createLegacyWorkflowPeople(
  users: readonly User[],
  departments: readonly Department[],
  existing: readonly User[] = []
): WorkflowPeopleOptions {
  const byId = new Map(users.map(user => [user.id, user]))
  // 未传候选目录时，原节点中的人员仍能正常回显和原样保存。
  if (!users.length) for (const user of existing) byId.set(user.id, user)
  const rows = [...byId.values()]
  const tree = createDepartmentTree(departments)
  const names = new Map<string, string[]>()
  for (const department of departments) {
    const ids = names.get(department.name) ?? []
    ids.push(department.id)
    names.set(department.name, ids)
  }
  const departmentId = (user: User): string | undefined => {
    const explicit: unknown = Reflect.get(user, 'departmentId')
    if (typeof explicit === 'string') return explicit
    const matches = names.get(user.department)
    // 重名部门不能凭展示名称猜测归属；它们仍出现在“全部”与全局搜索中。
    return matches?.length === 1 ? matches[0] : undefined
  }
  const source: WorkflowPeopleOptions['source'] = {
    rowKey: 'id',
    label: user => user.name,
    request: async ({ search, page, pageSize, filters, signal }) => {
      signal.throwIfAborted()
      const keyword = search.trim().normalize('NFKC').toLocaleLowerCase()
      const ids = departmentScope(departments, filters)
      const filtered = rows.filter(user => {
        if (ids && !ids.has(departmentId(user) ?? '')) return false
        return (
          !keyword ||
          [user.name, user.id, user.department, user.role].some(value =>
            value.normalize('NFKC').toLocaleLowerCase().includes(keyword)
          )
        )
      })
      return {
        rows: filtered.slice((page - 1) * pageSize, page * pageSize),
        total: filtered.length,
      }
    },
    resolve: async (values, signal) => {
      signal.throwIfAborted()
      return values.flatMap(value => {
        const user = typeof value === 'string' ? byId.get(value) : undefined
        return user ? [user] : []
      })
    },
  }
  return {
    source,
    // 旧输入提供完整目录，部门筛选明确包含下级；远程来源自行声明其范围规则。
    fixedFilters: { includeDescendants: true },
    fields: {
      avatar: 'avatar',
      code: 'id',
      department: 'department',
      job: 'role',
    },
    organization: {
      data: tree,
      field: 'departmentId',
      keyField: 'id',
      labelField: 'name',
      showToolbar: false,
      actions: [],
    },
  }
}

/** 仅恢复展示层级，不修改调用方节点；孤儿或循环关系安全退回根级。 */
function createDepartmentTree(
  departments: readonly Department[]
): OrganizationDepartment[] {
  const entries = new Map<string, OrganizationDepartment>()
  for (const node of departments)
    if (!entries.has(node.id))
      entries.set(node.id, { ...node, children: undefined })
  const roots: OrganizationDepartment[] = []
  for (const node of entries.values()) {
    const parent = node.parentId && entries.get(node.parentId)
    if (parent && !hasAncestorCycle(node, entries))
      (parent.children ??= []).push(node)
    else roots.push(node)
  }
  return roots
}

function hasAncestorCycle(
  node: Department,
  entries: ReadonlyMap<string, Department>
): boolean {
  const visited = new Set([node.id])
  let id = node.parentId
  while (id) {
    if (visited.has(id)) return true
    visited.add(id)
    id = entries.get(id)?.parentId
  }
  return false
}

function departmentScope(
  departments: readonly Department[],
  filters?: WorkflowPeopleFilters
): Set<string> | null {
  if (filters?.departmentId === undefined) return null
  const selected = new Set([String(filters.departmentId)])
  if (!filters.includeDescendants) return selected
  let changed = true
  while (changed) {
    changed = false
    for (const department of departments) {
      if (
        !selected.has(department.id) &&
        department.parentId &&
        selected.has(department.parentId)
      ) {
        selected.add(department.id)
        changed = true
      }
    }
  }
  return selected
}

/** 审批、发起和抄送保持同一种选人事务，并保留原节点的明确顺序。 */
export function getWorkflowPeople(node: WorkflowNode | null): readonly User[] {
  if (node?.type === 'approval') return node.data.approvers ?? []
  if (node?.type === 'start') return node.data.initiators ?? []
  if (node?.type === 'copy') return node.data.copyUsers ?? []
  return []
}
