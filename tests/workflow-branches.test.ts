import { expect, test } from 'bun:test'
import { isCompleteCondition } from '../src/components/C_WorkFlow/conditions'
import {
  isWorkflowConnectionAllowed,
  validateWorkflowBranches,
} from '../src/components/C_WorkFlow/composables/workflowBranches'
import type {
  Condition,
  WorkflowNode,
} from '../src/components/C_WorkFlow/types'

const branch = (patch: Partial<Condition> = {}): Condition => ({
  id: 'amount',
  name: '申请金额',
  field: 'amount',
  operator: 'greater_than',
  value: '100',
  targetNodeId: 'finance',
  ...patch,
})
const nodes = (conditions = [branch()]): WorkflowNode[] => [
  {
    id: 'start',
    type: 'start',
    position: { x: 0, y: 0 },
    data: { title: '发起', status: 'active' },
  },
  {
    id: 'condition',
    type: 'condition',
    position: { x: 0, y: 100 },
    data: { title: '金额', conditions },
  },
  {
    id: 'finance',
    type: 'copy',
    position: { x: 0, y: 200 },
    data: { title: '财务' },
  },
  {
    id: 'manager',
    type: 'copy',
    position: { x: 200, y: 200 },
    data: { title: '经理' },
  },
]
const edges = [
  { id: 'a', source: 'start', target: 'condition' },
  { id: 'b', source: 'condition', target: 'finance' },
]

test('explicit branches validate targets against real outgoing connections without mutating imports', () => {
  const data = nodes()
  const before = JSON.stringify(data)
  expect(validateWorkflowBranches(data, edges)).toEqual([])
  expect(
    validateWorkflowBranches(
      nodes([branch({ targetNodeId: 'unknown' })]),
      edges
    )
  ).toEqual(
    expect.arrayContaining([expect.objectContaining({ type: 'invalid' })])
  )
  expect(
    validateWorkflowBranches(data, edges.slice(0, 1))[0].message
  ).toContain('尚未连接')
  expect(JSON.stringify(data)).toBe(before)
})

test('legacy unbound forks retain only a nonblocking warning', () => {
  const unbound = branch()
  delete unbound.targetNodeId
  expect(validateWorkflowBranches(nodes([unbound]), edges)).toEqual([])
  const result = validateWorkflowBranches(nodes([unbound]), [
    ...edges,
    { id: 'c', source: 'condition', target: 'manager' },
  ])
  expect(result).toHaveLength(1)
  expect(result[0]).toMatchObject({ type: 'warning', severity: 'low' })
})

test('partial binding, duplicate target/default/priority and unmatched edges are actionable errors', () => {
  const cases = [
    [branch(), branch({ id: 'other', targetNodeId: undefined })],
    [branch(), branch({ id: 'other' })],
    [
      branch({ isDefault: true }),
      branch({ id: 'other', isDefault: true, targetNodeId: 'manager' }),
    ],
    [
      branch({ priority: 0 }),
      branch({ id: 'other', priority: 0, targetNodeId: 'manager' }),
    ],
    [branch({ priority: -1 })],
    [branch({ targetNodeId: 'start' })],
    [branch({ targetNodeId: 'condition' })],
  ]
  for (const conditions of cases)
    expect(
      validateWorkflowBranches(nodes(conditions), edges).some(
        issue => issue.type === 'invalid'
      )
    ).toBe(true)
  expect(
    validateWorkflowBranches(nodes(), [
      ...edges,
      { id: 'c', source: 'condition', target: 'manager' },
    ]).some(issue => issue.message.includes('未绑定条件'))
  ).toBe(true)
})

test('field types validate serialized values without changing the legacy string contract', () => {
  const fields = [{ key: 'amount', label: '金额', type: 'number' as const }]
  expect(isCompleteCondition(branch({ value: '0' }), fields)).toBe(true)
  expect(isCompleteCondition(branch({ value: 'NaN' }), fields)).toBe(false)
  expect(
    isCompleteCondition(branch({ value: '0', field: 'missing' }), fields)
  ).toBe(false)
  expect(
    isCompleteCondition(branch({ field: 'active', value: 'false' }), [
      { key: 'active', label: '启用', type: 'boolean' },
    ])
  ).toBe(true)
  expect(
    isCompleteCondition(branch({ field: 'date', value: '2026-02-31' }), [
      { key: 'date', label: '日期', type: 'date' },
    ])
  ).toBe(false)
  expect(
    isCompleteCondition(branch({ field: 'date', value: '2024-02-29' }), [
      { key: 'date', label: '日期', type: 'date' },
    ])
  ).toBe(true)
  expect(
    isCompleteCondition(
      branch({ isDefault: true, field: '', value: '' }),
      fields
    )
  ).toBe(true)
  expect(
    isCompleteCondition({ id: 'fallback', name: '默认', isDefault: true })
  ).toBe(false)
})

test('connection edits reject self, missing, duplicate and start targets and honor the cycle policy', () => {
  const data = nodes()
  for (const target of ['start', 'condition', 'unknown'])
    expect(
      isWorkflowConnectionAllowed(data, edges, { source: 'condition', target })
    ).toBe(false)
  expect(
    isWorkflowConnectionAllowed(data, edges, {
      source: 'condition',
      target: 'finance',
    })
  ).toBe(false)
  expect(
    isWorkflowConnectionAllowed(
      data,
      edges,
      { source: 'finance', target: 'condition' },
      true
    )
  ).toBe(true)
  expect(
    isWorkflowConnectionAllowed(
      data,
      edges,
      { source: 'finance', target: 'condition' },
      false
    )
  ).toBe(false)
  expect(
    isWorkflowConnectionAllowed(
      data,
      edges,
      { source: 'condition', target: 'finance' },
      false,
      'b'
    )
  ).toBe(true)
})
