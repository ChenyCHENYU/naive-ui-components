import { afterEach, describe, expect, test, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { effectScope } from 'vue'
import {
  NPopover,
  NTooltip,
  NButton,
  NScrollbar,
  NSkeleton,
  NSpin,
  NTag,
  NAvatar,
} from 'naive-ui'
import C_NotificationCenter from '../../src/components/C_NotificationCenter/index.vue'
import { useNotificationCore } from '../../src/components/C_NotificationCenter/composables/useNotificationCore'
import type {
  NotificationMessage,
  NotificationCenterProps,
  NotificationCenterExpose,
} from '../../src/components/C_NotificationCenter/types'

const components = {
  NPopover,
  NTooltip,
  NButton,
  NScrollbar,
  NSkeleton,
  NSpin,
  NTag,
  NAvatar,
}
const scopes: ReturnType<typeof effectScope>[] = []
afterEach(() => {
  for (const scope of scopes.splice(0)) scope.stop()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})
function message(id: string): NotificationMessage {
  return {
    id,
    title: id,
    summary: '测试通知',
    category: 'system',
    priority: 'normal',
    status: 'unread',
    timestamp: '2026-10-18T00:00:00Z',
  }
}
function createCore(props: NotificationCenterProps = {}) {
  const scope = effectScope()
  scopes.push(scope)
  return scope.run(() =>
    useNotificationCore({ autoStart: false, pollingInterval: 0, ...props })
  )!
}
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
function mountCenter(props: NotificationCenterProps) {
  return mount(C_NotificationCenter, {
    props,
    attachTo: document.body,
    global: { components },
  })
}
class FakeSocket extends EventTarget {
  static OPEN = 1
  static instances: FakeSocket[] = []
  readyState = 0
  send = vi.fn()
  constructor(public url: string) {
    super()
    FakeSocket.instances.push(this)
  }
  open() {
    this.readyState = 1
    this.dispatchEvent(new Event('open'))
  }
  close() {
    if (this.readyState === 3) return
    this.readyState = 3
    this.dispatchEvent(new Event('close'))
  }
  push(data: unknown) {
    this.dispatchEvent(
      new MessageEvent('message', { data: JSON.stringify(data) })
    )
  }
}
function fakeSockets() {
  FakeSocket.instances = []
  vi.stubGlobal('WebSocket', FakeSocket)
}

describe('通知共享控制器与真实交互', () => {
  test('两个外部控制器消费者共享统计，不会自建查询、轮询和连接，卸载不销毁数据源', async () => {
    fakeSockets()
    const core = createCore({
      fetchNotifications: async () => ({
        list: [message('共享通知')],
        total: 80,
        unreadCount: 78,
        unreadByCategory: { system: 78 },
      }),
      markAsRead: async () => undefined,
    })
    await core.fetchMessages(true)
    const unexpectedFetch = vi.fn(async () => {
      throw new Error('不应调用内部请求')
    })
    const props = {
      controller: core,
      fetchNotifications: unexpectedFetch,
      wsConfig: { url: 'wss://unused' },
      pollingInterval: 1,
    }
    const first = mountCenter(props)
    const second = mountCenter(props)
    await flushPromises()
    expect(
      first.get('button.notification-badge__trigger').attributes('aria-label')
    ).toContain('78')
    expect(second.text()).toContain('78')
    expect(unexpectedFetch).not.toHaveBeenCalled()
    expect(FakeSocket.instances).toHaveLength(0)
    first.unmount()
    await core.markAsRead(['共享通知'])
    await flushPromises()
    expect(second.text()).toContain('77')
    expect(
      (second.vm as unknown as NotificationCenterExpose).getUnreadCount()
    ).toBe(77)
  })

  test('错误可见且重试执行失败命令，忙状态阻止重复操作，只在成功后发 read 事件', async () => {
    const failed = deferred<void>()
    const markAsRead = vi
      .fn()
      .mockImplementationOnce(() => failed.promise)
      .mockResolvedValue(undefined)
    const wrapper = mountCenter({
      fetchNotifications: async () => ({
        list: [message('待确认'), message('第二条')],
        total: 2,
        unreadCount: 2,
      }),
      markAsRead,
      pollingInterval: 0,
    })
    await flushPromises()
    expect(
      (wrapper.vm as unknown as NotificationCenterExpose).getMessages()
    ).toHaveLength(2)
    await wrapper.get('button.notification-badge__trigger').trigger('click')
    await vi.waitFor(() =>
      expect(
        document.querySelectorAll('button[aria-label="标记已读"]')
      ).toHaveLength(2)
    )
    ;(
      document.querySelector(
        'button[aria-label="标记已读"]'
      ) as HTMLButtonElement
    ).click()
    await flushPromises()
    expect(
      (
        document.querySelector(
          'button[aria-label="删除消息"]'
        ) as HTMLButtonElement
      ).disabled
    ).toBe(true)
    expect(wrapper.emitted('read')).toBeUndefined()
    failed.reject(new Error('服务暂不可用'))
    await flushPromises()
    await vi.waitFor(() =>
      expect(document.querySelector('[role="alert"]')?.textContent).toContain(
        '服务暂不可用'
      )
    )
    const retry = [...document.querySelectorAll('button')].find(button =>
      button.textContent?.includes('重试')
    )!
    retry.click()
    await flushPromises()
    expect(markAsRead).toHaveBeenCalledTimes(2)
    expect(
      (wrapper.vm as unknown as NotificationCenterExpose).getUnreadCount()
    ).toBe(1)
    expect(document.querySelector('[role="alert"]')).toBeNull()
    // 重试从控制器执行命令，不伪造首次失败的组件完成事件。
    expect(wrapper.emitted('read')).toBeUndefined()
  })

  test('查看全部只发业务无关事件并关闭弹层', async () => {
    const wrapper = mountCenter({ pollingInterval: 0 })
    await wrapper.get('button.notification-badge__trigger').trigger('click')
    await vi.waitFor(() =>
      expect(
        document.querySelector('.c-notification-center__footer')
      ).not.toBeNull()
    )
    const button = document.querySelector(
      '.c-notification-center__footer button'
    ) as HTMLButtonElement
    button.click()
    await flushPromises()
    expect(wrapper.emitted('viewAll')).toHaveLength(1)
  })
})

describe('通知推送与连接恢复', () => {
  test('权威 count_update、畸形事件过滤和删除回滚保留新推送', async () => {
    fakeSockets()
    const deletion = deferred<void>()
    const core = createCore({
      fetchNotifications: async () => ({
        list: [message('a')],
        total: 1,
        unreadCount: 78,
      }),
      deleteNotification: () => deletion.promise,
    })
    await core.fetchMessages(true)
    core.connectWS({ url: 'wss://notifications', heartbeatInterval: 0 })
    const socket = FakeSocket.instances[0]
    socket.open()
    socket.push({
      type: 'count_update',
      data: { unreadCount: 90, unreadByCategory: { system: 80, business: 10 } },
    })
    expect(core.unreadCount.value).toBe(90)
    expect(core.unreadByCategory.value).toEqual({ system: 80, business: 10 })
    socket.push({ type: 'count_update', data: { unreadCount: -1 } })
    socket.push({ type: 'new_message', data: { id: 'invalid' } })
    expect(core.unreadCount.value).toBe(90)
    const pending = core.deleteMessages(['a']).catch(error => error)
    socket.push({ type: 'new_message', data: message('b') })
    socket.push({ type: 'new_message', data: message('b') })
    deletion.reject(new Error('删除失败'))
    await pending
    expect(core.messages.value.map(row => row.id)).toEqual(['b', 'a'])
    expect(core.unreadCount.value).toBe(91)
    expect(core.total.value).toBe(2)
  })

  test('刷新期间的推送不会被旧查询覆盖', async () => {
    fakeSockets()
    const refresh = deferred<{
      list: NotificationMessage[]
      total: number
      unreadCount: number
    }>()
    let calls = 0
    const core = createCore({
      fetchNotifications: () =>
        ++calls === 1
          ? Promise.resolve({ list: [message('a')], total: 1, unreadCount: 1 })
          : refresh.promise,
    })
    await core.fetchMessages(true)
    core.connectWS({ url: 'wss://notifications', heartbeatInterval: 0 })
    FakeSocket.instances[0].open()
    const request = core.fetchMessages(true)
    FakeSocket.instances[0].push({ type: 'new_message', data: message('b') })
    refresh.resolve({ list: [message('a')], total: 1, unreadCount: 1 })
    await request
    expect(core.messages.value.map(row => row.id)).toEqual(['b', 'a'])
    expect(core.unreadCount.value).toBe(2)
  })

  test('pending 已读之后的计数推送保持权威，不被重复扣减', async () => {
    fakeSockets()
    const mark = deferred<void>()
    const core = createCore({
      fetchNotifications: async () => ({
        list: [message('a')],
        total: 1,
        unreadCount: 78,
      }),
      markAsRead: () => mark.promise,
    })
    await core.fetchMessages(true)
    core.connectWS({ url: 'wss://notifications', heartbeatInterval: 0 })
    FakeSocket.instances[0].open()
    const request = core.markAsRead(['a'])
    expect(core.unreadCount.value).toBe(77)
    FakeSocket.instances[0].push({
      type: 'count_update',
      data: { unreadCount: 77 },
    })
    expect(core.unreadCount.value).toBe(77)
    mark.resolve()
    await request
    expect(core.unreadCount.value).toBe(77)
    expect(core.messages.value[0].status).toBe('read')
  })

  test('断线重连后重新拉取并校准统计，停止作用域会清理重连/心跳且忽略旧连接事件', async () => {
    vi.useFakeTimers()
    fakeSockets()
    const fetchNotifications = vi.fn(async () => ({
      list: [message('a')],
      total: 1,
      unreadCount: 78,
    }))
    const core = createCore({ fetchNotifications })
    await core.fetchMessages(true)
    core.connectWS({
      url: 'wss://notifications',
      reconnectInterval: 10,
      heartbeatInterval: 0,
    })
    const first = FakeSocket.instances[0]
    first.open()
    first.close()
    await vi.advanceTimersByTimeAsync(10)
    const second = FakeSocket.instances[1]
    second.open()
    await Promise.resolve()
    expect(fetchNotifications).toHaveBeenCalledTimes(2)
    expect(core.unreadCount.value).toBe(78)
    core.dispose()
    second.push({ type: 'count_update', data: { unreadCount: 999 } })
    first.open()
    await vi.advanceTimersByTimeAsync(1_000)
    expect(FakeSocket.instances).toHaveLength(2)
    expect(core.wsStatus.value).toBe('disconnected')
    expect(core.unreadCount.value).toBe(78)
  })

  test('显式启用 pong 超时后，失活连接关闭重连；正常 pong 清理超时', async () => {
    vi.useFakeTimers()
    fakeSockets()
    const core = createCore()
    core.connectWS({
      url: 'wss://notifications',
      heartbeatInterval: 10,
      heartbeatTimeout: 5,
      reconnectInterval: 2,
    })
    const first = FakeSocket.instances[0]
    first.open()
    await vi.advanceTimersByTimeAsync(10)
    expect(first.send).toHaveBeenCalledWith('ping')
    first.dispatchEvent(new MessageEvent('message', { data: 'pong' }))
    await vi.advanceTimersByTimeAsync(5)
    expect(first.readyState).toBe(1)
    await vi.advanceTimersByTimeAsync(10)
    expect(first.readyState).toBe(3)
    await vi.advanceTimersByTimeAsync(2)
    expect(FakeSocket.instances).toHaveLength(2)
    core.dispose()
    expect(vi.getTimerCount()).toBe(0)
  })
})
