import { flushPromises, mount } from '@vue/test-utils'
import { expect, test, vi } from 'vitest'
import C_TaskPanel from '../../src/components/C_TaskPanel/index.vue'
import type { TaskPanelTask } from '../../src/components/C_TaskPanel'

test('distinguishes zero and unknown progress and never labels out-of-range input as valid', async () => {
  const tasks: TaskPanelTask[] = [
    { key: 1, title: '货位结果', status: 'running', progress: 0 },
    { key: 2, title: '订单列表', status: 'running' },
    { key: 3, title: '设备报表', status: 'running', progress: Infinity },
    { key: 4, title: '发运记录', status: 'queued' },
  ]
  const wrapper = mount(C_TaskPanel, { props: { tasks } })
  const progress = wrapper.findAll('[role="progressbar"]')
  expect(progress.map(item => item.attributes('aria-valuenow'))).toEqual([
    '0',
    undefined,
    undefined,
  ])
  expect(progress[1]?.attributes('aria-valuetext')).toBe('进度未知')
  expect(wrapper.get('[role="status"]').text()).toBe('4 项未结束 · 0 项已结束')
  await wrapper.setProps({ tasks: [{ ...tasks[0]!, progress: 74.5 }] })
  expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBe(
    '74.5'
  )
  expect(wrapper.text()).toContain('74.5%')
})

test('emits explicit host actions without mutating tasks and disables their pending buttons', async () => {
  const failed = Object.freeze({
    key: 'retry',
    title: '失败的导出',
    status: 'failed',
    retryable: true,
  } as const)
  const ready = Object.freeze({
    key: 'ready',
    title: '已完成的导出',
    status: 'success',
    downloadable: true,
    retryable: true,
  } as const)
  const wrapper = mount(C_TaskPanel, {
    props: { tasks: [failed, ready], pendingKeys: ['ready'] },
  })
  const download = wrapper
    .findAll('button')
    .find(button => button.text() === '下载')!
  const retries = wrapper
    .findAll('button')
    .filter(button => button.text() === '重试')
  expect(retries).toHaveLength(1)
  expect(download.attributes()).toHaveProperty('disabled')
  await download.trigger('click')
  expect(wrapper.emitted('download')).toBeUndefined()
  await retries[0]!.trigger('click')
  expect(wrapper.emitted('retry')).toEqual([[failed]])
  expect(failed.status).toBe('failed')
  await wrapper.setProps({ pendingKeys: [] })
  await download.trigger('click')
  expect(wrapper.emitted('download')).toEqual([[ready]])
})

test('opens results on demand, hides their retry column and resets when leaving the results page', async () => {
  const task: TaskPanelTask = {
    key: 1,
    title: '任务 A',
    status: 'failed',
    results: [
      {
        key: 'A-001',
        status: 'failure',
        message: '目标数据已变更',
        retryable: true,
      },
    ],
  }
  const wrapper = mount(C_TaskPanel, {
    props: {
      tasks: [task, { key: 2, title: '任务 B', status: 'success' }],
      pageSize: 1,
    },
  })
  expect(wrapper.find('.c-batch-result').exists()).toBe(false)
  const detail = wrapper.get('button[aria-expanded]')
  await detail.trigger('click')
  await vi.dynamicImportSettled()
  await flushPromises()
  const results = wrapper.get('.c-batch-result')
  expect(results.text()).toContain('目标数据已变更')
  expect(results.text()).not.toContain('可重试')
  expect(
    results.findAll('button').some(button => button.text().includes('重试'))
  ).toBe(false)

  await wrapper.get('nav button:last-child').trigger('click')
  expect(wrapper.text()).toContain('任务 B')
  await wrapper.setProps({ tasks: [task] })
  expect(wrapper.get('button[aria-expanded]').attributes('aria-expanded')).toBe(
    'false'
  )
  expect(wrapper.find('.c-batch-result').exists()).toBe(false)
})

test('keeps known tasks visible during an errored refresh and separates first load from empty state', async () => {
  const wrapper = mount(C_TaskPanel, {
    props: { tasks: [], loading: true, locale: { locale: 'en-US' } },
  })
  expect(wrapper.text()).toContain('Loading background tasks')
  expect(wrapper.text()).not.toContain('No background tasks')
  await wrapper.setProps({ loading: false })
  expect(wrapper.text()).toContain('No background tasks')
  await wrapper.setProps({
    error: 'Unable to refresh',
    tasks: [{ key: 1, title: 'Sales export', status: 'queued' }],
  })
  expect(wrapper.get('[role="alert"]').text()).toBe('Unable to refresh')
  expect(wrapper.text()).toContain('Sales export')
})
