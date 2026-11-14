import { computed, ref } from 'vue'
import type { UserPickerSource } from '@robot-admin/naive-ui-components/C_UserPicker'
import type {
  Department,
  User,
  WorkflowConditionField,
  WorkflowData,
  WorkflowPeopleOptions,
} from '@robot-admin/naive-ui-components/C_WorkFlow'

export interface Collaborator {
  userNo: string
  displayName: string
  departmentId: string
  departmentName: string
  position: string
  enabled: boolean
  initials: string
}
export interface PeopleFilters {
  departmentId?: string
}

const teams = [
  { id: 'design', name: '产品体验部', parentId: 'company' },
  { id: 'engineering', name: '工程研发部', parentId: 'company' },
  { id: 'finance', name: '财务管理部', parentId: 'company' },
]
const names = [
  '林澄',
  '周屿',
  '沈一',
  '陆言',
  '许禾',
  '江莱',
  '陈知远',
  '林澄',
  '顾宁',
  '夏沐',
  '陆青',
  '方旭',
  '闻溪',
  '苏遥',
  '乔安',
  '沈舟',
  '江宁',
  '温言',
]
const records: Collaborator[] = names.map((displayName, index) => {
  const team = teams[index % teams.length]
  return {
    userNo: `BC${String(index + 1).padStart(3, '0')}`,
    displayName,
    departmentId: team.id,
    departmentName: team.name,
    position:
      index < 3
        ? '部门负责人'
        : ['产品设计师', '研发工程师', '财务专员'][index % 3],
    enabled: index !== 5,
    initials: displayName.slice(-2),
  }
})

/** 演示来源保持可取消；同名人员始终按工号区分。 */
function delay(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort)
      resolve()
    }, 140)
    if (signal.aborted) abort()
    else signal.addEventListener('abort', abort, { once: true })
  })
}

/** 独立离线场景：选择草稿、业务范围与流程定义分别持有。 */
export function usePeopleWorkflowDemo() {
  const dark = ref(false)
  const selected = ref<string[]>(['BC008', 'BC001'])
  const scope = ref('factory-A')
  const failNext = ref(false)
  const lastSelection = ref<Collaborator[]>([])
  const receipt = ref('确认后更新协作成员；取消会保留原选择。')
  const readonly = ref(false)
  const remotePeople = ref(true)
  const workflowReceipt = ref('设计、连接和配置均可离线体验。')
  const departments: Department[] = [
    { id: 'company', name: '北辰科技' },
    ...teams,
  ]
  const users: User[] = records
    .filter(row => row.enabled)
    .map(row => ({
      id: row.userNo,
      name: row.displayName,
      departmentId: row.departmentId,
      department: row.departmentName,
      role: row.position,
    }))
  const organizations = [
    {
      id: 'company',
      name: '北辰科技',
      type: 'company',
      children: teams.map(team => ({ ...team, type: 'department' })),
    },
  ]
  const people: WorkflowPeopleOptions = {
    scope: 'purchase-design',
    source: {
      rowKey: 'id',
      label: user => user.name,
      request: async ({ search, page, pageSize, filters, signal }) => {
        await delay(signal)
        const departmentId = filters?.departmentId
        const rows = users.filter(
          user =>
            (!departmentId ||
              departmentId === 'company' ||
              user.departmentId === departmentId) &&
            (!search ||
              `${user.name} ${user.id} ${user.department}`.includes(search))
        )
        return {
          rows: rows.slice((page - 1) * pageSize, page * pageSize),
          total: rows.length,
        }
      },
      resolve: async (values, signal) => {
        await delay(signal)
        return users.filter(user => values.includes(user.id))
      },
    },
    organization: {
      data: organizations,
      field: 'departmentId',
      keyField: 'id',
      labelField: 'name',
      iconConfig: {
        typeMap: {
          company: 'mdi:office-building-outline',
          department: 'mdi:folder-outline',
        },
      },
      actions: [],
      showToolbar: false,
    },
    fields: { code: 'id', department: 'department', job: 'role' },
    fixedFilters: { includeDescendants: true },
  }
  const source = computed<
    UserPickerSource<Collaborator, string, PeopleFilters>
  >(() => {
    const tenant = scope.value
    const available = tenant === 'factory-A' ? records : records.slice(9)
    return {
      rowKey: 'userNo',
      label: row => row.displayName,
      request: async ({ search, page, pageSize, filters, signal }) => {
        await delay(signal)
        if (failNext.value) {
          failNext.value = false
          throw new Error('暂时无法加载人员，请重试')
        }
        const departmentId = filters?.departmentId
        const query = search.trim().toLowerCase()
        const rows = available.filter(
          row =>
            (!departmentId ||
              departmentId === 'company' ||
              departmentId === row.departmentId) &&
            (!query ||
              `${row.displayName} ${row.userNo} ${row.departmentName}`
                .toLowerCase()
                .includes(query))
        )
        return {
          rows: rows.slice((page - 1) * pageSize, page * pageSize),
          total: rows.length,
        }
      },
      resolve: async (values, signal) => {
        await delay(signal)
        return available.filter(row => values.includes(row.userNo))
      },
    }
  })
  const conditionFields: WorkflowConditionField[] = [
    { key: 'amount', label: '申请金额', type: 'number' },
  ]
  const workflow = ref<WorkflowData>({
    config: { title: '采购申请审批', version: '1.0' },
    nodes: [
      {
        id: 'start',
        type: 'start',
        position: { x: 290, y: 30 },
        data: {
          title: '提交采购申请',
          status: 'active',
          initiators: [users[0]],
        },
      },
      {
        id: 'condition',
        type: 'condition',
        position: { x: 290, y: 180 },
        data: {
          title: '按申请金额分流',
          conditions: [
            {
              id: 'large',
              name: '超过一万元',
              field: 'amount',
              operator: 'greater_than',
              value: '10000',
              targetNodeId: 'approval',
              priority: 1,
            },
            {
              id: 'normal',
              name: '其他申请',
              field: 'amount',
              operator: 'less_than',
              value: '10000',
              targetNodeId: 'copy',
              isDefault: true,
              priority: 2,
            },
          ],
        },
      },
      {
        id: 'approval',
        type: 'approval',
        position: { x: 70, y: 370 },
        data: {
          title: '财务复核',
          approvalMode: 'sequence',
          approvers: [users[2], users[1]],
        },
      },
      {
        id: 'copy',
        type: 'copy',
        position: { x: 510, y: 370 },
        data: { title: '知会相关人员', copyUsers: [users[0]] },
      },
    ],
    edges: [
      { id: 'begin', source: 'start', target: 'condition', type: 'smoothstep' },
      {
        id: 'large-edge',
        source: 'condition',
        target: 'approval',
        label: '超过一万元',
        type: 'smoothstep',
      },
      {
        id: 'normal-edge',
        source: 'condition',
        target: 'copy',
        label: '其他申请',
        type: 'smoothstep',
      },
      { id: 'notify', source: 'approval', target: 'copy', type: 'smoothstep' },
    ],
  })
  const organization = {
    data: organizations,
    field: 'departmentId' as const,
    mode: 'org' as const,
    iconConfig: {
      typeMap: {
        company: 'mdi:office-building-outline',
        department: 'mdi:folder-outline',
      },
    },
    actions: [],
    addable: false,
    refreshable: false,
  }
  function onSelect(rows: Collaborator[]) {
    lastSelection.value = rows
    receipt.value = `已确认 ${rows.length} 位成员，保留选择顺序：${rows.map(row => row.userNo).join(' → ')}`
  }
  function switchScope() {
    scope.value = scope.value === 'factory-A' ? 'factory-B' : 'factory-A'
    selected.value = []
    lastSelection.value = []
    receipt.value = '业务范围已切换，请重新选择成员。'
  }
  return {
    dark,
    selected,
    scope,
    failNext,
    source,
    organization,
    lastSelection,
    receipt,
    readonly,
    remotePeople,
    people,
    workflowReceipt,
    workflow,
    users,
    departments,
    conditionFields,
    onSelect,
    switchScope,
  }
}
