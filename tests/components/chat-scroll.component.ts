import { describe, expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import C_Chat from '../../src/components/C_Chat/index.vue'
import type { ChatMessage } from '../../src/components/C_Chat/types'

const messages = (prefix: string, count = 5): ChatMessage[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${index}`,
    content: `${prefix}-${index}`,
    type: 'text',
    sender: 'other',
    timestamp: 1_700_000_000_000 + index * 1000,
  }))

function mountChat(initial = messages('a')) {
  const wrapper = mount(C_Chat, {
    props: {
      showContacts: false,
      currentContactId: 'a',
      messages: initial,
    },
    global: {
      stubs: { C_Icon: true, NButton: true, NInput: true, NSpin: true },
    },
  })
  const element = wrapper.get('.c-chat__messages').element as HTMLElement
  let top = 0
  let writes = 0
  // 模拟浏览器布局与 scrollTop 边界，读取实际更新后的消息 DOM。
  Object.defineProperties(element, {
    clientHeight: { configurable: true, get: () => 200 },
    scrollHeight: {
      configurable: true,
      get: () =>
        wrapper
          .findAll('.c-chat__bubble')
          .reduce(
            (height, bubble) =>
              height + Math.max(100, bubble.text().length * 10),
            0
          ),
    },
    scrollTop: {
      configurable: true,
      get: () => top,
      set: (value: number) => {
        writes++
        top = Math.max(0, Math.min(value, element.scrollHeight - 200))
      },
    },
  })
  return { wrapper, element, writes: () => writes }
}

describe('C_Chat viewport continuity', () => {
  test('initial messages open at the latest message and prepended history retains the viewport', async () => {
    const initial = messages('a')
    const { wrapper, element } = mountChat(initial)
    await nextTick()
    expect(element.scrollTop).toBe(300)
    element.scrollTop = 120
    await wrapper.setProps({
      messages: [...messages('history', 2), ...initial],
    })
    await nextTick()
    expect(element.scrollTop).toBe(320)
  })

  test('incoming messages follow the bottom but do not interrupt someone reading history', async () => {
    const initial = messages('a')
    const { wrapper, element } = mountChat(initial)
    await nextTick()
    element.scrollTop = 100
    const withNew = [...initial, ...messages('new', 1)]
    await wrapper.setProps({ messages: withNew })
    await nextTick()
    expect(element.scrollTop).toBe(100)
    element.scrollTop = element.scrollHeight
    await wrapper.setProps({ messages: [...withNew, ...messages('latest', 1)] })
    await nextTick()
    expect(element.scrollTop).toBe(element.scrollHeight - element.clientHeight)
  })

  test('switching conversations with the same message count resets the viewport', async () => {
    const { wrapper, element } = mountChat()
    await nextTick()
    element.scrollTop = 80
    await wrapper.setProps({ currentContactId: 'b', messages: messages('b') })
    await nextTick()
    expect(element.scrollTop).toBe(300)
  })

  test('streaming the last message follows only while the reader is near the bottom', async () => {
    const initial = messages('a')
    const { wrapper, element } = mountChat(initial)
    await nextTick()
    const longer = initial.map((message, index) =>
      index === initial.length - 1
        ? { ...message, content: 'x'.repeat(30) }
        : message
    )
    await wrapper.setProps({ messages: longer })
    await nextTick()
    expect(element.scrollTop).toBe(500)
    element.scrollTop = 100
    await wrapper.setProps({
      messages: longer.map((message, index) =>
        index === initial.length - 1
          ? { ...message, content: 'x'.repeat(50) }
          : message
      ),
    })
    await nextTick()
    expect(element.scrollTop).toBe(100)
  })

  test('a scheduled public scroll does not touch a detached view after unmount', async () => {
    const { wrapper, element, writes } = mountChat()
    await nextTick()
    element.scrollTop = 80
    const before = writes()
    wrapper.vm.scrollToBottom()
    wrapper.unmount()
    await nextTick()
    expect(writes()).toBe(before)
    expect(element.scrollTop).toBe(80)
  })
})
