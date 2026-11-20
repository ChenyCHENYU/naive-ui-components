import { mount } from '@vue/test-utils'
import { NDropdown } from 'naive-ui'
import { expect, test } from 'vitest'
import C_Draggable from '../../src/components/C_Draggable/index.vue'
import {
  C_TaskBoard,
  type TaskBoardColumn,
  type TaskBoardTask,
} from '../../src/components/C_TaskBoard'

interface WorkOrder extends TaskBoardTask {
  status: 'waiting' | 'processing' | 'closed'
  metadata?: { circular?: WorkOrder }
}

const task: WorkOrder = {
  key: 0,
  title: 'Plan order',
  status: 'waiting',
  lane: 'shift-a',
}
const other: WorkOrder = {
  key: 'other',
  title: 'Check sample',
  status: 'processing',
  lane: 'shift-a',
}
const columns: TaskBoardColumn<WorkOrder['status']>[] = [
  { key: 'waiting', label: 'Waiting' },
  { key: 'processing', label: 'Processing' },
  { key: 'closed', label: 'Closed', disabled: true },
]
const lanes = [
  { key: 'shift-a', label: 'Shift A' },
  { key: 'shift-b', label: 'Shift B' },
]

test('requests keyboard-accessible moves while the rendered board waits for a host update', async () => {
  const wrapper = mount(C_TaskBoard<WorkOrder>, {
    props: {
      tasks: [task, other],
      columns,
      lanes,
      locale: { locale: 'en-US' },
    },
  })
  const menu = wrapper.getComponent(NDropdown)
  expect(menu.props('options')).toEqual([
    { key: 'processing', label: 'Processing' },
  ])
  expect(wrapper.get('button[aria-label="Move task Plan order"]').text()).toBe(
    'Move'
  )
  menu.vm.$emit('select', 'processing')
  await wrapper.vm.$nextTick()
  expect(wrapper.emitted('move-request')).toEqual([
    [
      {
        task,
        from: { status: 'waiting', lane: 'shift-a', index: 0 },
        to: { status: 'processing', lane: 'shift-a', index: 1 },
        source: 'menu',
      },
    ],
  ])
  expect(wrapper.get('section[aria-label="Waiting"]').text()).toContain(
    'Plan order'
  )
  await wrapper.setProps({ tasks: [{ ...task, status: 'processing' }, other] })
  expect(wrapper.get('section[aria-label="Waiting"]').text()).not.toContain(
    'Plan order'
  )
  expect(wrapper.get('section[aria-label="Processing"]').text()).toContain(
    'Plan order'
  )
  expect(task.status).toBe('waiting')
  wrapper.unmount()
})

test('uses shared drag lists without serializing domain records and rejects off-lane or pending moves', async () => {
  const circular: WorkOrder = { ...task, metadata: {} }
  circular.metadata!.circular = circular
  const wrapper = mount(C_TaskBoard<WorkOrder>, {
    props: {
      tasks: [circular, other],
      columns,
      lanes,
      draggable: true,
      canMove: move => move.source !== 'drag',
      locale: { locale: 'en-US' },
    },
  })
  const DragList = C_Draggable<{ key: TaskBoardTask['key'] }>
  const lists = wrapper.findAllComponents(DragList)
  expect(lists[0].vm.$.props.group).toBe(lists[1].vm.$.props.group)
  expect(lists[0].vm.$.props.group).not.toBe(lists[3].vm.$.props.group)
  expect(JSON.stringify(lists[0].vm.$.props.modelValue)).toBe('[{"key":0}]')
  lists[4].vm.$emit('item-add', { key: 0 }, 0)
  expect(wrapper.emitted('move-request')).toBeUndefined()
  lists[1].vm.$emit('item-add', { key: 0 }, 0)
  await wrapper.vm.$nextTick()
  expect(wrapper.get('[role="status"]').text()).toBe(
    'The task cannot be moved to that status'
  )
  expect(wrapper.get('section[aria-label="Waiting"]').text()).toContain(
    'Plan order'
  )
  expect(wrapper.emitted('move-request')).toBeUndefined()
  await wrapper.setProps({ canMove: undefined, pendingKeys: [0] })
  lists[1].vm.$emit('item-add', { key: 0 }, 0)
  expect(wrapper.emitted('move-request')).toBeUndefined()
  await wrapper.setProps({ pendingKeys: [] })
  lists[1].vm.$emit('item-add', { key: 0 }, 0)
  expect(wrapper.emitted('move-request')?.[0][0]).toMatchObject({
    task: circular,
    to: { status: 'processing', lane: 'shift-a', index: 0 },
    source: 'drag',
  })
  wrapper.unmount()
})

test('retains tasks from an unconfigured lane in the unassigned group', () => {
  const wrapper = mount(C_TaskBoard<WorkOrder>, {
    props: {
      tasks: [{ ...task, lane: 'old-shift' }],
      columns,
      lanes,
      locale: { locale: 'en-US' },
    },
  })
  expect(wrapper.get('section[aria-label="Unassigned"]').text()).toContain(
    'Plan order'
  )
  const sibling = mount(C_TaskBoard<WorkOrder>, {
    props: { tasks: [task], columns, lanes },
  })
  const DragList = C_Draggable<{ key: TaskBoardTask['key'] }>
  expect(wrapper.getComponent(DragList).vm.$.props.group).not.toBe(
    sibling.getComponent(DragList).vm.$.props.group
  )
  sibling.unmount()
  wrapper.unmount()
})
