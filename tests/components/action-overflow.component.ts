import { flushPromises, mount } from '@vue/test-utils'
import { NDropdown } from 'naive-ui'
import { expect, test, vi } from 'vitest'
import { nextTick } from 'vue'
import C_ActionBar from '../../src/components/C_ActionBar/index.vue'
import type { ActionItem } from '../../src/components/C_ActionBar/types'

test('only marked simple actions move into the overflow menu and keep their original execution lock', async () => {
  const callbacks = new Set<() => void>()
  class ControlledObserver {
    constructor(private readonly callback: () => void) {}
    observe() {
      callbacks.add(this.callback)
    }
    disconnect() {
      callbacks.delete(this.callback)
    }
  }
  vi.stubGlobal('ResizeObserver', ControlledObserver)
  const rect = HTMLElement.prototype.getBoundingClientRect
  let width = 750
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
    function (this: HTMLElement) {
      if (this.classList.contains('c-action-bar'))
        return new DOMRect(0, 0, width, 40)
      return rect.call(this)
    }
  )

  let finish: (() => void) | undefined
  const onExport = vi.fn(
    () =>
      new Promise<void>(resolve => {
        finish = resolve
      })
  )
  const actions: ActionItem[] = [
    { key: 'save' },
    { key: 'export', group: 'right', overflow: true, onClick: onExport },
    { key: 'print', overflow: true, tooltip: 'Print the current page' },
  ]
  const wrapper = mount(C_ActionBar, {
    props: { actions, config: { overflowAt: 460 } },
  })
  const resize = async (value: number) => {
    width = value
    callbacks.forEach(callback => callback())
    await nextTick()
  }

  try {
    await vi.waitFor(() => expect(callbacks.size).toBe(1))
    expect(wrapper.find('.actions-overflow').exists()).toBe(false)
    expect(wrapper.text()).toContain('导出')
    await resize(310)
    expect(wrapper.text()).toContain('打印')
    expect(wrapper.text()).not.toContain('导出')
    const dropdown = wrapper.getComponent(NDropdown)
    const [entry] = dropdown.props('options') ?? []
    expect(entry?.label).toBe('导出')
    dropdown.vm.$emit('select', entry?.key, entry)
    dropdown.vm.$emit('select', entry?.key, entry)
    await nextTick()
    expect(onExport).toHaveBeenCalledTimes(1)
    await resize(750)
    expect(wrapper.find('.actions-overflow').exists()).toBe(false)
    const exportButton = wrapper
      .findAll('button')
      .find(button => button.text() === '导出')
    expect(exportButton?.attributes('disabled')).toBeDefined()
    finish?.()
    await flushPromises()
    expect(exportButton?.attributes('disabled')).toBeUndefined()
    await wrapper.setProps({ config: {} })
    expect(callbacks.size).toBe(0)
    expect(wrapper.text()).toContain('导出')
  } finally {
    wrapper.unmount()
    vi.unstubAllGlobals()
  }
  expect(callbacks.size).toBe(0)
})
