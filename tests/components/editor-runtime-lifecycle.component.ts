import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { Boot, type IDomEditor } from '@wangeditor-next/editor'
import C_Editor from '../../src/components/C_Editor/index.vue'

// DOMPurify requires a browser DOM for HTML fidelity; this suite exercises the
// real editor lifecycle and model bridge. Browser E2E retains the real sanitizer.
vi.mock('../../src/utils/html', () => ({
  sanitizeRichHtml: (html: string) => html,
}))

const instances: IDomEditor[] = []
let beforeCreated: (() => void) | undefined
Boot.registerPlugin(editor => {
  instances.push(editor)
  // The SDK runs plugins synchronously, then queues its CREATED notification.
  // Queue removal first to reproduce destruction between creation and notification.
  queueMicrotask(() => beforeCreated?.())
  return editor
})
beforeEach(() => {
  instances.length = 0
  beforeCreated = undefined
})
afterEach(() => {
  beforeCreated = undefined
  instances.forEach(editor => {
    if (!editor.isDestroyed) editor.destroy()
  })
})

test('real rich editor is destroyed when unmounted before its CREATED microtask', async () => {
  const mounted = vi.fn()
  const wrapper = mount(C_Editor, {
    attachTo: document.body,
    props: {
      editorId: 'creation-race',
      modelValue: '<p>Lifecycle</p>',
      onEditorMounted: mounted,
    },
  })
  beforeCreated = () => wrapper.unmount()
  await flushPromises()
  await vi.waitFor(() => expect(instances).toHaveLength(1))
  expect(instances[0].isDestroyed).toBe(true)
  expect(wrapper.vm.editorInstance).toBeNull()
  expect(document.querySelector('.w-e-text-container')).toBeNull()
})

test('unmount before dynamic import settles never creates an editor', async () => {
  const mounted = vi.fn()
  const wrapper = mount(C_Editor, {
    props: { editorId: 'cancel-import', onEditorMounted: mounted },
  })
  wrapper.unmount()
  await flushPromises()
  expect(instances).toHaveLength(0)
  expect(mounted).not.toHaveBeenCalled()
})

test('real runtime retains HTML sync, disabled state, restart and idempotent disposal', async () => {
  const update = vi.fn()
  const mounted = vi.fn()
  const wrapper = mount(C_Editor, {
    attachTo: document.body,
    props: {
      editorId: 'runtime-contract',
      modelValue: '<p>Initial</p>',
      disabled: true,
      'onUpdate:modelValue': update,
      onEditorMounted: mounted,
    },
  })
  await vi.waitFor(() => expect(mounted).toHaveBeenCalledTimes(1))
  const first = instances[0]
  const destroyFirst = vi.spyOn(first, 'destroy')
  expect(first.isDisabled()).toBe(true)
  expect(wrapper.vm.getContent()).toContain('Initial')
  await wrapper.setProps({ modelValue: '<p>From parent</p>', disabled: false })
  expect(first.isDisabled()).toBe(false)
  expect(wrapper.vm.getContent()).toContain('From parent')
  first.setHtml('<p>User edited</p>')
  await flushPromises()
  expect(update).toHaveBeenLastCalledWith(
    expect.stringContaining('User edited')
  )
  await wrapper.setProps({ readonly: true })
  expect(first.isDisabled()).toBe(true)
  wrapper.vm.destroyEditor()
  wrapper.vm.destroyEditor()
  expect(destroyFirst).toHaveBeenCalledTimes(1)
  wrapper.vm.initializeEditor()
  wrapper.vm.initializeEditor()
  await vi.waitFor(() => expect(mounted).toHaveBeenCalledTimes(2))
  expect(instances).toHaveLength(2)
  expect(instances[1].isDisabled()).toBe(true)
  expect(wrapper.vm.getContent()).toContain('From parent')
  const destroySecond = vi.spyOn(instances[1], 'destroy')
  wrapper.unmount()
  expect(destroyFirst).toHaveBeenCalledTimes(1)
  expect(destroySecond).toHaveBeenCalledTimes(1)
})

test('explicit disposal reports current SDK errors through the existing error event', async () => {
  const error = vi.fn()
  const wrapper = mount(C_Editor, {
    attachTo: document.body,
    props: { editorId: 'sdk-error', onError: error },
  })
  await vi.waitFor(() => expect(wrapper.vm.isInitialized).toBe(true))
  const failure = new Error('SDK destroy failed')
  vi.spyOn(instances[0], 'destroy').mockImplementationOnce(() => {
    throw failure
  })
  wrapper.vm.destroyEditor()
  expect(error).toHaveBeenCalledExactlyOnceWith(failure)
})
