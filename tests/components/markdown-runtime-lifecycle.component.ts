import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { MdEditor, type ExposeParam } from 'md-editor-v3'
import C_Markdown from '../../src/components/C_Markdown/index.vue'

const observers: Set<Element>[] = []
class Observer {
  targets = new Set<Element>()
  constructor() {
    observers.push(this.targets)
  }
  observe(element: Element) {
    this.targets.add(element)
  }
  unobserve(element: Element) {
    this.targets.delete(element)
  }
  disconnect() {
    this.targets.clear()
  }
}
beforeEach(() => {
  observers.length = 0
  vi.useFakeTimers()
  vi.stubGlobal('ResizeObserver', Observer)
  vi.stubGlobal('IntersectionObserver', Observer)
  const append = document.head.appendChild.bind(document.head)
  // Exercise the real editor and CodeMirror without loading optional CDN renderers.
  vi.spyOn(document.head, 'appendChild').mockImplementation(node => {
    if (node instanceof HTMLScriptElement || node instanceof HTMLLinkElement)
      return node
    return append(node)
  })
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

test('real MdEditor destroys its CodeMirror observers and late initialization cannot revive them', async () => {
  const wrapper = mount(C_Markdown, {
    attachTo: document.body,
    props: {
      modelValue: '# Lifecycle\n\nText',
      toolbar: [],
      showWordCount: false,
    },
  })
  await nextTick()
  const editor = wrapper.getComponent(MdEditor).vm as unknown as ExposeParam
  const view = editor.getEditorView()!
  expect(view).toBeTruthy()
  const destroy = vi.spyOn(view, 'destroy')
  expect(
    observers
      .flatMap(targets => [...targets])
      .some(element => element.classList.contains('cm-scroller'))
  ).toBe(true)
  wrapper.unmount()
  try {
    expect(destroy).toHaveBeenCalledTimes(1)
    expect(observers.every(targets => targets.size === 0)).toBe(true)
    await vi.advanceTimersByTimeAsync(1000)
    expect(observers.every(targets => targets.size === 0)).toBe(true)
    expect(document.querySelector('.cm-editor')).toBeNull()
  } finally {
    // The pre-fix regression must not keep the intentionally leaked SDK alive.
    if (destroy.mock.calls.length === 0) view.destroy()
  }
})

function mountMarkdown(props: Record<string, unknown> = {}) {
  return mount(C_Markdown, {
    attachTo: document.body,
    props: {
      modelValue: '# Lifecycle',
      toolbar: [],
      showWordCount: false,
      ...props,
    },
  })
}
function handlers(wrapper: ReturnType<typeof mountMarkdown>) {
  return wrapper.getComponent(MdEditor).vm.$.vnode.props as unknown as {
    onOnSave(text: string, html: Promise<string>): Promise<void>
    onOnUploadImg(files: File[], insert: (urls: unknown[]) => void): void
    onOnHtmlChanged(html: string): void
  }
}

test('save delivers active results but ignores promises settling after unmount', async () => {
  const save = vi.fn()
  const wrapper = mountMarkdown({ onSave: save })
  const events = handlers(wrapper)
  await events.onOnSave('current', Promise.resolve('Current content'))
  expect(save).toHaveBeenCalledExactlyOnceWith('current', 'Current content')
  let resolve!: (html: string) => void
  const pending = events.onOnSave(
    'late',
    new Promise(done => {
      resolve = done
    })
  )
  wrapper.unmount()
  resolve('<p>Late result</p>')
  await pending
  expect(save).toHaveBeenCalledTimes(1)
  await expect(
    events.onOnSave(
      'late failure',
      Promise.reject(new Error('detached renderer'))
    )
  ).resolves.toBeUndefined()
})

test('upload completion and auto-save cannot mutate or emit after disposal', async () => {
  let insert!: (image: { url: string }) => void
  const autoSave = vi.fn()
  const wrapper = mountMarkdown({
    autoSave: true,
    autoSaveInterval: 100,
    onAutoSave: autoSave,
    onUploadImage: (_event: Event, callback: typeof insert) => {
      insert = callback
    },
  })
  const events = handlers(wrapper)
  const insertIntoSdk = vi.fn()
  events.onOnUploadImg(
    [new File(['image'], 'photo.png', { type: 'image/png' })],
    insertIntoSdk
  )
  insert({ url: '/current.png' })
  expect(insertIntoSdk).toHaveBeenCalledExactlyOnceWith([
    { url: '/current.png', alt: '', title: '' },
  ])
  events.onOnHtmlChanged('<p>Pending auto-save</p>')
  wrapper.unmount()
  insert({ url: '/late.png' })
  events.onOnHtmlChanged('<p>Late render</p>')
  await vi.advanceTimersByTimeAsync(1000)
  expect(insertIntoSdk).toHaveBeenCalledTimes(1)
  expect(autoSave).not.toHaveBeenCalled()
})

test('disposing one real Markdown editor preserves another instance', async () => {
  const first = mountMarkdown({ editorId: 'markdown-first' })
  const second = mountMarkdown({ editorId: 'markdown-second' })
  await nextTick()
  const firstView = (
    first.getComponent(MdEditor).vm as unknown as ExposeParam
  ).getEditorView()!
  const secondView = (
    second.getComponent(MdEditor).vm as unknown as ExposeParam
  ).getEditorView()!
  const destroyFirst = vi.spyOn(firstView, 'destroy')
  const destroySecond = vi.spyOn(secondView, 'destroy')
  first.unmount()
  expect(destroyFirst).toHaveBeenCalledTimes(1)
  expect(destroySecond).not.toHaveBeenCalled()
  expect(secondView.dom.isConnected).toBe(true)
  expect(
    observers
      .flatMap(targets => [...targets])
      .some(element => secondView.dom.contains(element))
  ).toBe(true)
  second.unmount()
  expect(destroySecond).toHaveBeenCalledTimes(1)
  expect(observers.every(targets => targets.size === 0)).toBe(true)
})
