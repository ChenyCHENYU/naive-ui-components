import { afterAll, expect, test, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { NCheckbox, NInput } from 'naive-ui'
import { VVirtualList } from 'vueuc'
import C_Transfer from '../../src/components/C_Transfer/index.vue'
import type { TransferItem } from '../../src/components/C_Transfer/types'

// happy-dom does not lay out CSS; feed real native virtual lists their viewport size.
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

const createData = (count: number): TransferItem[] =>
  Array.from({ length: count }, (_, key) => ({ key, label: `Item ${key}` }))

async function measure(wrapper: VueWrapper, height = 380) {
  await flushPromises()
  const elements = new Set(wrapper.findAll('.v-vl').map(node => node.element))
  for (const observer of resize.observers) {
    const entries = [...observer.elements]
      .filter(element => elements.has(element))
      .map(
        target =>
          ({
            target,
            contentRect: { height, width: 240 },
          }) as ResizeObserverEntry
      )
    if (entries.length) observer.callback(entries, {} as ResizeObserver)
  }
  await flushPromises()
}

const rows = (wrapper: VueWrapper, side = 0) =>
  wrapper.findAll('.c-transfer__panel')[side].findAll('.c-transfer__item')
const selectAll = async (wrapper: VueWrapper, side = 0) => {
  wrapper
    .findAll('.c-transfer__header')
    [side].getComponent(NCheckbox)
    .vm.$emit('update:checked', true)
  await flushPromises()
}

test('3000 items mount a bounded native viewport while the full panel count remains accurate', async () => {
  const wrapper = mount(C_Transfer, {
    props: { data: createData(3000), modelValue: [1], filterable: true },
  })
  await measure(wrapper)
  expect(wrapper.findAll('input[aria-label="搜索可选列表"]')).toHaveLength(1)
  expect(wrapper.findAll('input[aria-label="搜索已选列表"]')).toHaveLength(1)
  expect(wrapper.findAll('.c-transfer__list--virtual')).toHaveLength(1)
  expect(wrapper.getComponent(VVirtualList).props('items')).toHaveLength(2999)
  expect(rows(wrapper).length).toBeGreaterThan(5)
  expect(wrapper.findAll('.c-transfer__item').length).toBeLessThan(20)
  expect(wrapper.element.querySelectorAll('*').length).toBeLessThan(350)
  expect(
    wrapper.findAll('.c-transfer__count').map(count => count.text())
  ).toEqual(['0 / 2999', '0 / 1'])
})

test('select-all moves enabled records outside the viewport and preserves target/model order', async () => {
  const data = createData(300).map(item => ({
    ...item,
    disabled: item.key === 5 || item.key === 205,
  }))
  const wrapper = mount(C_Transfer, {
    props: { data, modelValue: [290, 11, 'missing'] },
  })
  await measure(wrapper)
  await selectAll(wrapper)
  const expectedKeys = data
    .filter(item => !item.disabled && item.key !== 290 && item.key !== 11)
    .map(item => item.key)
  expect(wrapper.findAll('.c-transfer__count')[0].text()).toBe('296 / 298')
  await wrapper.get('[aria-label="移至已选列表"]').trigger('click')
  const next = [290, 11, 'missing', ...expectedKeys]
  expect(wrapper.emitted('update:modelValue')).toEqual([[next]])
  expect(wrapper.emitted('change')).toEqual([[next, 'right', expectedKeys]])
  await wrapper.setProps({ modelValue: next })
  await measure(wrapper)
  expect(rows(wrapper).map(row => row.text())).toEqual(['Item 5', 'Item 205'])
  expect(
    wrapper
      .getComponent(VVirtualList)
      .props('items')!
      .map(item => item.key)
  ).toEqual([290, 11, ...expectedKeys])
  await selectAll(wrapper, 1)
  await wrapper.get('[aria-label="移回可选列表"]').trigger('click')
  expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([['missing']])
})

test('scrolling recycles rows without losing checks and moving still follows source order', async () => {
  const wrapper = mount(C_Transfer, {
    props: { data: createData(3000), modelValue: [] },
  })
  await measure(wrapper)
  const viewport = wrapper.get('.v-vl')
  ;(viewport.element as HTMLElement).scrollTop = 2500 * 34
  await viewport.trigger('scroll')
  const far = rows(wrapper).find(row => row.text() === 'Item 2500')!
  await far.trigger('click')
  ;(viewport.element as HTMLElement).scrollTop = 0
  await viewport.trigger('scroll')
  await rows(wrapper)
    .find(row => row.text() === 'Item 0')!
    .trigger('click')
  ;(viewport.element as HTMLElement).scrollTop = 2500 * 34
  await viewport.trigger('scroll')
  expect(
    rows(wrapper)
      .find(row => row.text() === 'Item 2500')!
      .classes()
  ).toContain('is-checked')
  await wrapper.get('[aria-label="移至已选列表"]').trigger('click')
  expect(wrapper.emitted('change')).toEqual([[[0, 2500], 'right', [0, 2500]]])
})

test('search resets a scrolled native viewport and switches to the normal path for small results', async () => {
  const wrapper = mount(C_Transfer, {
    props: { data: createData(3000), modelValue: [], filterable: true },
  })
  await measure(wrapper)
  const input = wrapper.getComponent(NInput)
  const inputElement = input.element
  const viewport = wrapper.get('.v-vl')
  ;(viewport.element as HTMLElement).scrollTop = 2500 * 34
  await viewport.trigger('scroll')
  input.vm.$emit('update:value', 'Item 2')
  await flushPromises()
  expect((viewport.element as HTMLElement).scrollTop).toBe(0)
  await viewport.trigger('scroll')
  expect(rows(wrapper)[0].text()).toBe('Item 2')
  input.vm.$emit('update:value', 'Item 2999')
  await flushPromises()
  expect(wrapper.findComponent(VVirtualList).exists()).toBe(false)
  expect(rows(wrapper).map(row => row.text())).toEqual(['Item 2999'])
  expect(wrapper.getComponent(NInput).element).toBe(inputElement)
})

test.each([
  ['small', 28],
  ['medium', 34],
  ['large', 40],
] as const)(
  '%s uses matching fixed row sizing while retaining the custom height variable',
  async (size, itemSize) => {
    const wrapper = mount(C_Transfer, {
      props: { data: createData(100), modelValue: [], size },
      attrs: { style: { '--tf-height': '240px' } },
    })
    await measure(wrapper, 240)
    expect(wrapper.classes()).toContain(`is-${size}`)
    expect(wrapper.getComponent(VVirtualList).props('itemSize')).toBe(itemSize)
    expect(
      (wrapper.element as HTMLElement).style.getPropertyValue('--tf-height')
    ).toBe('240px')
    expect(wrapper.getComponent(VVirtualList).vm.$attrs.style).toMatchObject({
      height: expect.stringContaining('var(--tf-height)'),
    })
  }
)

test('normal and virtual paths retain disabled, search, title and checked state semantics', async () => {
  const data = createData(120).map(item => ({
    ...item,
    disabled: item.key === 0,
    extra: { category: Number(item.key) % 2 ? 'odd' : 'even' },
  }))
  const filterMethod = vi.fn(
    (query: string, item: TransferItem) => item.extra?.category === query
  )
  const wrapper = mount(C_Transfer, {
    props: {
      data,
      modelValue: [],
      virtualScroll: false,
      filterable: true,
      filterMethod,
      titles: ['Available people', 'Assigned people'],
    },
  })
  expect(wrapper.findComponent(VVirtualList).exists()).toBe(false)
  expect(rows(wrapper)).toHaveLength(120)
  await rows(wrapper)[0].trigger('click')
  expect(
    wrapper.get('[aria-label="移至已选列表"]').attributes('disabled')
  ).toBeDefined()
  await rows(wrapper)[1].trigger('click')
  await wrapper.setProps({ virtualScroll: true })
  await measure(wrapper)
  expect(
    rows(wrapper)
      .find(row => row.text() === 'Item 1')!
      .classes()
  ).toContain('is-checked')
  expect(
    wrapper.findAll('.c-transfer__header').map(header => header.text())
  ).toEqual(['Available people1 / 120', 'Assigned people0 / 0'])
  wrapper.findAllComponents(NInput)[0].vm.$emit('update:value', 'even')
  await flushPromises()
  expect(filterMethod).toHaveBeenCalled()
  expect(rows(wrapper)).toHaveLength(60)
  await selectAll(wrapper)
  await wrapper.get('[aria-label="移至已选列表"]').trigger('click')
  const expected = data
    .filter(
      item =>
        !item.disabled && (item.key === 1 || item.extra.category === 'even')
    )
    .map(item => item.key)
  expect(wrapper.emitted('change')).toEqual([[expected, 'right', expected]])
  await wrapper.setProps({
    showSelectAll: false,
    sourceEmptyText: 'No matching people',
  })
  wrapper.findAllComponents(NInput)[0].vm.$emit('update:value', 'missing')
  await flushPromises()
  expect(
    wrapper.findAll('.c-transfer__title').map(title => title.text())
  ).toEqual(['Available people', 'Assigned people'])
  expect(wrapper.findAll('.c-transfer__empty')[0].text()).toBe(
    'No matching people'
  )
})
