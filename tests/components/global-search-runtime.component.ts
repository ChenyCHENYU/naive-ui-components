import { describe, expect, test, vi } from 'vitest'
import { DOMWrapper, flushPromises, mount } from '@vue/test-utils'
import { VVirtualList } from 'vueuc'
import C_GlobalSearch from '../../src/components/C_GlobalSearch/index.vue'

const body = () => new DOMWrapper(document.body)
const open = async (wrapper: ReturnType<typeof mount>) => {
  await wrapper.get('.robot-search-trigger').trigger('click')
  await flushPromises()
}

describe('global search official virtual-list integration', () => {
  test('keeps thousands of results available with bounded DOM and scrolls keyboard selection into view', async () => {
    const onSelect = vi.fn()
    const wrapper = mount(C_GlobalSearch, {
      attachTo: document.body,
      props: {
        options: {
          menuItems: () =>
            Array.from({ length: 5_000 }, (_, index) => ({
              key: `/entry/${index}`,
              label: `Entry ${index}`,
            })),
          onSelect,
        },
      },
    })
    await open(wrapper)
    const input = body().get('input.robot-search-input')
    await input.setValue('entry')
    await flushPromises()
    const list = wrapper.getComponent(VVirtualList)
    expect(list.props('items')).toHaveLength(5_000)
    const element = body().get('.robot-virtual-items').element as HTMLElement
    Object.defineProperty(element, 'offsetHeight', {
      configurable: true,
      value: 320,
    })
    vi.spyOn(element, 'scrollTo').mockImplementation(
      (options: ScrollToOptions | number, y?: number) => {
        element.scrollTop =
          typeof options === 'number'
            ? (y ?? 0)
            : (options.top ?? element.scrollTop)
        element.dispatchEvent(new Event('scroll'))
      }
    )
    // happy-dom has no layout; deliver the same viewport geometry as ResizeObserver.
    const resize = list
      .getComponent({ name: 'ResizeObserver' })
      .props('onResize')
    resize({ target: element, contentRect: { height: 320, width: 560 } })
    await flushPromises()
    expect(body().findAll('.robot-result-item').length).toBeGreaterThan(0)
    expect(body().findAll('.robot-result-item').length).toBeLessThanOrEqual(8)
    expect(body().text()).toContain('共 5000 项结果')
    const scroll = vi.spyOn(list.vm, 'scrollTo')
    element.scrollTop = 6_400
    element.dispatchEvent(new Event('scroll'))
    await flushPromises()
    expect(body().find('.robot-result-item-selected').exists()).toBe(false)
    await input.trigger('keydown', { key: 'ArrowUp' })
    await flushPromises()
    expect(scroll).toHaveBeenLastCalledWith({ index: 0 })
    expect(body().get('.robot-result-item-selected').text()).toContain(
      'Entry 0'
    )
    for (let index = 0; index < 1_200; index++) {
      input.element.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowDown',
          bubbles: true,
          cancelable: true,
        })
      )
    }
    await flushPromises()
    expect(scroll).toHaveBeenLastCalledWith({ index: 1_200 })
    expect(element.scrollTop).toBeGreaterThan(0)
    const selected = body().get('.robot-result-item-selected')
    expect(selected.text()).toContain('Entry 1200')
    expect(input.attributes('aria-activedescendant')).toBe(
      selected.attributes('id')
    )
    expect(selected.attributes('aria-posinset')).toBe('1201')
    expect(selected.attributes('aria-setsize')).toBe('5000')
    expect(body().findAll('.robot-result-item').length).toBeLessThanOrEqual(8)
    await input.trigger('keydown', { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('/entry/1200', false)
  })

  test('replaces component options without retaining stale menus, theme or selection callbacks', async () => {
    const oldSelect = vi.fn()
    const newSelect = vi.fn()
    const wrapper = mount(C_GlobalSearch, {
      attachTo: document.body,
      props: {
        options: {
          menuItems: () => [{ key: '/old', label: 'Old menu' }],
          onSelect: oldSelect,
        },
      },
    })
    await open(wrapper)
    await body().get('input').setValue('old')
    expect(wrapper.getComponent(VVirtualList).props('items')).toHaveLength(1)
    await wrapper.setProps({
      options: {
        menuItems: () => [{ key: '/new', label: 'New menu' }],
        onSelect: newSelect,
        isDark: () => true,
      },
    })
    await body().get('input').setValue('new')
    expect(body().get('.robot-dialog-container').classes()).toContain(
      'dialog-dark'
    )
    expect(wrapper.getComponent(VVirtualList).props('items')).toEqual([
      { key: '/new', label: 'New menu' },
    ])
    await body().get('input').trigger('keydown', { key: 'Enter' })
    expect(oldSelect).not.toHaveBeenCalled()
    expect(newSelect).toHaveBeenCalledExactlyOnceWith('/new', false)
  })

  test('ignores composition confirmation and renders an explicit no-results state without negative navigation', async () => {
    const onSelect = vi.fn()
    const wrapper = mount(C_GlobalSearch, {
      attachTo: document.body,
      props: {
        options: {
          menuItems: () => [{ key: '/result', label: 'Result' }],
          onSelect,
        },
      },
    })
    await open(wrapper)
    const input = body().get('input')
    await input.setValue('result')
    await input.trigger('compositionstart')
    await input.trigger('keydown', { key: 'Enter' })
    await input.trigger('keydown', { key: 'Escape' })
    expect(onSelect).not.toHaveBeenCalled()
    expect(body().find('.robot-dialog-container').exists()).toBe(true)
    await input.trigger('compositionend')
    await input.setValue('missing')
    await input.trigger('keydown', { key: 'ArrowDown' })
    await input.trigger('keydown', { key: 'ArrowUp' })
    await input.trigger('keydown', { key: 'Enter' })
    expect(body().text()).toContain('未找到 "missing" 相关内容')
    expect(input.attributes('aria-activedescendant')).toBeUndefined()
    expect(onSelect).not.toHaveBeenCalled()
  })
})
