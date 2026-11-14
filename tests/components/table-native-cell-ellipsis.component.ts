import { afterEach, expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { h, ref, type VNode } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { NButton, NTooltip } from 'naive-ui'
import { nativeCellEllipsis } from '../../src/components/C_Table/composables/nativeCellEllipsis'
import C_Table from '../../src/components/C_Table/index.vue'
import type {
  DataRecord,
  TableColumn,
} from '../../src/components/C_Table/types'

afterEach(() => vi.unstubAllGlobals())

for (const tag of ['button', 'a'] as const) {
  test(`${tag} keeps its original ref, hooks and click while overflow is measured only on interaction`, async () => {
    const text = ref('DN-20261114-001')
    const clicked = vi.fn()
    const mounted = vi.fn()
    const updated = vi.fn()
    const originalRef = vi.fn()
    const hover = vi.fn()
    const capturedHover = vi.fn()
    const wrapper = mount(
      {
        render: () =>
          nativeCellEllipsis(
            h(
              tag,
              {
                id: 'business-link',
                'data-source': 'business',
                ref: originalRef,
                onClick: clicked,
                onMouseenter: hover,
                onMouseenterCapture: capturedHover,
                onVnodeMounted: mounted,
                onVnodeUpdated: updated,
              },
              text.value
            )
          ),
      },
      { attachTo: document.body }
    )
    await flushPromises()
    const button = wrapper.get(tag)
    expect(originalRef).toHaveBeenCalledWith(button.element, expect.any(Object))
    expect(mounted).toHaveBeenCalledTimes(1)
    expect(button.attributes('data-source')).toBe('business')
    expect(wrapper.getComponent(NTooltip).props('trigger')).toBe('manual')
    expect(wrapper.getComponent(NTooltip).props('getDisabled')).toBeUndefined()
    let reads = 0
    let scroll = 140
    Object.defineProperty(button.element, 'scrollWidth', {
      configurable: true,
      get: () => {
        reads++
        return scroll
      },
    })
    Object.defineProperty(button.element, 'clientWidth', {
      configurable: true,
      get: () => {
        reads++
        return 60
      },
    })
    await flushPromises()
    expect(reads).toBe(0)
    await button.trigger('mouseenter')
    await flushPromises()
    expect(hover).toHaveBeenCalledTimes(1)
    expect(capturedHover).toHaveBeenCalledTimes(1)
    expect(reads).toBeGreaterThan(0)
    expect(document.body.querySelector('.n-tooltip')?.textContent).toBe(
      text.value
    )
    await button.trigger('click')
    expect(clicked).toHaveBeenCalledTimes(1)
    await button.trigger('focus')
    await button.trigger('mouseleave')
    await flushPromises()
    expect(document.body.querySelector('.n-tooltip')?.textContent).toBe(
      text.value
    )
    await button.trigger('blur')
    await flushPromises()
    const beforeUpdate = reads
    const beforeUpdatedHooks = updated.mock.calls.length
    text.value = 'DN-20261114-002'
    await flushPromises()
    expect(updated).toHaveBeenCalledTimes(beforeUpdatedHooks + 1)
    expect(button.text()).toBe(text.value)
    expect(reads).toBe(beforeUpdate)
    scroll = 50
    await button.trigger('focus')
    await flushPromises()
    const hidden = document.body.querySelector<HTMLElement>('.n-tooltip')
    expect(!hidden || hidden.style.display === 'none').toBe(true)
    await button.trigger('blur')
    scroll = 140
    await button.trigger('focus')
    await flushPromises()
    expect(document.body.querySelector('.n-tooltip')?.textContent).toBe(
      text.value
    )
    wrapper.unmount()
    expect(originalRef).toHaveBeenLastCalledWith(null, expect.any(Object))
  })
}

test('rich VNodes and component buttons keep their exact original presentation', () => {
  const nodes = [
    h('button', null, [h('b', 'rich')]),
    h(NButton, null, () => 'Naive'),
    h('div', 'plain'),
    h('a', null, ''),
  ]
  for (const node of nodes) expect(nativeCellEllipsis(node)).toBe(node)
  expect(nativeCellEllipsis('plain')).toBe('plain')
})

test.each([
  { declaration: {}, expected: 1 },
  { declaration: { ellipsis: false }, expected: 0 },
  { declaration: { ellipsis: { tooltip: false } }, expected: 0 },
  { declaration: { width: 140 }, expected: 0 },
])(
  'only default automatic native-text columns use the private tooltip: %j',
  async ({ declaration, expected }) => {
    const column: TableColumn = {
      key: 'code',
      title: '单号',
      render: row => h('button', { type: 'button' }, String(row.code)),
      ...declaration,
    }
    const wrapper = mount(C_Table<DataRecord>, {
      props: {
        rowNumber: false,
        data: [{ id: 1, code: 'DN-20261114-001' }],
        columns: [column],
        config: { toolbar: { show: false }, pagination: false },
      },
    })
    await flushPromises()
    expect(
      wrapper
        .findAllComponents(NTooltip)
        .filter(tooltip => tooltip.props('trigger') === 'manual')
    ).toHaveLength(expected)
  }
)

test('SSR creates no DOM dependency and leaves the original vnode untouched', async () => {
  vi.stubGlobal('HTMLElement', undefined)
  const original = h('button', { id: 'ssr-link' }, 'DN-20261114-001')
  const props = { ...original.props }
  const result = await renderToString(
    h({ render: () => nativeCellEllipsis(original) as VNode })
  )
  expect(result).toContain('DN-20261114-001')
  expect(result).toContain('id="ssr-link"')
  expect(original.props).toEqual(props)
})
