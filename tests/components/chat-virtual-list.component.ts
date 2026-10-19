import { afterAll, describe, expect, test, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { VVirtualList } from 'vueuc'
import { NInput, NButton } from 'naive-ui'
import C_Chat from '../../src/components/C_Chat/index.vue'
import type {
  ChatContact,
  ChatMessage,
} from '../../src/components/C_Chat/types'

const resize = vi.hoisted(() => {
  const observers: Array<{
    elements: Set<Element>
    callback: ResizeObserverCallback
  }> = []
  vi.stubGlobal(
    'ResizeObserver',
    class {
      elements = new Set<Element>()
      constructor(callback: ResizeObserverCallback) {
        observers.push({ elements: this.elements, callback })
      }
      observe(element: Element) {
        this.elements.add(element)
      }
      unobserve(element: Element) {
        this.elements.delete(element)
      }
      disconnect() {
        this.elements.clear()
      }
    }
  )
  return { observers }
})
afterAll(() => vi.unstubAllGlobals())
function resizeEntry(target: Element, height: number): ResizeObserverEntry {
  const size = { inlineSize: 600, blockSize: height }
  return {
    target,
    contentRect: new DOMRectReadOnly(0, 0, 600, height),
    borderBoxSize: [size],
    contentBoxSize: [size],
    devicePixelContentBoxSize: [size],
  }
}
const createMessages = (count: number, prefix = 'message'): ChatMessage[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${index}`,
    type: 'text',
    sender: 'other',
    content: `Message ${index}`,
    timestamp: 1_700_000_000_000 + index * 1000,
  }))
const createContacts = (count: number): ChatContact[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `contact-${index}`,
    name: `Contact ${index}`,
  }))
function mountChat(
  messages: ChatMessage[],
  contacts = createContacts(500),
  virtualScroll = true
) {
  return mount(C_Chat, {
    props: {
      messages,
      contacts,
      virtualScroll,
      showContacts: contacts.length > 0,
    },
    global: {
      stubs: { C_Icon: true, NButton: true, NInput: true, NSpin: true },
    },
  })
}
async function measure(wrapper: VueWrapper, alignBottom = true) {
  await flushPromises()
  const lists = wrapper
    .findAll('.v-vl')
    .map(node => node.element as HTMLElement)
  for (const list of lists) {
    Object.defineProperties(list, {
      clientHeight: { configurable: true, value: 400 },
      offsetHeight: { configurable: true, value: 400 },
      scrollHeight: {
        configurable: true,
        get: () =>
          Number.parseFloat(
            (list.firstElementChild as HTMLElement | null)?.style.minHeight ||
              (list.firstElementChild as HTMLElement | null)?.style.height ||
              '0'
          ) || 400,
      },
      scrollTo: {
        configurable: true,
        value: (options: ScrollToOptions) => {
          list.scrollTop = Math.max(
            0,
            Math.min(options.top ?? list.scrollTop, list.scrollHeight - 400)
          )
          list.dispatchEvent(new Event('scroll'))
        },
      },
    })
  }
  const elements = new Set<Element>(lists)
  for (const observer of resize.observers) {
    const entries = [...observer.elements]
      .filter(element => elements.has(element))
      .map(target => resizeEntry(target, 400))
    if (entries.length) observer.callback(entries, {} as ResizeObserver)
  }
  await flushPromises()
  if (alignBottom) wrapper.getComponent(C_Chat).vm.scrollToBottom()
  await nextTick()
  await flushPromises()
}

describe('C_Chat automatic native windows', () => {
  test('1000 messages and 500 contacts retain complete data with bounded DOM and variable row measurement', async () => {
    const wrapper = mountChat(createMessages(1000))
    await measure(wrapper)
    const lists = wrapper.findAllComponents(VVirtualList)
    expect(lists.map(list => list.props('items')?.length)).toEqual([500, 1000])
    expect(lists.every(list => list.props('itemResizable'))).toBe(true)
    expect(wrapper.findAll('[data-message-id]').length).toBeGreaterThan(5)
    expect(wrapper.findAll('[data-message-id]').length).toBeLessThan(30)
    expect(wrapper.findAll('[data-contact-id]').length).toBeLessThan(15)
    expect(wrapper.find('[data-message-id="message-999"]').exists()).toBe(true)
    expect(
      wrapper.get('[data-message-id]').attributes('style') ?? ''
    ).not.toContain('height')
  })

  test('small lists keep ordinary DOM, and virtualScroll=false preserves complete large lists', async () => {
    const small = mountChat(createMessages(5), createContacts(3))
    expect(small.findAllComponents(VVirtualList)).toHaveLength(0)
    expect(small.findAll('[data-message-id]')).toHaveLength(5)
    const complete = mountChat(createMessages(205), createContacts(105), false)
    expect(complete.findAllComponents(VVirtualList)).toHaveLength(0)
    expect(complete.findAll('[data-message-id]')).toHaveLength(205)
    expect(complete.findAll('[data-contact-id]')).toHaveLength(105)
  })

  test('image, file, retry and contact actions preserve their public payloads in virtual rows', async () => {
    const messages = createMessages(1000)
    messages[997] = { ...messages[997], type: 'image', content: '/photo.png' }
    messages[998] = {
      ...messages[998],
      type: 'file',
      content: '/report.pdf',
      fileName: 'Report.pdf',
    }
    messages[999] = { ...messages[999], sender: 'self', status: 'failed' }
    const wrapper = mountChat(messages)
    await measure(wrapper)
    await wrapper
      .get('[data-message-id="message-997"] .c-chat__msg-image-button')
      .trigger('click')
    await wrapper
      .get('[data-message-id="message-998"] .c-chat__msg-file')
      .trigger('click')
    await wrapper
      .get('[data-message-id="message-999"] .is-failed')
      .trigger('click')
    await wrapper.get('[data-contact-id="contact-0"]').trigger('click')
    expect(wrapper.emitted('image-preview')).toEqual([['/photo.png']])
    expect(wrapper.emitted('file-click')).toEqual([[messages[998]]])
    expect(wrapper.emitted('resend')).toEqual([[messages[999]]])
    expect(wrapper.emitted('select-contact')).toEqual([['contact-0']])
  })

  test('native top scrolling keeps load-more and loadingHistory suppression', async () => {
    const wrapper = mountChat(createMessages(500), [])
    await measure(wrapper)
    const virtual = wrapper.getComponent(VVirtualList)
    virtual.vm.scrollTo({ position: 'top' })
    await flushPromises()
    expect(wrapper.emitted('load-more')?.length).toBeGreaterThan(0)
    const before = wrapper.emitted('load-more')?.length
    await wrapper.setProps({ loadingHistory: true })
    virtual.vm.scrollTo({ position: 'bottom' })
    virtual.vm.scrollTo({ position: 'top' })
    await flushPromises()
    expect(wrapper.emitted('load-more')?.length).toBe(before)
  })
})

function normalImageView() {
  const messages = createMessages(3)
  messages[2] = { ...messages[2], type: 'image', content: '/delayed.png' }
  const wrapper = mountChat(messages, [])
  const list = wrapper.get('.c-chat__messages').element as HTMLElement
  let height = 500
  let viewport = 200
  let top = 0
  Object.defineProperties(list, {
    clientHeight: { configurable: true, get: () => viewport },
    scrollHeight: { configurable: true, get: () => height },
    scrollTop: {
      configurable: true,
      get: () => top,
      set: (value: number) => {
        top = Math.max(0, Math.min(value, height - viewport))
      },
    },
  })
  const content = wrapper.get('.c-chat__message-items').element
  function imageHeightChange(notify = true) {
    height = 800
    if (!notify) return
    for (const observer of resize.observers) {
      if (observer.elements.has(content))
        observer.callback([resizeEntry(content, height)], {} as ResizeObserver)
    }
  }
  function viewportResize() {
    viewport = 80
    for (const observer of resize.observers) {
      if (observer.elements.has(list))
        observer.callback([resizeEntry(list, viewport)], {} as ResizeObserver)
    }
  }
  return { wrapper, list, imageHeightChange, viewportResize, content }
}

function settleFrames() {
  return new Promise<void>(resolve =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  )
}

test('199 to 200 and back retain bottom following across native window transitions', async () => {
  const messages = createMessages(199)
  const wrapper = mountChat(messages, [])
  function normalGeometry() {
    const list = wrapper.get('.c-chat__messages').element as HTMLElement
    let top = 0
    Object.defineProperties(list, {
      clientHeight: { configurable: true, value: 400 },
      scrollHeight: { configurable: true, value: 19900 },
      scrollTop: {
        configurable: true,
        get: () => top,
        set: (value: number) => {
          top = Math.max(0, Math.min(value, 19500))
        },
      },
    })
    return list
  }
  const original = normalGeometry()
  await nextTick()
  expect(original.scrollTop).toBe(19500)
  await wrapper.setProps({
    messages: [...messages, ...createMessages(1, 'appended')],
  })
  await measure(wrapper, false)
  expect(wrapper.find('[data-message-id="appended-0"]').exists()).toBe(true)
  await wrapper.setProps({ messages })
  const restored = normalGeometry()
  await flushPromises()
  for (const observer of resize.observers) {
    if (observer.elements.has(restored))
      observer.callback([resizeEntry(restored, 400)], {} as ResizeObserver)
  }
  await nextTick()
  expect(restored.scrollTop).toBe(19500)
})

test('native input method confirmation does not send or prevent candidate selection', async () => {
  const wrapper = mount(C_Chat, {
    props: { showContacts: false },
    global: {
      components: { NInput, NButton },
      stubs: { C_Icon: true, NSpin: true },
    },
  })
  const textarea = wrapper.get('textarea')
  await textarea.setValue('已提交的文字')
  const confirmation = new KeyboardEvent('keydown', {
    key: 'Enter',
    isComposing: true,
    bubbles: true,
    cancelable: true,
  })
  textarea.element.dispatchEvent(confirmation)
  await nextTick()
  expect(confirmation.defaultPrevented).toBe(false)
  expect(wrapper.emitted('send')).toBeUndefined()
  expect((textarea.element as HTMLTextAreaElement).value).toBe('已提交的文字')
  await textarea.trigger('keydown', { key: 'Enter' })
  expect(wrapper.emitted('send')).toEqual([['已提交的文字']])
})

describe('C_Chat delayed image height ownership', () => {
  test('a late taller image keeps a reader at the bottom only when they were following', async () => {
    const { wrapper, list, imageHeightChange } = normalImageView()
    await nextTick()
    expect(list.scrollTop).toBe(300)
    imageHeightChange()
    await nextTick()
    expect(list.scrollTop).toBe(600)
    wrapper.unmount()
  })

  test('a resize-generated scroll before content notification does not revoke bottom following', async () => {
    const { wrapper, list, imageHeightChange } = normalImageView()
    await nextTick()
    await settleFrames()
    await wrapper.get('.c-chat__messages').trigger('scroll')
    imageHeightChange(false)
    await wrapper.get('.c-chat__messages').trigger('scroll')
    await nextTick()
    expect(list.scrollTop).toBe(600)
  })

  test('shrinking only the viewport retains bottom following', async () => {
    const { list, viewportResize } = normalImageView()
    await nextTick()
    await settleFrames()
    expect(list.scrollTop).toBe(300)
    viewportResize()
    await nextTick()
    expect(list.scrollTop).toBe(420)
  })

  test('wheel intent cannot be overwritten by an append before the browser scrolls', async () => {
    const { wrapper, list, imageHeightChange } = normalImageView()
    await nextTick()
    await settleFrames()
    await wrapper.get('.c-chat__messages').trigger('wheel')
    await wrapper.setProps({
      messages: [
        ...(wrapper.props('messages') ?? []),
        ...createMessages(1, 'new'),
      ],
    })
    imageHeightChange()
    await nextTick()
    expect(list.scrollTop).toBe(300)
  })

  test('a late taller image does not steal historical reading position and observers disconnect on unmount', async () => {
    const { wrapper, list, imageHeightChange, content } = normalImageView()
    await nextTick()
    await wrapper.get('.c-chat__messages').trigger('wheel')
    list.scrollTop = 80
    await wrapper.get('.c-chat__messages').trigger('scroll')
    imageHeightChange()
    await nextTick()
    expect(list.scrollTop).toBe(80)
    const observing = resize.observers.filter(observer =>
      observer.elements.has(content)
    )
    expect(observing.length).toBeGreaterThan(0)
    wrapper.unmount()
    expect(observing.every(observer => observer.elements.size === 0)).toBe(true)
    imageHeightChange()
    await nextTick()
    expect(list.scrollTop).toBe(80)
  })
})
