import { flushPromises, mount } from '@vue/test-utils'
import { expect, test, vi } from 'vitest'
import C_ApprovalViewer from '../../src/components/C_ApprovalViewer/index.vue'
import type {
  ApprovalInstanceDetail,
  ApprovalInstanceSummary,
  ApprovalViewerSource,
} from '../../src/components/C_ApprovalViewer'

const first: ApprovalInstanceDetail = {
  id: 'attempt-1',
  label: '首次提交',
  status: 'rejected',
  startedAt: 1000,
  history: [
    {
      id: 'rejected',
      title: '驳回',
      occurredAt: 1500,
      comment: '<b>金额待核对</b>',
    },
    { id: 'submitted', title: '提交审批', occurredAt: 1000 },
  ],
}
const second: ApprovalInstanceDetail = {
  id: 'attempt-2',
  label: '第二次提交',
  status: 'running',
  startedAt: 2000,
  currentHandler: '财务复核',
  history: [],
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => {
    resolve = done
  })
  return { promise, resolve }
}

function mountViewer(
  source: ApprovalViewerSource,
  show = true,
  instanceId?: string
) {
  return mount(C_ApprovalViewer, {
    props: { show, businessKey: 'order-A', source, instanceId },
    slots: { diagram: ({ instance }) => `历史图 ${instance.id}` },
    global: { stubs: { teleport: true } },
  })
}

test('requests only when opened, defaults to the newest attempt and keeps rejected history reachable', async () => {
  const list = Object.freeze([first, second])
  const source = {
    listInstances: vi
      .fn<ApprovalViewerSource['listInstances']>()
      .mockResolvedValue(list),
    getInstance: vi
      .fn<ApprovalViewerSource['getInstance']>()
      .mockImplementation(async id => (id === first.id ? first : second)),
  }
  const wrapper = mountViewer(source, false)
  expect(source.listInstances).not.toHaveBeenCalled()
  await wrapper.setProps({ show: true })
  await flushPromises()

  expect(wrapper.get('select').element.value).toBe(second.id)
  expect(wrapper.text()).toContain('财务复核')
  expect(wrapper.text()).not.toContain('历史图')
  const diagram = wrapper
    .findAll('button')
    .find(button => button.text() === '流程图')!
  await diagram.trigger('click')
  expect(wrapper.text()).toContain(`历史图 ${second.id}`)
  await wrapper.get('select').setValue(first.id)
  await flushPromises()
  expect(wrapper.text()).not.toContain('历史图')
  expect(wrapper.get('.c-approval-viewer__comment').text()).toBe(
    '<b>金额待核对</b>'
  )
  expect(wrapper.find('.c-approval-viewer__comment b').exists()).toBe(false)
  expect(wrapper.text().indexOf('提交审批')).toBeLessThan(
    wrapper.text().indexOf('金额待核对')
  )
  expect(list[0]).toBe(first)
  wrapper.unmount()
})

test('ignores a late list for the old document even when the source does not handle cancellation', async () => {
  const slow = deferred<readonly ApprovalInstanceSummary[]>()
  const source = {
    listInstances: vi
      .fn<ApprovalViewerSource['listInstances']>()
      .mockImplementation(key =>
        key === 'order-A' ? slow.promise : Promise.resolve([second])
      ),
    getInstance: vi
      .fn<ApprovalViewerSource['getInstance']>()
      .mockResolvedValue(second),
  }
  const wrapper = mountViewer(source)
  const originalSignal = source.listInstances.mock.calls[0]?.[1]
  await wrapper.setProps({ businessKey: 'order-B' })
  await flushPromises()
  expect(originalSignal?.aborted).toBe(true)
  slow.resolve([first])
  await flushPromises()
  expect(wrapper.get('select').element.value).toBe(second.id)
  expect(wrapper.text()).not.toContain('首次提交')
  expect(source.getInstance.mock.calls.map(([id]) => id)).toEqual([second.id])
  wrapper.unmount()
})

test('cancels a previous detail for an instance switch and cancels pending requests on close', async () => {
  const slow = deferred<ApprovalInstanceDetail>()
  const closing = deferred<ApprovalInstanceDetail>()
  const source = {
    listInstances: vi
      .fn<ApprovalViewerSource['listInstances']>()
      .mockResolvedValue([first, second]),
    getInstance: vi
      .fn<ApprovalViewerSource['getInstance']>()
      .mockImplementationOnce(() => slow.promise)
      .mockResolvedValueOnce(first)
      .mockImplementationOnce(() => closing.promise),
  }
  const wrapper = mountViewer(source)
  await flushPromises()
  await wrapper.get('select').setValue(first.id)
  await flushPromises()
  expect(source.getInstance.mock.calls[0]?.[1].aborted).toBe(true)
  slow.resolve(second)
  await flushPromises()
  expect(wrapper.text()).toContain('金额待核对')
  expect(wrapper.text()).not.toContain('财务复核')
  await wrapper.get('select').setValue(second.id)
  await wrapper.setProps({ show: false })
  expect(source.getInstance.mock.calls[2]?.[1].aborted).toBe(true)
  closing.resolve(second)
  await flushPromises()
  expect(wrapper.text()).not.toContain('财务复核')
  wrapper.unmount()
})

test('a direct instance remains usable when history lookup fails and history can retry independently', async () => {
  const source = {
    listInstances: vi
      .fn<ApprovalViewerSource['listInstances']>()
      .mockRejectedValueOnce(new Error('unavailable'))
      .mockResolvedValueOnce([first, second]),
    getInstance: vi
      .fn<ApprovalViewerSource['getInstance']>()
      .mockResolvedValue(first),
  }
  const wrapper = mountViewer(source, true, first.id)
  await flushPromises()
  expect(wrapper.get('[role="alert"]').text()).toContain('历次审批加载失败')
  expect(wrapper.text()).toContain('金额待核对')
  await wrapper.get('[role="alert"] button').trigger('click')
  await flushPromises()
  expect(wrapper.get('select').element.value).toBe(first.id)
  expect(source.getInstance).toHaveBeenCalledTimes(1)
  wrapper.unmount()
})

test('blocks a detail carrying the wrong instance ID and supports explicit detail retry', async () => {
  const source = {
    listInstances: vi
      .fn<ApprovalViewerSource['listInstances']>()
      .mockResolvedValue([second]),
    getInstance: vi
      .fn<ApprovalViewerSource['getInstance']>()
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce(second),
  }
  const wrapper = mountViewer(source)
  await flushPromises()
  expect(wrapper.get('[role="alert"]').text()).toContain('审批详情加载失败')
  expect(wrapper.text()).not.toContain('金额待核对')
  await wrapper.get('[role="alert"] button').trigger('click')
  await flushPromises()
  expect(wrapper.text()).toContain('财务复核')
  wrapper.unmount()
})

test('batches changes to the business key, source and direct instance without reading a previous ID', async () => {
  const slow = deferred<ApprovalInstanceDetail>()
  const initial = {
    listInstances: vi
      .fn<ApprovalViewerSource['listInstances']>()
      .mockResolvedValue([first]),
    getInstance: vi
      .fn<ApprovalViewerSource['getInstance']>()
      .mockReturnValue(slow.promise),
  }
  const next = {
    listInstances: vi
      .fn<ApprovalViewerSource['listInstances']>()
      .mockResolvedValue([second]),
    getInstance: vi
      .fn<ApprovalViewerSource['getInstance']>()
      .mockResolvedValue(second),
  }
  const wrapper = mountViewer(initial, true, first.id)
  await wrapper.setProps({
    businessKey: 'order-B',
    instanceId: second.id,
    source: next,
  })
  slow.resolve(first)
  await flushPromises()
  expect(initial.getInstance.mock.calls[0]?.[1].aborted).toBe(true)
  expect(next.listInstances.mock.calls.map(([key]) => key)).toEqual(['order-B'])
  expect(next.getInstance.mock.calls.map(([id]) => id)).toEqual([second.id])
  expect(wrapper.text()).toContain('财务复核')
  expect(wrapper.text()).not.toContain('首次提交')
  wrapper.unmount()
})

test('retains the direct entry when switching away from an attempt absent from the list', async () => {
  const source = {
    listInstances: vi
      .fn<ApprovalViewerSource['listInstances']>()
      .mockResolvedValue([second]),
    getInstance: vi
      .fn<ApprovalViewerSource['getInstance']>()
      .mockImplementation(async id => (id === first.id ? first : second)),
  }
  const wrapper = mountViewer(source, true, first.id)
  await flushPromises()
  const selector = wrapper.get('select')
  expect(selector.element.value).toBe(first.id)
  await selector.setValue(second.id)
  await flushPromises()
  expect(wrapper.text()).toContain('财务复核')
  await selector.setValue(first.id)
  await flushPromises()
  expect(wrapper.text()).toContain('金额待核对')
  wrapper.unmount()
})
