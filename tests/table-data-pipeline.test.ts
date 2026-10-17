import { describe, expect, test } from 'bun:test'
import { ref } from 'vue'
import { useTableDataPipeline } from '../src/components/C_Table/composables/useTableDataPipeline'
import type { TableColumn } from '../src/components/C_Table/types'

describe('table local/remote data ownership', () => {
  test('keeps the source reference and skips row traversal without active transforms', () => {
    let rowReads = 0
    const data = new Proxy([{ id: 2 }, { id: 1 }], {
      get(target, property, receiver) {
        if (typeof property === 'string' && /^\d+$/.test(property)) rowReads++
        return Reflect.get(target, property, receiver)
      },
    })
    const pipeline = useTableDataPipeline({
      data,
      remote: false,
      columns: [
        { key: 'id', title: 'ID', sorter: 'default' },
        { key: 'label', title: 'Label', filter: 'default' },
      ],
    })
    expect(pipeline.processedData.value).toBe(data)
    expect(rowReads).toBe(0)
    pipeline.setFilters({ label: [] })
    pipeline.setSorter(null)
    expect(pipeline.processedData.value).toBe(data)
    expect(rowReads).toBe(0)
  })

  test('only visible columns own local sorting and filtering', () => {
    const data = [{ id: 2 }, { id: 1 }]
    const columns = ref<TableColumn[]>([
      {
        key: 'id',
        title: 'ID',
        visible: false,
        sorter: 'default',
        sortOrder: 'ascend',
        filter: 'default',
        filterOptionValue: 1,
      },
    ])
    const pipeline = useTableDataPipeline({ data, columns, remote: false })
    expect(pipeline.processedData.value).toBe(data)
    columns.value[0].visible = true
    expect(pipeline.processedData.value).toEqual([{ id: 1 }])
  })

  test('sorts and filters the full source without mutating it', () => {
    const data = ref([{ id: 4 }, { id: 3 }, { id: 2 }, { id: 1 }])
    const pipeline = useTableDataPipeline({
      data,
      remote: false,
      columns: [
        {
          key: 'id',
          title: 'ID',
          sorter: 'default',
          defaultSortOrder: 'ascend',
          filter: (value, row) => row.id === value,
        },
      ],
    })
    expect(pipeline.processedData.value.map(row => row.id)).toEqual([
      1, 2, 3, 4,
    ])
    expect(data.value.map(row => row.id)).toEqual([4, 3, 2, 1])
    pipeline.setFilters({ id: [1] })
    expect(pipeline.processedData.value).toEqual([{ id: 1 }])
    pipeline.setFilters({})
    pipeline.setSorter({ columnKey: 'id', sorter: 'default', order: 'descend' })
    expect(pipeline.processedData.value.map(row => row.id)).toEqual([
      4, 3, 2, 1,
    ])
  })

  test('honors controlled sort/filter columns including falsy values', () => {
    const columns = ref<TableColumn[]>([
      {
        key: 'id',
        title: 'ID',
        sorter: 'default',
        sortOrder: 'ascend',
        filter: 'default',
        filterOptionValue: 0,
      },
    ])
    const pipeline = useTableDataPipeline({
      data: [{ id: 20 }, { id: 0 }, { id: 1 }],
      columns,
      remote: false,
    })
    pipeline.setFilters({ id: [1] })
    expect(pipeline.processedData.value.map(row => row.id)).toEqual([0, 20])
    columns.value = [
      { key: 'id', title: 'ID', sorter: 'default', sortOrder: false },
    ]
    pipeline.setSorter({ columnKey: 'id', sorter: 'default', order: 'ascend' })
    pipeline.setFilters({})
    expect(pipeline.processedData.value.map(row => row.id)).toEqual([20, 0, 1])
  })

  test('passes remote results through unchanged', () => {
    const data = [{ id: 2 }, { id: 1 }]
    const pipeline = useTableDataPipeline({
      data,
      remote: true,
      columns: [
        {
          key: 'id',
          title: 'ID',
          sorter: 'default',
          defaultSortOrder: 'ascend',
          filter: 'default',
          filterOptionValue: 'missing',
        },
      ],
    })
    expect(pipeline.processedData.value).toBe(data)
  })
})
