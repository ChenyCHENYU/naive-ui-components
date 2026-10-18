import { afterEach, describe, expect, test } from 'bun:test'
import { effectScope, reactive, nextTick } from 'vue'
import { useNotificationCore } from '../src/components/C_NotificationCenter/composables/useNotificationCore'
import type {
  NotificationMessage,
  NotificationCenterProps,
  FetchNotificationsResult,
} from '../src/components/C_NotificationCenter/types'

const scopes: ReturnType<typeof effectScope>[] = []
afterEach(() => {
  for (const scope of scopes.splice(0)) scope.stop()
})
function createCore(props: NotificationCenterProps = {}) {
  const scope = effectScope()
  scopes.push(scope)
  return scope.run(() =>
    useNotificationCore({ pollingInterval: 0, autoStart: false, ...props })
  )!
}
function message(
  id: string,
  status: NotificationMessage['status'] = 'unread'
): NotificationMessage {
  return {
    id,
    status,
    title: id,
    summary: '消息',
    category: 'system',
    priority: 'normal',
    timestamp: '2026-10-18T00:00:00Z',
  }
}
function result(
  list: NotificationMessage[],
  unreadCount = list.filter(row => row.status === 'unread').length,
  total = list.length
): FetchNotificationsResult {
  return {
    list,
    total,
    unreadCount,
    unreadByCategory: { system: unreadCount, business: 0, alarm: 0 },
  }
}
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { resolve, reject, promise }
}

describe('通知企业数据协议与并发操作', () => {
  test('使用全局权威未读数，缺失分类统计保持未知，分页不会重复累加总数', async () => {
    const calls: number[] = []
    const core = createCore({
      fetchNotifications: async ({ page }) => {
        calls.push(page!)
        return {
          list: [message(page === 1 ? 'a' : 'b')],
          total: 2,
          unreadCount: 78,
        }
      },
    })
    await core.fetchMessages(true)
    expect(core.unreadCount.value).toBe(78)
    expect(core.messages.value).toHaveLength(1)
    expect(core.unreadByCategory.value.system).toBeUndefined()
    await core.loadMore()
    expect(calls).toEqual([1, 2])
    expect(core.unreadCount.value).toBe(78)
    expect(core.total.value).toBe(2)
    expect(core.hasMore.value).toBe(false)
  })

  test('旧已读失败不会覆盖较新的已读成功，统计只扣一次', async () => {
    const first = deferred<void>()
    const second = deferred<void>()
    let calls = 0
    const core = createCore({
      fetchNotifications: async () => result([message('a')]),
      markAsRead: () => (++calls === 1 ? first.promise : second.promise),
    })
    await core.fetchMessages(true)
    const a = core.markAsRead(['a']).catch(error => error)
    const b = core.markAsRead(['a'])
    expect(core.unreadCount.value).toBe(0)
    second.resolve()
    await b
    first.reject(new Error('旧请求失败'))
    await a
    expect(core.messages.value[0].status).toBe('read')
    expect(core.unreadCount.value).toBe(0)
    expect(core.busy.value).toBe(false)
  })

  test('并发已读全部失败会恢复初始状态，重试重放命令', async () => {
    const first = deferred<void>()
    const second = deferred<void>()
    let calls = 0
    const core = createCore({
      fetchNotifications: async () => result([message('a')]),
      markAsRead: () =>
        ++calls === 1
          ? first.promise
          : calls === 2
            ? second.promise
            : Promise.resolve(),
    })
    await core.fetchMessages(true)
    const a = core.markAsRead(['a']).catch(error => error)
    const b = core.markAsRead(['a']).catch(error => error)
    first.reject(new Error('失败 A'))
    await a
    expect(core.messages.value[0].status).toBe('read')
    second.reject(new Error('失败 B'))
    await b
    expect(core.messages.value[0].status).toBe('unread')
    expect(core.unreadCount.value).toBe(1)
    expect(core.error.value).toBe('失败 B')
    await core.retry!()
    expect(calls).toBe(3)
    expect(core.messages.value[0].status).toBe('read')
    expect(core.error.value).toBeNull()
  })

  test('删除失败仅撤销自身，保留刷新期间增加的数据和统计', async () => {
    const deletion = deferred<void>()
    let rows = [message('a')]
    const core = createCore({
      fetchNotifications: async () => result(rows),
      deleteNotification: () => deletion.promise,
    })
    await core.fetchMessages(true)
    const request = core.deleteMessages(['a']).catch(error => error)
    rows = [message('a'), message('b')]
    await core.fetchMessages(true)
    expect(core.messages.value.map(row => row.id)).toEqual(['b'])
    deletion.reject(new Error('删除失败'))
    await request
    expect(core.messages.value.map(row => row.id)).toEqual(['a', 'b'])
    expect(core.total.value).toBe(2)
    expect(core.unreadCount.value).toBe(2)
  })

  test('请求期间成功的删除/已读不会被迟到刷新复活', async () => {
    const stale = deferred<FetchNotificationsResult>()
    let calls = 0
    const core = createCore({
      fetchNotifications: () =>
        ++calls === 1
          ? Promise.resolve(result([message('a'), message('b')]))
          : stale.promise,
      deleteNotification: async () => undefined,
      markAsRead: async () => undefined,
    })
    await core.fetchMessages(true)
    const refresh = core.fetchMessages(true)
    await core.deleteMessages(['a'])
    await core.markAsRead(['b'])
    stale.resolve(result([message('a'), message('b')]))
    await refresh
    expect(core.messages.value.map(row => [row.id, row.status])).toEqual([
      ['b', 'read'],
    ])
    expect(core.total.value).toBe(1)
    expect(core.unreadCount.value).toBe(0)
  })

  test('远程缺失接口明确失败且不写入演示消息，查询失败后可以重试', async () => {
    const missing = createCore({ dataMode: 'remote' })
    await expect(missing.fetchMessages(true)).rejects.toThrow(
      'fetchNotifications'
    )
    expect(missing.messages.value).toEqual([])
    await expect(missing.markAsRead(['a'])).rejects.toThrow('mark-as-read')
    let fail = true
    const core = createCore({
      fetchNotifications: async () => {
        if (fail) throw new Error('网络失败')
        return result([message('a')])
      },
    })
    await expect(core.fetchMessages(true)).rejects.toThrow('网络失败')
    fail = false
    await core.retry!()
    expect(core.messages.value).toHaveLength(1)
    expect(core.error.value).toBeNull()
  })

  test('切换 storageKey 清理旧作用域，忽略旧请求的迟到失败', async () => {
    const request = deferred<void>()
    const props = reactive<NotificationCenterProps>({
      autoStart: false,
      pollingInterval: 0,
      storageKey: 'user-a',
      fetchNotifications: async () => result([message('a')]),
      markAsRead: () => request.promise,
    })
    const scope = effectScope()
    scopes.push(scope)
    const core = scope.run(() => useNotificationCore(props))!
    await core.fetchMessages(true)
    const pending = core.markAsRead(['a']).catch(error => error)
    props.storageKey = 'user-b'
    await nextTick()
    expect(core.messages.value).toEqual([])
    expect(core.unreadCount.value).toBe(0)
    expect(core.busy.value).toBe(false)
    request.reject(new Error('旧用户请求失败'))
    await pending
    expect(core.error.value).toBeNull()
    expect(core.messages.value).toEqual([])
  })

  test('跨页全部已读使用服务端统计，不只减当前已加载消息', async () => {
    const core = createCore({
      fetchNotifications: async () => result([message('a')], 78, 100),
      markAllRead: async () => undefined,
    })
    await core.fetchMessages(true)
    await core.markAllAsRead('system')
    expect(core.unreadCount.value).toBe(0)
    expect(core.unreadByCategory.value.system).toBe(0)
    expect(core.messages.value[0].status).toBe('read')
    expect(core.total.value).toBe(100)
  })

  test('pending 已读切换分类离开当前页后，成功仍正确扣全局统计，旧失败不覆盖新成功', async () => {
    const first = deferred<void>()
    const second = deferred<void>()
    let calls = 0
    const core = createCore({
      fetchNotifications: async ({ category }) =>
        category === 'business'
          ? result([{ ...message('b'), category: 'business' }], 78, 1)
          : result([message('a')], 78, 1),
      markAsRead: () => (++calls === 1 ? first.promise : second.promise),
    })
    await core.fetchMessages(true)
    const a = core.markAsRead(['a']).catch(error => error)
    core.switchCategory('business')
    await core.fetchMessages(true)
    const b = core.markAsRead(['a'])
    second.resolve()
    await b
    first.reject(new Error('迟到失败'))
    await a
    expect(core.messages.value.map(row => row.id)).toEqual(['b'])
    expect(core.unreadCount.value).toBe(77)
    expect(core.total.value).toBe(1)
  })

  test('分页失败保留当前页与数据，重试正确加载目标页并合并重复消息', async () => {
    let fail = true
    const pages: number[] = []
    const core = createCore({
      fetchNotifications: async ({ page }) => {
        pages.push(page!)
        if (page === 1) return result([message('a')], 4, 3)
        if (fail) throw new Error('分页超时')
        return result([message('a', 'read'), message('b'), message('c')], 3, 3)
      },
    })
    await core.fetchMessages(true)
    await expect(core.loadMore()).rejects.toThrow('分页超时')
    expect(core.page.value).toBe(1)
    expect(core.messages.value).toHaveLength(1)
    fail = false
    await core.retry!()
    expect(pages).toEqual([1, 2, 2])
    expect(core.page.value).toBe(2)
    expect(core.messages.value.map(row => row.id)).toEqual(['a', 'b', 'c'])
    expect(core.messages.value[0].status).toBe('read')
    expect(core.unreadCount.value).toBe(3)
  })

  test('pending 清空旧分类不能把新分类总数扣为零', async () => {
    const clear = deferred<void>()
    const core = createCore({
      fetchNotifications: async ({ category }) =>
        category === 'business'
          ? {
              ...result([{ ...message('b'), category: 'business' }], 100, 20),
              unreadByCategory: { system: 80, business: 20 },
            }
          : {
              ...result([message('a')], 100, 80),
              unreadByCategory: { system: 80, business: 20 },
            },
      clearNotifications: () => clear.promise,
    })
    core.switchCategory('system')
    await core.fetchMessages(true)
    const pending = core.clearMessages('system')
    core.switchCategory('business')
    await core.fetchMessages(true)
    expect(core.total.value).toBe(20)
    expect(core.hasMore.value).toBe(true)
    clear.resolve()
    await pending
    expect(core.total.value).toBe(20)
    expect(core.messages.value.map(row => row.id)).toEqual(['b'])
    expect(core.unreadCount.value).toBe(20)
  })

  test('新的权威查询缺失分类统计时恢复未知，不沿用旧数字', async () => {
    let includeCategories = true
    const core = createCore({
      fetchNotifications: async () => ({
        list: [message('a')],
        total: 100,
        unreadCount: 78,
        ...(includeCategories ? { unreadByCategory: { system: 78 } } : {}),
      }),
    })
    await core.fetchMessages(true)
    expect(core.unreadByCategory.value.system).toBe(78)
    includeCategories = false
    await core.fetchMessages(true)
    expect(core.unreadByCategory.value.system).toBeUndefined()
    expect(core.unreadCount.value).toBe(78)
  })

  test('demo 的已读、删除、清空即时持久化，刷新与新控制器不复活', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'window')
    const storage = new Map<string, string>()
    Reflect.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        localStorage: {
          getItem: (key: string) => storage.get(key) ?? null,
          setItem: (key: string, value: string) => storage.set(key, value),
        },
      },
    })
    try {
      const core = createCore({
        dataMode: 'demo',
        storageKey: 'notifications-isolated',
      })
      await core.fetchMessages(true)
      const { id } = core.messages.value.find(row => row.status === 'unread')!
      await core.markAsRead([id])
      await core.fetchMessages(true)
      expect(core.messages.value.find(row => row.id === id)?.status).toBe(
        'read'
      )
      await core.deleteMessages([id])
      await core.fetchMessages(true)
      expect(core.messages.value.some(row => row.id === id)).toBe(false)
      await core.clearMessages()
      await core.fetchMessages(true)
      expect(core.messages.value).toEqual([])
      const remounted = createCore({ storageKey: 'notifications-isolated' })
      await remounted.fetchMessages(true)
      expect(remounted.messages.value).toEqual([])
      expect(remounted.unreadCount.value).toBe(0)
      expect(storage.size).toBe(1)
    } finally {
      if (descriptor) Reflect.defineProperty(globalThis, 'window', descriptor)
      else Reflect.deleteProperty(globalThis, 'window')
    }
  })
})
