import { beforeEach, expect, test, vi } from 'vitest'
import { NCheckbox, NInputNumber, NSelect } from 'naive-ui'
import { defineComponent, h, type PropType } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import NodeConfigModal from '../../src/components/C_WorkFlow/NodeConfigModal.vue'
import type {
  DataPickerSourceInput,
  DataPickerValue,
} from '../../src/components/C_DataPicker/types'
import type {
  WorkflowPeopleFilters,
  WorkflowPeopleOptions,
} from '../../src/components/C_WorkFlow/people'
import type { User, WorkflowNode } from '../../src/components/C_WorkFlow/types'

const a: User = { id: 'A', name: '甲', department: '研发', role: '成员' }
const b: User = { id: 'B', name: '乙', department: '研发', role: '成员' }
const approval = (rows: User[] = [b, a]): WorkflowNode<'approval'> => ({
  id: 'approval',
  type: 'approval',
  position: { x: 0, y: 0 },
  data: { title: '审批', approvers: rows, approvalMode: 'sequence' },
})
let draft: { values: DataPickerValue[]; rows: User[] } | undefined
let validate: () => Promise<boolean>
const close = vi.fn()
const PickerStub = defineComponent({
  name: 'C_UserPicker',
  props: {
    modelValue: Array as PropType<readonly DataPickerValue[]>,
    source: Object as PropType<
      DataPickerSourceInput<User, WorkflowPeopleFilters>
    >,
  },
  emits: ['update:modelValue', 'select'],
  setup(props, { emit, expose }) {
    expose({
      close,
      confirm: async () => {
        if (!(await validate())) return false
        if (draft) {
          emit('update:modelValue', draft.values)
          emit('select', draft.rows)
        }
        return true
      },
    })
    return () => h('div', { 'data-picker': '' }, props.modelValue?.join(','))
  },
})
const ModalStub = defineComponent({
  name: 'NModal',
  props: {
    show: Boolean,
    onPositiveClick: Function as PropType<() => Promise<boolean>>,
    onNegativeClick: Function as PropType<() => void>,
  },
  setup(props, { slots }) {
    return () =>
      h('div', [
        slots.default?.(),
        h(
          'button',
          { 'data-save': '', onClick: props.onPositiveClick },
          '保存'
        ),
        h(
          'button',
          { 'data-cancel': '', onClick: props.onNegativeClick },
          '取消'
        ),
      ])
  },
})
function mountConfig(
  node: WorkflowNode = approval(),
  people?: WorkflowPeopleOptions
) {
  return mount(NodeConfigModal, {
    props: {
      show: true,
      currentNode: node,
      users: [a, b],
      departments: [{ id: 'dept', name: '研发' }],
      people,
    },
    global: {
      stubs: { C_UserPicker: PickerStub, Modal: ModalStub, NModal: ModalStub },
    },
  })
}
beforeEach(() => {
  draft = undefined
  validate = async () => true
  close.mockClear()
})

test('existing sequence order survives save even when candidate source order differs', async () => {
  const node = approval()
  const wrapper = mountConfig(node)
  expect(wrapper.get('[data-picker]').text()).toBe('B,A')
  await wrapper.get('[data-save]').trigger('click')
  await flushPromises()
  expect(wrapper.emitted('save')).toEqual([
    [{ approvers: [b, a], approvalMode: 'sequence' }],
  ])
  expect(node.data.approvers).toEqual([b, a])
  wrapper.unmount()
})

test('new selection preserves ID order instead of resolver or page order', async () => {
  const wrapper = mountConfig(approval([]))
  draft = { values: ['B', 'A'], rows: [a, b] }
  await wrapper.get('[data-save]').trigger('click')
  await flushPromises()
  expect(wrapper.emitted('save')?.[0]).toEqual([
    { approvers: [b, a], approvalMode: 'sequence' },
  ])
  wrapper.unmount()
})

test('cancel discards changes, and reopening the same node restores its original people', async () => {
  const node = approval([a])
  const wrapper = mountConfig(node)
  draft = { values: ['B'], rows: [b] }
  wrapper.findComponent(PickerStub).vm.$emit('update:modelValue', ['B'])
  wrapper.findComponent(PickerStub).vm.$emit('select', [b])
  await wrapper.get('[data-cancel]').trigger('click')
  expect(wrapper.emitted('save')).toBeUndefined()
  expect(node.data.approvers).toEqual([a])
  expect(close).toHaveBeenCalledOnce()
  await wrapper.setProps({ show: false })
  await wrapper.setProps({ show: true })
  expect(wrapper.get('[data-picker]').text()).toBe('A')
  wrapper.unmount()
})

test.each([
  'cancel',
  'replacement',
  'scope',
  'filter',
  'readonly',
  'unmount',
] as const)('pending outer save cannot commit after %s', async reason => {
  let release!: (value: boolean) => void
  validate = () =>
    new Promise<boolean>(resolve => {
      release = resolve
    })
  const source: WorkflowPeopleOptions['source'] = {
    rowKey: 'id',
    label: row => row.name,
    request: async () => ({ rows: [a, b], total: 2 }),
  }
  const people = { source, scope: 'company-A' }
  const wrapper = mountConfig(approval(), people)
  await wrapper.get('[data-save]').trigger('click')
  if (reason === 'cancel') await wrapper.get('[data-cancel]').trigger('click')
  if (reason === 'replacement')
    await wrapper.setProps({ currentNode: approval([a]) })
  if (reason === 'scope')
    await wrapper.setProps({ people: { source, scope: 'company-B' } })
  if (reason === 'filter')
    await wrapper.setProps({
      people: {
        source,
        scope: 'company-A',
        fixedFilters: { departmentId: 'different' },
      },
    })
  if (reason === 'readonly') await wrapper.setProps({ readonly: true })
  if (reason === 'unmount') wrapper.unmount()
  release(true)
  await flushPromises()
  expect(wrapper.emitted('save')).toBeUndefined()
  if (reason !== 'unmount') wrapper.unmount()
})

test('empty copy is valid and failed confirmation leaves the workflow untouched', async () => {
  const node: WorkflowNode<'copy'> = {
    id: 'copy',
    type: 'copy',
    position: { x: 0, y: 0 },
    data: { title: '抄送', copyUsers: [a] },
  }
  const wrapper = mountConfig(node)
  draft = { values: [], rows: [] }
  validate = async () => false
  await wrapper.get('[data-save]').trigger('click')
  await flushPromises()
  expect(wrapper.emitted('save')).toBeUndefined()
  validate = async () => true
  await wrapper.get('[data-save]').trigger('click')
  await flushPromises()
  expect(wrapper.emitted('save')?.[0]).toEqual([{ copyUsers: [] }])
  expect(node.data.copyUsers).toEqual([a])
  wrapper.unmount()
})

test('typed condition fields share save validation and keep the string value contract', async () => {
  const node: WorkflowNode<'condition'> = {
    id: 'condition',
    type: 'condition',
    position: { x: 0, y: 0 },
    data: {
      title: '金额',
      conditions: [
        {
          id: 'c',
          name: '大额',
          field: 'amount',
          operator: 'greater_than',
          value: 'invalid',
          targetNodeId: 'approval',
        },
      ],
    },
  }
  const wrapper = mountConfig(node)
  await wrapper.setProps({
    conditionFields: [{ key: 'amount', label: '申请金额', type: 'number' }],
  })
  await wrapper.get('[data-save]').trigger('click')
  await flushPromises()
  expect(wrapper.emitted('save')).toBeUndefined()
  wrapper.findAllComponents(NInputNumber)[0].vm.$emit('update:value', 42)
  await wrapper.get('[data-save]').trigger('click')
  await flushPromises()
  expect(wrapper.emitted('save')?.[0]).toEqual([
    {
      conditions: [
        {
          id: 'c',
          name: '大额',
          field: 'amount',
          operator: 'greater_than',
          value: '42',
          targetNodeId: 'approval',
        },
      ],
    },
  ])
  expect(node.data.conditions?.[0].value).toBe('invalid')
  wrapper.unmount()
})

test('a changed row policy is checked again immediately before workflow config commit', async () => {
  let release!: (value: boolean) => void
  let allowed = true
  validate = () =>
    new Promise<boolean>(resolve => {
      release = resolve
    })
  const people: WorkflowPeopleOptions = {
    source: {
      rowKey: 'id',
      label: user => user.name,
      request: async () => ({ rows: [a, b], total: 2 }),
    },
    rowCheckable: () => allowed,
  }
  const wrapper = mountConfig(approval(), people)
  await wrapper.get('[data-save]').trigger('click')
  allowed = false
  release(true)
  await flushPromises()
  expect(wrapper.emitted('save')).toBeUndefined()
  wrapper.unmount()
})

test('switching an open condition editor to readonly disables default-branch changes and save', async () => {
  const node: WorkflowNode<'condition'> = {
    id: 'condition',
    type: 'condition',
    position: { x: 0, y: 0 },
    data: {
      title: '分支',
      conditions: [
        {
          id: 'default',
          name: '默认',
          field: '',
          operator: 'equals',
          value: '',
          isDefault: true,
        },
      ],
    },
  }
  const wrapper = mountConfig(node)
  expect(wrapper.getComponent(NCheckbox).props('disabled')).toBe(false)
  await wrapper.setProps({ readonly: true })
  expect(wrapper.getComponent(NCheckbox).props('disabled')).toBe(true)
  await wrapper.get('[data-save]').trigger('click')
  await flushPromises()
  expect(wrapper.emitted('save')).toBeUndefined()
  expect(node.data.conditions?.[0].isDefault).toBe(true)
  wrapper.unmount()
})

test('clearing optional branch controls restores undefined instead of persisting Naive null values', async () => {
  const node: WorkflowNode<'condition'> = {
    id: 'condition',
    type: 'condition',
    position: { x: 0, y: 0 },
    data: {
      title: '分支',
      conditions: [
        {
          id: 'c',
          name: '金额',
          field: 'amount',
          operator: 'greater_than',
          value: '100',
          targetNodeId: 'approval',
          priority: 0,
        },
      ],
    },
  }
  const wrapper = mountConfig(node)
  wrapper
    .findAllComponents(NSelect)
    .find(select => select.attributes('aria-label') === '条件目标节点')!
    .vm.$emit('update:value', null)
  wrapper.getComponent(NInputNumber).vm.$emit('update:value', null)
  await wrapper.get('[data-save]').trigger('click')
  await flushPromises()
  expect(wrapper.emitted('save')?.[0]).toEqual([
    {
      conditions: [
        {
          id: 'c',
          name: '金额',
          field: 'amount',
          operator: 'greater_than',
          value: '100',
          targetNodeId: undefined,
          priority: undefined,
        },
      ],
    },
  ])
  expect(node.data.conditions?.[0]).toMatchObject({
    targetNodeId: 'approval',
    priority: 0,
  })
  wrapper.unmount()
})
