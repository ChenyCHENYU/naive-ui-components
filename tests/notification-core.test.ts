import { describe, expect, test } from 'bun:test'
import { createRenderer, h } from 'vue'
import { resolveNotificationActionUrl } from '../src/components/C_NotificationCenter/actionUrl'
import { useNotificationCore } from '../src/components/C_NotificationCenter/composables/useNotificationCore'
import type {
  NotificationMessage,
  WSConnectionStatus,
} from '../src/components/C_NotificationCenter/types'

const renderer = createRenderer({
  patchProp: () => {},
  insert: () => {},
  remove: () => {},
  createElement: () => ({}),
  createText: () => ({}),
  createComment: () => ({}),
  setText: () => {},
  setElementText: () => {},
  parentNode: () => null,
  nextSibling: () => null,
})

const notification: NotificationMessage = {
  id: 'server-read',
  title: 'Read',
  summary: 'Already read on server',
  category: 'system',
  priority: 'normal',
  status: 'read',
  timestamp: '2026-01-01T00:00:00.000Z',
}

describe('C_NotificationCenter state boundaries', () => {
  test('remote read state is authoritative and returned rows are isolated', async () => {
    const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        localStorage: {
          getItem: () => JSON.stringify({ unreadIds: ['server-read'] }),
        },
      },
    })

    let core!: ReturnType<typeof useNotificationCore>
    try {
      const app = renderer.createApp({
        setup() {
          core = useNotificationCore({
            pollingInterval: 0,
            fetchNotifications: async () => ({
              list: [notification],
              total: 1,
              unreadCount: 0,
            }),
          })
          return () => h('div')
        },
      })
      app.mount({})
      await Promise.resolve()
      expect(core.messages.value[0]?.status).toBe('read')
      core.messages.value[0].status = 'unread'
      expect(notification.status).toBe('read')
      app.unmount()
    } finally {
      if (previousWindow) {
        Object.defineProperty(globalThis, 'window', previousWindow)
      } else {
        Reflect.deleteProperty(globalThis, 'window')
      }
    }
  })

  test('only safe notification actions are handed to navigation', () => {
    expect(resolveNotificationActionUrl('/workflow/approval')).toEqual({
      kind: 'internal',
      url: '/workflow/approval',
    })
    expect(resolveNotificationActionUrl('https://example.com/path')).toEqual({
      kind: 'external',
      url: 'https://example.com/path',
    })
    for (const url of [
      'javascript:alert(1)',
      '//evil.example/path',
      'https://',
      '\\evil.example',
      '  ',
    ]) {
      expect(resolveNotificationActionUrl(url)).toBeNull()
    }
  })

  test('WebSocket status and new-message events are forwarded', () => {
    class FakeSocket extends EventTarget {
      static OPEN = 1
      static latest: FakeSocket
      readyState = 0

      constructor() {
        super()
        FakeSocket.latest = this
      }

      close() {}
      send() {}
    }

    const previousSocket = Object.getOwnPropertyDescriptor(
      globalThis,
      'WebSocket'
    )
    Object.defineProperty(globalThis, 'WebSocket', {
      configurable: true,
      value: FakeSocket,
    })
    const statuses: WSConnectionStatus[] = []
    const received: NotificationMessage[] = []

    try {
      let core!: ReturnType<typeof useNotificationCore>
      const app = renderer.createApp({
        setup() {
          core = useNotificationCore(
            { pollingInterval: 0 },
            {
              onWSStatusChange: status => statuses.push(status),
              onNewMessage: message => received.push(message),
            }
          )
          return () => h('div')
        },
      })
      app.mount({})
      core.connectWS({
        url: 'wss://example.com/notifications',
        heartbeatInterval: 0,
      })
      FakeSocket.latest.readyState = FakeSocket.OPEN
      FakeSocket.latest.dispatchEvent(new Event('open'))
      FakeSocket.latest.dispatchEvent(
        new MessageEvent('message', {
          data: JSON.stringify({
            type: 'new_message',
            data: { ...notification, id: 'new', status: 'unread' },
          }),
        })
      )
      expect(statuses).toEqual(['connecting', 'connected'])
      expect(received.map(message => message.id)).toEqual(['new'])
      app.unmount()
    } finally {
      if (previousSocket) {
        Object.defineProperty(globalThis, 'WebSocket', previousSocket)
      } else {
        Reflect.deleteProperty(globalThis, 'WebSocket')
      }
    }
  })
})
