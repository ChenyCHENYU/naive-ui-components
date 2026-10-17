import { describe, expect, test, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { NDataTable, NPagination, type PaginationProps } from 'naive-ui'
import C_Table from '../../src/components/C_Table/index.vue'
import type {
  DataRecord,
  TableInstance,
} from '../../src/components/C_Table/types'
import type { UseRowDragOptions } from '../../src/components/C_Table/composables/useRowDrag'

const drag = vi.hoisted(() => ({
  options: undefined as UseRowDragOptions | undefined,
}))
vi.mock('../../src/components/C_Table/composables/useRowDrag', () => ({
  useRowDrag: (options: UseRowDragOptions) => {
    drag.options = options
    return {
      initRowDrag: () => undefined,
      destroyRowDrag: () => undefined,
      isDragging: { value: false },
    }
  },
}))

function moveDisplayedRow(from: number, to: number) {
  const options = drag.options!
  const next = [...options.data.value]
  const [row] = next.splice(from, 1)
  next.splice(to, 0, row)
  options.onReorder?.(next)
  options.onSort?.(row, from, to)
}

const data = [
  { id: 4, name: '4' },
  { id: 3, name: '3' },
  { id: 2, name: '2' },
  { id: 1, name: '1' },
]
const config = {
  toolbar: { show: false },
  pagination: { page: 1, pageSize: 2 },
}

describe('table sorting, filtering and pagination integration', () => {
  test('sorts before paging and computes the filtered total', async () => {
    const wrapper = mount(C_Table, {
      props: {
        data,
        columns: [
          {
            key: 'name',
            title: 'Name',
            sorter: 'default',
            defaultSortOrder: 'ascend',
            filter: 'default',
            filterOptions: [{ label: 'One', value: '1' }],
          },
        ],
        config,
      },
    })
    const rows = () => wrapper.findAll('tbody tr').map(row => row.text())
    await flushPromises()
    expect(rows()).toEqual(['1', '2'])
    wrapper.getComponent(NPagination).vm.$emit('update:page', 2)
    await flushPromises()
    expect(rows()).toEqual(['3', '4'])
    wrapper.getComponent(NDataTable).vm.$emit('update:filters', { name: ['1'] })
    await flushPromises()
    expect(rows()).toEqual(['1'])
    expect(wrapper.getComponent(NPagination).props('itemCount')).toBe(1)
    expect(wrapper.getComponent(NPagination).props('page')).toBe(1)
  })

  test('keeps server order and total in remote mode', async () => {
    const wrapper = mount(C_Table, {
      props: {
        data,
        columns: [
          {
            key: 'name',
            title: 'Name',
            sorter: 'default',
            defaultSortOrder: 'ascend',
            filter: 'default',
            filterOptionValue: 'missing',
          },
        ],
        config: {
          ...config,
          pagination: { page: 1, pageSize: 2, remote: true, total: 100 },
        },
      },
    })
    await flushPromises()
    expect(wrapper.getComponent(NDataTable).props('remote')).toBe(true)
    expect(wrapper.findAll('tbody tr').map(row => row.text())).toEqual([
      '4',
      '3',
      '2',
      '1',
    ])
    expect(wrapper.getComponent(NPagination).props('itemCount')).toBe(100)
  })

  test('native pagination owns exactly one pager without extra configuration', async () => {
    const wrapper = mount(C_Table, {
      props: {
        data,
        columns: [
          {
            key: 'name',
            title: 'Name',
            sorter: 'default',
            defaultSortOrder: 'ascend',
          },
        ],
        pagination: { page: 1, pageSize: 1 },
        config: { toolbar: { show: false } },
      },
    })
    await flushPromises()
    expect(wrapper.findAllComponents(NPagination)).toHaveLength(1)
    expect(wrapper.findAll('tbody tr').map(row => row.text())).toEqual(['1'])
  })

  test('native pagination methods follow uncontrolled page and page-size updates', async () => {
    const wrapper = mount(C_Table, {
      props: {
        data: Array.from({ length: 25 }, (_, index) => ({ id: index + 1 })),
        columns: [{ key: 'id', title: 'ID' }],
        pagination: {
          defaultPage: 2,
          defaultPageSize: 10,
          showSizePicker: true,
          pageSizes: [5, 10],
        },
        config: { toolbar: { show: false } },
      },
    })
    await flushPromises()
    const api = wrapper.vm as unknown as TableInstance
    const table = wrapper.getComponent(NDataTable)
    expect(api.getTotalPages()).toBe(3)
    api.resetToFirstPage()
    await flushPromises()
    expect(table.vm.getCurrentPageData()[0].id).toBe(1)
    wrapper.getComponent(NPagination).vm.$emit('update:pageSize', 5)
    await flushPromises()
    expect(table.vm.getCurrentPageData()).toHaveLength(5)
    expect(api.getTotalPages()).toBe(5)
  })

  test('native remote pagination respects server pageCount and controlled itemCount', async () => {
    const wrapper = mount(C_Table, {
      props: {
        data: [{ id: 1 }, { id: 2 }],
        columns: [{ key: 'id', title: 'ID' }],
        pagination: { page: 1, pageSize: 2, pageCount: 50 },
        remote: true,
        config: { toolbar: { show: false } },
      },
    })
    await flushPromises()
    const api = wrapper.vm as unknown as TableInstance
    expect(api.getTotalPages()).toBe(50)
    await wrapper.setProps({
      pagination: { page: 1, pageSize: 2, pageCount: 50, itemCount: 6 },
    })
    expect(api.getTotalPages()).toBe(3)
  })

  const pageSizeCases: [string, NonNullable<PaginationProps['pageSizes']>][] = [
    ['numeric', [5, 10]],
    [
      'object',
      [
        { label: 'Five', value: 5 },
        { label: 'Ten', value: 10 },
      ],
    ],
  ]
  test.each(pageSizeCases)(
    'native initial page size follows %s page-size options',
    async (_name, pageSizes) => {
      const wrapper = mount(C_Table, {
        props: {
          data: Array.from({ length: 25 }, (_, index) => ({ id: index + 1 })),
          columns: [{ key: 'id', title: 'ID' }],
          pagination: { showSizePicker: true, pageSizes },
          config: { toolbar: { show: false } },
        },
      })
      await flushPromises()
      expect(
        wrapper.getComponent(NDataTable).vm.getCurrentPageData()
      ).toHaveLength(5)
      expect((wrapper.vm as unknown as TableInstance).getTotalPages()).toBe(5)
    }
  )

  test('hidden columns release filtering both from props and column settings', async () => {
    const columns = [
      {
        key: 'name',
        title: 'Name',
        filter: 'default' as const,
        filterOptionValue: 'one',
      },
      { key: 'id', title: 'ID' },
    ]
    const wrapper = mount(C_Table, {
      props: {
        data: [
          { id: 1, name: 'one' },
          { id: 2, name: 'two' },
        ],
        columns,
        config: { pagination: false },
      },
    })
    await flushPromises()
    expect(wrapper.findAll('tbody tr')).toHaveLength(1)
    const hiddenColumns = columns.map(column => ({
      ...column,
      visible: column.key !== 'name',
    }))
    await wrapper.setProps({ columns: hiddenColumns })
    await flushPromises()
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
    await wrapper.setProps({ columns })
    await wrapper
      .get('.column-settings-btn[aria-label="mdi:cog"]')
      .trigger('click')
    await flushPromises()
    wrapper
      .getComponent({ name: 'ColumnSettings' })
      .vm.$emit('change', hiddenColumns)
    await flushPromises()
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
  })

  test('filtered row drag preserves hidden rows and reports source indexes', async () => {
    const source = [
      { id: 1, name: 'visible-a' },
      { id: 2, name: 'hidden' },
      { id: 3, name: 'visible-b' },
    ]
    const wrapper = mount(C_Table, {
      props: {
        data: source,
        columns: [
          {
            key: 'name',
            title: 'Name',
            filter: 'default',
            filterOptionValue: 'visible',
          },
        ],
        config: { toolbar: { show: false }, pagination: false, rowDrag: true },
      },
    })
    await flushPromises()
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
    moveDisplayedRow(0, 1)
    const update = wrapper.emitted('update:data')!.at(-1)![0] as DataRecord[]
    expect(update.map(row => row.id)).toEqual([3, 2, 1])
    expect(wrapper.emitted('row-move')!.at(-1)).toEqual([source[0], 0, 2])
    expect(source.map(row => row.id)).toEqual([1, 2, 3])
  })

  test('native page drag shares its displayed page with source updates and move events', async () => {
    const source = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]
    const wrapper = mount(C_Table, {
      props: {
        data: source,
        columns: [{ key: 'id', title: 'ID' }],
        pagination: { defaultPage: 2, pageSize: 2 },
        config: { toolbar: { show: false }, pagination: false, rowDrag: true },
      },
    })
    await flushPromises()
    expect(wrapper.findAll('tbody tr').map(row => row.text())).toEqual([
      '3',
      '4',
    ])
    moveDisplayedRow(0, 1)
    const update = wrapper.emitted('update:data')!.at(-1)![0] as DataRecord[]
    expect(update.map(row => row.id)).toEqual([1, 2, 4, 3])
    expect(wrapper.emitted('row-move')!.at(-1)).toEqual([source[2], 2, 3])
  })

  test('legacy Naive without public data getters drags only the uncontrolled second page', async () => {
    const source = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]
    const wrapper = mount(C_Table, {
      props: {
        data: source,
        columns: [{ key: 'id', title: 'ID' }],
        pagination: { defaultPage: 2, pageSize: 2 },
        config: { toolbar: { show: false }, pagination: false, rowDrag: true },
      },
    })
    const table = wrapper.getComponent(NDataTable)
    Reflect.set(table.vm, 'getCurrentPageData', undefined)
    Reflect.set(table.vm, 'getFilteredAndSortedData', undefined)
    await wrapper.setProps({ data: [...source] })
    await flushPromises()
    expect(table.vm.getCurrentPageData).toBeUndefined()
    expect(wrapper.findAll('tbody tr').map(row => row.text())).toEqual([
      '3',
      '4',
    ])
    expect(drag.options!.data.value.map(row => row.id)).toEqual([3, 4])
    moveDisplayedRow(0, 1)
    const update = wrapper.emitted('update:data')!.at(-1)![0] as DataRecord[]
    expect(update.map(row => row.id)).toEqual([1, 2, 4, 3])
    expect(wrapper.emitted('row-move')!.at(-1)).toEqual([source[2], 2, 3])
    expect(source.map(row => row.id)).toEqual([1, 2, 3, 4])
  })

  test('legacy Naive without public data getters follows UI filters, sorting, page size and reset', async () => {
    const source = [
      { id: 1, name: 'keep-a' },
      { id: 2, name: 'drop-a' },
      { id: 3, name: 'keep-b' },
      { id: 4, name: 'keep-c' },
      { id: 5, name: 'drop-b' },
      { id: 6, name: 'keep-d' },
    ]
    const wrapper = mount(C_Table, {
      props: {
        data: source,
        columns: [
          { key: 'name', title: 'Name', sorter: 'default', filter: 'default' },
        ],
        pagination: {
          defaultPage: 2,
          defaultPageSize: 2,
          showSizePicker: true,
          pageSizes: [1, 2],
        },
        config: { toolbar: { show: false }, rowDrag: true },
      },
    })
    const table = wrapper.getComponent(NDataTable)
    Reflect.set(table.vm, 'getCurrentPageData', undefined)
    Reflect.set(table.vm, 'getFilteredAndSortedData', undefined)
    await wrapper.setProps({ data: [...source] })
    await flushPromises()
    const api = wrapper.vm as unknown as TableInstance
    expect(api.getTotalPages()).toBe(3)
    table.vm.filter({ name: ['keep'] })
    // Native filter() is silent; normal filter-menu interaction also emits this event.
    table.vm.$emit('update:filters', { name: ['keep'] })
    await flushPromises()
    expect(wrapper.findAll('tbody tr').map(row => row.text())).toEqual([
      'keep-c',
      'keep-d',
    ])
    expect(drag.options!.data.value.map(row => row.id)).toEqual([4, 6])
    expect(api.getTotalPages()).toBe(2)
    api.resetToFirstPage()
    await flushPromises()
    expect(wrapper.findAll('tbody tr').map(row => row.text())).toEqual([
      'keep-a',
      'keep-b',
    ])
    expect(drag.options!.data.value.map(row => row.id)).toEqual([1, 3])
    wrapper.getComponent(NPagination).vm.$emit('update:pageSize', 1)
    await flushPromises()
    expect(api.getTotalPages()).toBe(4)
    table.vm.sort('name', 'descend')
    await flushPromises()
    expect(wrapper.findAll('tbody tr').map(row => row.text())).toEqual([
      'keep-d',
    ])
    expect(drag.options!.data.value.map(row => row.id)).toEqual([6])
  })
})
