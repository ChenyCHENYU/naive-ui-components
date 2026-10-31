/*
 * @Description: 表格状态展示及列拖拽的辅助列与会话隔离回归
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */
import { expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { NTag } from 'naive-ui'
import { h } from 'vue'
import Sortable, { type SortableEvent } from 'sortablejs'
import C_Table from '../../src/components/C_Table/index.vue'
import type {
  DataRecord,
  TableColumn,
} from '../../src/components/C_Table/types'

test('editable status cells share the read-only dictionary and status presentation', async () => {
  const wrapper = mount(C_Table<DataRecord>, {
    props: {
      data: [{ id: 1, state: 'S1C' }],
      columns: [
        {
          key: 'state',
          title: '状态',
          status: true,
          dictionary: { getOptions: () => [{ value: 'S1C', label: '已完成' }] },
        },
      ],
      config: { toolbar: { show: false }, pagination: false, edit: 'cell' },
    },
  })
  await flushPromises()
  expect(wrapper.getComponent(NTag).text()).toBe('已完成')
  expect(wrapper.getComponent(NTag).props('type')).toBe('success')
  expect(wrapper.find('.cell-edit-icon').exists()).toBe(true)
  await wrapper.setProps({
    columns: [
      {
        key: 'state',
        title: '状态',
        status: true,
        render: () => h('mark', '业务渲染'),
      },
    ],
  })
  expect(wrapper.findComponent(NTag).exists()).toBe(false)
  expect(wrapper.get('mark').text()).toBe('业务渲染')
})

test('auxiliary headers cannot start or receive a drag and error recovery reconnects the current header', async () => {
  const config = {
    toolbar: { show: false },
    pagination: false as const,
    columnDrag: true,
    actions: { detail: () => undefined },
  }
  const wrapper = mount(C_Table<DataRecord>, {
    props: {
      data: [{ id: 1, a: 'a', b: 'b' }],
      columns: [
        { type: 'selection' },
        { type: 'index' },
        { key: 'a', title: 'A' },
        { key: 'b', title: 'B' },
      ],
      config,
    },
  })
  await flushPromises()
  const header = wrapper.get('.n-data-table-thead tr').element as HTMLElement
  await vi.waitFor(() => expect(Sortable.get(header)).toBeTruthy())
  const sortable = Sortable.get(header)!
  const cells = [...header.children] as HTMLElement[]
  const filter = sortable.option('filter') as (
    event: Event,
    target: HTMLElement,
    instance: Sortable
  ) => boolean
  expect(cells).toHaveLength(5)
  expect(
    cells.map(cell => filter(new Event('mousedown'), cell, sortable))
  ).toEqual([true, true, false, false, true])
  const move = sortable.option('onMove')!
  expect(
    move(
      { related: cells[0], dragged: cells[2] } as never,
      new Event('mousemove')
    )
  ).toBe(false)
  expect(
    move(
      { related: cells[3], dragged: cells[2] } as never,
      new Event('mousemove')
    )
  ).toBe(true)
  await wrapper.setProps({ config: { ...config, error: { show: true } } })
  await flushPromises()
  expect(Sortable.get(header)).toBeFalsy()
  await wrapper.setProps({ config })
  await flushPromises()
  const current = wrapper.get('.n-data-table-thead tr').element as HTMLElement
  expect(current).not.toBe(header)
  await vi.waitFor(() => expect(Sortable.get(current)).toBeTruthy())
  wrapper.unmount()
  expect(Sortable.get(current)).toBeFalsy()
})

test('a replaced column configuration cancels the old gesture without rolling back the new header order', async () => {
  const wrapper = mount(C_Table<DataRecord>, {
    props: {
      data: [{ id: 1, a: 'a', b: 'b', c: 'c' }],
      columns: [
        { key: 'a', title: 'A' },
        { key: 'b', title: 'B' },
        { key: 'c', title: 'C' },
      ],
      config: { toolbar: { show: false }, pagination: false, columnDrag: true },
    },
  })
  await flushPromises()
  const header = wrapper.get('.n-data-table-thead tr').element as HTMLElement
  await vi.waitFor(() => expect(Sortable.get(header)).toBeTruthy())
  const sortable = Sortable.get(header)!
  const cells = [...header.children] as HTMLElement[]
  const event = {
    item: cells[2],
    from: header,
    to: header,
    oldIndex: 2,
    newIndex: 0,
  } as SortableEvent
  sortable.option('onStart')?.(event)
  header.insertBefore(event.item, cells[0])
  await wrapper.setProps({
    columns: [
      { key: 'b', title: 'B' },
      { key: 'c', title: 'C' },
      { key: 'a', title: 'A' },
    ],
  })
  const updated = [...header.children]
  sortable.option('onEnd')?.(event)
  expect([...header.children]).toEqual(updated)
  expect([...header.children].map(cell => cell.textContent)).toEqual([
    'B',
    'C',
    'A',
  ])
  expect(wrapper.emitted('column-change')).toBeUndefined()
})

test('dragging a business header cannot move an auxiliary column placed between business fields', async () => {
  const wrapper = mount(C_Table<DataRecord>, {
    props: {
      data: [{ id: 1, a: 'a', b: 'b' }],
      columns: [
        { key: 'a', title: 'A' },
        { type: 'selection' },
        { key: 'b', title: 'B' },
      ],
      config: { toolbar: { show: false }, pagination: false, columnDrag: true },
    },
  })
  await flushPromises()
  const header = wrapper.get('.n-data-table-thead tr').element as HTMLElement
  await vi.waitFor(() => expect(Sortable.get(header)).toBeTruthy())
  const sortable = Sortable.get(header)!
  const original = [...header.children] as HTMLElement[]
  const event = {
    item: original[2],
    from: header,
    to: header,
    oldIndex: 2,
    newIndex: 0,
  } as SortableEvent
  sortable.option('onStart')?.(event)
  expect(
    sortable.option('onMove')?.(
      { dragged: original[2], related: original[0] } as never,
      new Event('mousemove')
    )
  ).toBe(false)
  header.insertBefore(event.item, original[0])
  sortable.option('onEnd')?.(event)
  expect([...header.children]).toEqual(original)
  expect(wrapper.emitted('column-change')).toBeUndefined()
})

test('column drag keeps its instance for content updates and applies animation and handle changes', async () => {
  const config = {
    toolbar: { show: false },
    pagination: false as const,
    columnDrag: { animationDuration: 120 },
  }
  const wrapper = mount(C_Table<DataRecord>, {
    props: {
      data: [{ id: 1, name: '短' }],
      columns: [{ key: 'name', title: '名称' }],
      config,
    },
  })
  await flushPromises()
  const header = wrapper.get('.n-data-table-thead tr').element as HTMLElement
  await vi.waitFor(() => expect(Sortable.get(header)).toBeTruthy())
  const first = Sortable.get(header)!
  expect(first.option('animation')).toBe(120)
  await wrapper.setProps({
    data: [{ id: 1, name: '内容变化仅重新测量列宽，无需重建拖拽实例' }],
  })
  await flushPromises()
  expect(Sortable.get(header)).toBe(first)
  await wrapper.setProps({
    config: {
      ...config,
      columnDrag: {
        animationDuration: 240,
        handleClass: 'business-drag-handle',
      },
    },
  })
  await flushPromises()
  const updated = Sortable.get(header)!
  expect(updated).not.toBe(first)
  expect(updated.option('animation')).toBe(240)
  expect(updated.option('handle')).toBe('.business-drag-handle')
  await wrapper.setProps({ config: { ...config, columnDrag: false } })
  await flushPromises()
  expect(Sortable.get(header)).toBeFalsy()
})

test('unmount before queued column initialization leaves no sortable instance', async () => {
  const wrapper = mount(C_Table<DataRecord>, {
    props: {
      data: [{ id: 1 }],
      columns: [{ key: 'id', title: '编号' }],
      config: { toolbar: { show: false }, pagination: false, columnDrag: true },
    },
  })
  const header = wrapper.get('.n-data-table-thead tr').element as HTMLElement
  wrapper.unmount()
  await flushPromises()
  expect(Sortable.get(header)).toBeFalsy()
})

test('column drag maps actual headers to business columns and restores DOM before the Vue update', async () => {
  const columns: TableColumn[] = [
    { key: 'a', title: 'A' },
    { key: 'hidden', title: 'Hidden', visible: false },
    { key: 'b', title: 'B' },
    { key: 'c', title: 'C' },
  ]
  const wrapper = mount(C_Table<DataRecord>, {
    props: {
      data: [{ id: 1, a: 'a', b: 'b', c: 'c' }],
      columns,
      config: {
        toolbar: { show: false },
        pagination: false,
        columnDrag: true,
        dynamicRows: { enableRadioSelection: true, enablePrint: false },
      },
    },
  })
  await flushPromises()
  const header = wrapper.get('.n-data-table-thead tr').element as HTMLElement
  await vi.waitFor(() => expect(Sortable.get(header)).toBeTruthy())
  const sortable = Sortable.get(header)!
  const original = [...header.children] as HTMLElement[]
  expect(original.map(cell => cell.textContent)).toEqual([
    '选择',
    'A',
    'B',
    'C',
  ])
  const event = {
    item: original[3],
    from: header,
    to: header,
    oldIndex: 3,
    newIndex: 1,
  } as SortableEvent
  sortable.option('onStart')?.(event)
  header.insertBefore(event.item, original[1])
  sortable.option('onEnd')?.(event)
  expect([...header.children]).toEqual(original)
  const moved = wrapper.emitted('column-change')!.at(-1)![0] as TableColumn[]
  expect(moved.map(column => column.key)).toEqual(['c', 'a', 'hidden', 'b'])
  expect(columns.map(column => column.key)).toEqual(['a', 'hidden', 'b', 'c'])
  await flushPromises()
  expect(wrapper.findAll('thead th').map(cell => cell.text())).toEqual([
    '选择',
    'C',
    'A',
    'B',
  ])
})
