import { describe, expect, test, vi } from 'vitest'
import { DOMWrapper, flushPromises, mount } from '@vue/test-utils'
import { VVirtualList } from 'vueuc'
import { ref, nextTick } from 'vue'
import C_GlobalSearch from '../../src/components/C_GlobalSearch/index.vue'
import type { SearchMenuItem } from '../../src/components/C_GlobalSearch/types'

const body = () => new DOMWrapper(document.body)
const open = async (wrapper: ReturnType<typeof mount>) => {
  await wrapper.get('.robot-search-trigger').trigger('click')
  await flushPromises()
}

describe('global search official virtual-list integration', () => {
  test('resolves menu history against the active menu and still supports legacy queries', async () => {
    const storageKey = 'test-current-menu-history'
    localStorage.setItem(
      storageKey,
      JSON.stringify([
        {
          query: 'Former private',
          menuItem: { key: '/private' },
          timestamp: 2,
        },
        { query: 'Former public', menuKey: '/public', timestamp: 1 },
        'legacy query',
      ])
    )
    const menus = ref<SearchMenuItem[]>([
      { key: '/private', label: 'Private page' },
      { key: '/public', label: 'Current public' },
    ])
    const onSelect = vi.fn()
    const wrapper = mount(C_GlobalSearch, {
      attachTo: document.body,
      props: {
        options: { menuItems: () => menus.value, onSelect, storageKey },
      },
    })
    try {
      await open(wrapper)
      const staleRow = body().findAll('.robot-history-item')[0]
      expect(staleRow.text()).toContain('Private page')
      menus.value.shift()
      // 当前 DOM 还未刷新时触发旧点击，仍要检查最新菜单。
      staleRow.element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      expect(onSelect).not.toHaveBeenCalled()
      await nextTick()
      const [publicRow, legacyRow] = body().findAll('.robot-history-item')
      expect(publicRow.text()).toContain('Current public')
      expect(legacyRow.text()).toContain('legacy query')
      expect(body().text()).not.toContain('Private page')
      await publicRow.get('button').trigger('click')
      expect(JSON.parse(localStorage.getItem(storageKey)!)).toEqual([
        { menuKey: '/private', timestamp: 2 },
        { query: 'legacy query', menuKey: null, timestamp: 0 },
      ])
      await body().get('.robot-history-item').trigger('click')
      expect((body().get('input').element as HTMLInputElement).value).toBe(
        'legacy query'
      )
    } finally {
      wrapper.unmount()
      localStorage.removeItem(storageKey)
    }
  })

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
