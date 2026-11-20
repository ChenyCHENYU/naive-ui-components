import { mount } from '@vue/test-utils'
import { expect, test } from 'vitest'
import C_NotificationInbox from '../../src/components/C_NotificationInbox/index.vue'
import type { NotificationMessage } from '../../src/components/C_NotificationCenter/types'
import { COMPONENT_LOCALE_KEY } from '../../src/context'

interface Task extends NotificationMessage {
  taskStatus: 'todo' | 'done'
}
const task: Task = {
  id: 'quality-01',
  title: '核对质量异常',
  summary: '待班组确认',
  priority: 'normal',
  category: 'business',
  status: 'unread',
  taskStatus: 'todo',
  timestamp: '2026-10-10T07:00:00Z',
}
type View = 'todo' | 'done' | 'archived'
type Action = 'complete'
const views = [
  { key: 'todo', label: '待办', count: 25 },
  { key: 'done', label: '已办' },
  { key: 'archived', label: '归档', disabled: true },
] as const

test('keeps views, active row, numbering and actions controlled by the host', async () => {
  const wrapper = mount(C_NotificationInbox<Task, View, Action>, {
    props: {
      views,
      activeView: 'todo',
      items: [task],
      startIndex: 20,
      selectedId: task.id,
      actions: item =>
        item.taskStatus === 'todo' ? [{ key: 'complete', label: '完成' }] : [],
      badges: item => [
        {
          label: item.taskStatus === 'todo' ? '待处理' : '已处理',
          type: 'warning',
        },
      ],
    },
    slots: { footer: '<span>应用分页</span>' },
  })
  const [todo, done, archived] = wrapper.findAll(
    '.c-notification-inbox__views button'
  )
  expect(todo.attributes('aria-pressed')).toBe('true')
  expect(todo.text()).toContain('25')
  await archived.trigger('click')
  expect(wrapper.emitted('update:activeView')).toBeUndefined()
  await done.trigger('click')
  expect(wrapper.emitted('update:activeView')).toEqual([['done']])
  expect(todo.attributes('aria-pressed')).toBe('true')
  expect(wrapper.get('ol').attributes('start')).toBe('21')
  expect(wrapper.get('.c-notification-inbox__index').text()).toBe('21')
  expect(
    wrapper.get('.c-notification-inbox__row').attributes('aria-current')
  ).toBe('true')
  expect(wrapper.get('.c-notification-inbox__row').text()).toContain('待处理')
  expect(wrapper.get('.c-notification-inbox__footer').text()).toBe('应用分页')
  await wrapper.get('.notification-item__body').trigger('click')
  expect(wrapper.emitted('select')).toEqual([[task]])
  await wrapper.get('.notification-item__actions button').trigger('click')
  expect(wrapper.emitted('action')).toEqual([['complete', task]])
  expect(wrapper.emitted('select')).toHaveLength(1)
})

test('pending and replaced records cannot submit an action from an old row', async () => {
  const wrapper = mount(C_NotificationInbox<Task, View, Action>, {
    props: {
      views,
      activeView: 'todo',
      items: [task],
      pendingIds: [task.id],
      actions: () => [{ key: 'complete', label: '完成' }],
    },
  })
  const button = wrapper.get('.notification-item__actions button')
  expect(button.attributes('disabled')).toBeDefined()
  await button.trigger('click')
  expect(wrapper.emitted('action')).toBeUndefined()
  await wrapper.setProps({ pendingIds: [] })
  const staleButton = wrapper.get('.notification-item__actions button').element
  await wrapper.setProps({ items: [] })
  staleButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  expect(wrapper.emitted('action')).toBeUndefined()
  expect(wrapper.text()).toContain('暂无消息')
  await wrapper.setProps({ loading: true })
  expect(wrapper.get('[role="status"]').text()).toBe('加载中...')
  await wrapper.setProps({ error: '读取失败', loading: false })
  await wrapper.get('[role="alert"] button').trigger('click')
  expect(wrapper.emitted('retry')).toHaveLength(1)
})

test('instance translations reach the inbox and the shared notification row', async () => {
  const wrapper = mount(C_NotificationInbox<Task, View, Action>, {
    props: {
      views,
      activeView: 'todo',
      items: [{ ...task, priority: 'urgent' }],
      locale: {
        messages: {
          'inbox.views': 'Work queue',
          'notification.urgent': 'Needs attention',
        },
      },
    },
    global: {
      provide: {
        [COMPONENT_LOCALE_KEY as symbol]: { locale: 'en-US' },
      },
    },
  })
  expect(wrapper.get('[role="group"]').attributes('aria-label')).toBe(
    'Work queue'
  )
  expect(wrapper.text()).toContain('Needs attention')
  await wrapper.setProps({ locale: undefined })
  expect(wrapper.get('[role="group"]').attributes('aria-label')).toBe(
    'Inbox views'
  )
  expect(wrapper.text()).toContain('Urgent')
})
