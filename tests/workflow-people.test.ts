import { describe, expect, test } from 'bun:test'
import {
  createLegacyWorkflowPeople,
  getWorkflowPeople,
} from '../src/components/C_WorkFlow/people'
import type {
  Department,
  User,
  WorkflowNode,
} from '../src/components/C_WorkFlow/types'

const user = (id: string, department: string, departmentId?: string): User => ({
  id,
  name: id,
  department,
  departmentId,
  role: '成员',
})
const query = (departmentId?: string, includeDescendants = false) => ({
  page: 1,
  pageSize: 20,
  search: '',
  signal: new AbortController().signal,
  filters: { departmentId, includeDescendants },
})

describe('workflow legacy people adapter', () => {
  test('builds owned hierarchical organizations, matches stable IDs and refuses ambiguous department names', async () => {
    const departments: Department[] = [
      { id: 'root', name: '总部' },
      { id: 'east', name: '研发', parentId: 'root' },
      { id: 'west', name: '研发', parentId: 'root' },
      { id: 'orphan', name: '运营', parentId: 'missing' },
    ]
    const users = [
      user('A', '研发', 'east'),
      user('B', '研发'),
      user('C', '总部'),
    ]
    const before = JSON.stringify({ departments, users })
    const people = createLegacyWorkflowPeople(users, departments)
    expect(people.fixedFilters).toEqual({ includeDescendants: true })
    expect(people.organization?.data).toEqual([
      {
        id: 'root',
        name: '总部',
        children: [
          { id: 'east', name: '研发', parentId: 'root', children: undefined },
          { id: 'west', name: '研发', parentId: 'root', children: undefined },
        ],
      },
      { id: 'orphan', name: '运营', parentId: 'missing', children: undefined },
    ])
    expect(
      (await people.source.request(query('east'))).rows.map(row => row.id)
    ).toEqual(['A'])
    expect(
      (await people.source.request(query('root', true))).rows.map(row => row.id)
    ).toEqual(['A', 'C'])
    expect(
      (await people.source.request(query())).rows.map(row => row.id)
    ).toEqual(['A', 'B', 'C'])
    expect(JSON.stringify({ departments, users })).toBe(before)
  })

  test('keeps saved records without a directory and resolves requested order, not source order', async () => {
    const a = user('A', '研发')
    const b = user('B', '研发')
    const people = createLegacyWorkflowPeople([], [], [b, a])
    expect(
      await people.source.resolve?.(['B', 'A'], new AbortController().signal)
    ).toEqual([b, a])
    const node: WorkflowNode<'approval'> = {
      id: 'n',
      type: 'approval',
      position: { x: 0, y: 0 },
      data: { title: '审批', approvers: [b, a], approvalMode: 'sequence' },
    }
    expect(getWorkflowPeople(node)).toEqual([b, a])
    expect(getWorkflowPeople(null)).toEqual([])
  })

  test('contains cycles and honors aborted paginated searches', async () => {
    const departments: Department[] = [
      { id: 'a', name: 'A', parentId: 'b' },
      { id: 'b', name: 'B', parentId: 'a' },
    ]
    const people = createLegacyWorkflowPeople(
      [user('A', 'A', 'a'), user('B', 'B', 'b')],
      departments
    )
    expect(people.organization?.data).toHaveLength(2)
    expect(
      (
        await people.source.request({ ...query(), pageSize: 1, page: 2 })
      ).rows.map(row => row.id)
    ).toEqual(['B'])
    const controller = new AbortController()
    controller.abort()
    expect(
      people.source.request({ ...query(), signal: controller.signal })
    ).rejects.toThrow()
  })
})
