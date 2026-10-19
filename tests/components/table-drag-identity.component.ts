import { describe, expect, test, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { h } from 'vue'
import Sortable, { type SortableEvent } from 'sortablejs'
import C_Table from '../../src/components/C_Table/index.vue'
import type { DataRecord } from '../../src/components/C_Table/types'

const base = {
  toolbar: { show: false },
  pagination: false as const,
  rowDrag: true,
}
const markedRows = (element: HTMLElement) =>
  [...element.children].filter(row =>
    row.hasAttribute('data-c-table-row-key')
  ) as HTMLElement[]
const activeDrag = async (wrapper: VueWrapper) => {
  await flushPromises()
  const element = wrapper.get('.n-data-table-tbody').element as HTMLElement
  await vi.waitFor(() => expect(Sortable.get(element)).toBeTruthy())
  const instance = Sortable.get(element)!
  return {
    element,
    instance,
    options: {
      onStart: instance.option('onStart'),
      onEnd: instance.option('onEnd'),
      draggable: instance.option('draggable'),
    },
  }
}
const move = (
  drag: Awaited<ReturnType<typeof activeDrag>>,
  item: HTMLElement,
  target: HTMLElement,
  after = false
) => {
  const event = {
    item,
    from: drag.element,
    to: drag.element,
    oldIndex: 999,
    newIndex: 888,
  } as SortableEvent
  drag.options.onStart?.(event)
  drag.element.insertBefore(item, after ? target.nextSibling : target)
  drag.options.onEnd?.(event)
}

describe('table drag uses stable business row identity', () => {
  test('initial mount binds without toggling rowDrag, and tree children cannot reorder unrelated roots', async () => {
    const source = [
      { id: 'parent', children: [{ id: 'child' }] },
      { id: 'other' },
    ]
    const wrapper = mount(C_Table<DataRecord>, {
      props: {
        data: source,
        columns: [{ key: 'id', title: 'ID' }],
        config: { ...base, tree: { defaultExpandAll: true } },
      },
    })
    const drag = await activeDrag(wrapper)
    const rows = [...drag.element.children] as HTMLElement[]
    expect(rows.map(row => row.textContent)).toEqual([
      'parent',
      'child',
      'other',
    ])
    expect(markedRows(drag.element)).toEqual([rows[0], rows[2]])
    expect(drag.options.draggable).toBe('> tr[data-c-table-row-key]')
    move(drag, rows[1], rows[0])
    expect(wrapper.emitted('update:data')).toBeUndefined()
    expect([...drag.element.children]).toEqual(rows)
    move(drag, rows[2], rows[0])
    expect(
      (wrapper.emitted('update:data')!.at(-1)![0] as DataRecord[]).map(
        row => row.id
      )
    ).toEqual(['other', 'parent'])
    expect(wrapper.emitted('row-move')!.at(-1)).toEqual([source[1], 1, 0])
    expect([...drag.element.children]).toEqual(rows)
    expect(source[0].children?.[0].id).toBe('child')
    await wrapper.setProps({
      data: wrapper.emitted('update:data')!.at(-1)![0] as DataRecord[],
    })
    await flushPromises()
    expect(wrapper.findAll('tbody tr').map(row => row.text())).toEqual([
      'other',
      'parent',
      'child',
    ])
  })

  test('detail rows stay outside drag ordering and row-props callbacks remain intact', async () => {
    const click = vi.fn()
    const wrapper = mount(C_Table<DataRecord>, {
      props: {
        data: [{ id: 1 }, { id: 2 }],
        columns: [{ type: 'expand' }, { key: 'id', title: 'ID' }],
        config: {
          ...base,
          expand: {
            defaultExpandedKeys: [1],
            renderContent: () => h('div', 'Details'),
          },
        },
      },
      attrs: {
        'row-props': () => ({ onClick: click, 'data-business': 'preserved' }),
      },
    })
    const drag = await activeDrag(wrapper)
    const rows = markedRows(drag.element)
    expect(drag.element.children).toHaveLength(3)
    expect(rows).toHaveLength(2)
    expect(rows[0].dataset.business).toBe('preserved')
    rows[0].click()
    expect(click).toHaveBeenCalledOnce()
    move(drag, rows[1], rows[0])
    expect(
      (wrapper.emitted('update:data')!.at(-1)![0] as DataRecord[]).map(
        row => row.id
      )
    ).toEqual([2, 1])
  })

  test('local pagination reorders only that page and reports original source indexes', async () => {
    const data = [{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }]
    const wrapper = mount(C_Table<DataRecord>, {
      props: {
        data,
        columns: [{ key: 'id', title: 'ID' }],
        config: { ...base, pagination: { page: 2, pageSize: 2 } },
      },
    })
    const drag = await activeDrag(wrapper)
    const rows = markedRows(drag.element)
    move(drag, rows[1], rows[0])
    expect(
      (wrapper.emitted('update:data')!.at(-1)![0] as DataRecord[]).map(
        row => row.id
      )
    ).toEqual([0, 1, 3, 2])
    expect(wrapper.emitted('row-move')!.at(-1)).toEqual([data[3], 3, 2])
  })

  test('number and string row keys remain distinct', async () => {
    const wrapper = mount(C_Table<DataRecord>, {
      props: {
        data: [{ id: 1 }, { id: '1' }],
        columns: [{ key: 'id', title: 'ID' }],
        config: base,
      },
    })
    const drag = await activeDrag(wrapper)
    const rows = markedRows(drag.element)
    expect(rows[0].getAttribute('data-c-table-row-key')).not.toBe(
      rows[1].getAttribute('data-c-table-row-key')
    )
    move(drag, rows[1], rows[0])
    expect(
      (wrapper.emitted('update:data')!.at(-1)![0] as DataRecord[]).map(
        row => row.id
      )
    ).toEqual(['1', 1])
  })

  test('object config defaults to enabled and native pagination keeps other pages intact', async () => {
    const source = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]
    const wrapper = mount(C_Table<DataRecord>, {
      props: {
        data: source,
        columns: [{ key: 'id', title: 'ID' }],
        pagination: { defaultPage: 2, pageSize: 2 },
        config: { ...base, rowDrag: { animationDuration: 50 } },
      },
    })
    const drag = await activeDrag(wrapper)
    const rows = markedRows(drag.element)
    expect(rows.map(row => row.textContent)).toEqual(['3', '4'])
    move(drag, rows[1], rows[0])
    expect(
      (wrapper.emitted('update:data')!.at(-1)![0] as DataRecord[]).map(
        row => row.id
      )
    ).toEqual([1, 2, 4, 3])
    expect(wrapper.emitted('row-move')!.at(-1)).toEqual([source[3], 3, 2])
    await wrapper.setProps({ config: { ...base, rowDrag: { enabled: false } } })
    await flushPromises()
    expect(Sortable.get(drag.element)).toBeFalsy()
  })

  test('an async data replacement during dragging cancels the old reorder', async () => {
    const wrapper = mount(C_Table<DataRecord>, {
      props: {
        data: [{ id: 1 }, { id: 2 }],
        columns: [{ key: 'id', title: 'ID' }],
        config: base,
      },
    })
    const drag = await activeDrag(wrapper)
    const rows = markedRows(drag.element)
    const event = {
      item: rows[1],
      from: drag.element,
      to: drag.element,
    } as SortableEvent
    drag.options.onStart?.(event)
    await wrapper.setProps({
      data: [
        { id: 1, revised: true },
        { id: 2, revised: true },
      ],
    })
    drag.element.insertBefore(rows[1], rows[0])
    drag.options.onEnd?.(event)
    expect(wrapper.emitted('update:data')).toBeUndefined()
  })

  test('empty data can load later and virtual scrolling disables unsafe drag then reconnects when disabled', async () => {
    const wrapper = mount(C_Table<DataRecord>, {
      props: {
        data: [],
        columns: [{ key: 'id', title: 'ID' }],
        config: base,
      },
    })
    await flushPromises()
    await wrapper.setProps({ data: [{ id: 1 }, { id: 2 }] })
    const drag = await activeDrag(wrapper)
    await wrapper.setProps({ config: { ...base, virtualScroll: true } })
    await flushPromises()
    expect(Sortable.get(drag.element)).toBeFalsy()
    expect(wrapper.findAll('[data-c-table-row-key]')).toHaveLength(0)
    await wrapper.setProps({ config: base })
    const next = await activeDrag(wrapper)
    expect(markedRows(next.element)).toHaveLength(2)
    wrapper.unmount()
    expect(Sortable.get(next.element)).toBeFalsy()
  })
})
