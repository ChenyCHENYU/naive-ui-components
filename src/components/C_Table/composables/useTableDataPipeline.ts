import { computed, shallowRef, toValue, type MaybeRefOrGetter } from 'vue'
import type {
  DataTableBaseColumn,
  DataTableFilterState,
  DataTableSortState,
} from 'naive-ui'
import type { DataRecord, TableColumn } from '../types'

type SortState = DataTableSortState | DataTableSortState[] | null
type DataColumn = DataTableBaseColumn<DataRecord>

function dataColumns(columns: readonly TableColumn[]): DataColumn[] {
  return columns.flatMap(column => {
    if (column.visible === false) return []
    if ('children' in column && Array.isArray(column.children)) {
      return dataColumns(column.children as TableColumn[])
    }
    return 'type' in column && column.type ? [] : [column as DataColumn]
  })
}

function defaultCompare(left: unknown, right: unknown): number {
  if (left == null) return right == null ? 0 : -1
  if (right == null) return 1
  if (typeof left === 'number' && typeof right === 'number') return left - right
  if (typeof left === 'string' && typeof right === 'string') {
    return left.localeCompare(right)
  }
  return 0
}

function compareRows(column: DataColumn, left: DataRecord, right: DataRecord) {
  const { sorter } = column
  if (typeof sorter === 'function') return sorter(left, right)
  if (
    sorter &&
    typeof sorter === 'object' &&
    typeof sorter.compare === 'function'
  ) {
    return sorter.compare(left, right)
  }
  if (
    sorter === 'default' ||
    (typeof sorter === 'object' && sorter.compare === 'default')
  ) {
    return defaultCompare(left[column.key], right[column.key])
  }
  return 0
}

function matchesFilter(
  column: DataColumn,
  value: DataTableFilterState[string],
  row: DataRecord
): boolean {
  const selected = Array.isArray(value) ? value : [value]
  if (value == null || selected.length === 0) return true
  const { filter } = column
  const match = (item: (typeof selected)[number]) => {
    if (item == null) return true
    if (typeof filter === 'function') return filter(item, row)
    return filter === 'default'
      ? String(row[column.key]).includes(String(item))
      : true
  }
  return column.filterMode === 'and'
    ? selected.every(match)
    : selected.some(match)
}

function filterValue(column: DataColumn, state: DataTableFilterState) {
  if (column.filterOptionValues !== undefined) return column.filterOptionValues
  if (column.filterOptionValue !== undefined) return column.filterOptionValue
  if (Object.prototype.hasOwnProperty.call(state, column.key))
    return state[column.key]
  return column.defaultFilterOptionValues ?? column.defaultFilterOptionValue
}

/** Local transforms precede pagination; remote results remain server-owned. */
export function useTableDataPipeline(options: {
  data: MaybeRefOrGetter<DataRecord[]>
  columns: MaybeRefOrGetter<TableColumn[]>
  remote: MaybeRefOrGetter<boolean>
}) {
  const sorter = shallowRef<SortState>()
  const filters = shallowRef<DataTableFilterState>({})
  const columns = computed(() => dataColumns(toValue(options.columns)))
  const activeFilters = computed(() =>
    columns.value.flatMap(column => {
      if (column.filter !== 'default' && typeof column.filter !== 'function')
        return []
      const value = filterValue(column, filters.value)
      if (value == null || (Array.isArray(value) && value.length === 0))
        return []
      return [{ column, value }]
    })
  )
  const filteredData = computed(() => {
    const source = toValue(options.data)
    if (toValue(options.remote)) return source
    const tasks = activeFilters.value
    if (!tasks.length) return source
    return source.filter(row =>
      tasks.every(({ column, value }) => matchesFilter(column, value, row))
    )
  })

  const activeSorters = computed(() => {
    const controlled = columns.value.filter(
      column =>
        column.sortOrder === false ||
        column.sortOrder === 'ascend' ||
        column.sortOrder === 'descend'
    )
    if (controlled.length) {
      return controlled.map(column => ({
        columnKey: column.key,
        order: column.sortOrder,
      }))
    }
    if (sorter.value !== undefined) {
      return sorter.value
        ? Array.isArray(sorter.value)
          ? sorter.value
          : [sorter.value]
        : []
    }
    return columns.value.map(column => ({
      columnKey: column.key,
      order: column.defaultSortOrder,
    }))
  })

  const processedData = computed(() => {
    if (toValue(options.remote)) return toValue(options.data)
    const tasks = activeSorters.value
      .flatMap(state => {
        const column = columns.value.find(item => item.key === state.columnKey)
        if (!column?.sorter || !state.order) return []
        const priority =
          typeof column.sorter === 'object' ? (column.sorter.multiple ?? 0) : 0
        return [
          { column, direction: state.order === 'ascend' ? 1 : -1, priority },
        ]
      })
      .sort((left, right) => right.priority - left.priority)
    if (!tasks.length) return filteredData.value
    return filteredData.value.slice().sort((left, right) => {
      for (const task of tasks) {
        const result = compareRows(task.column, left, right) * task.direction
        if (result) return result
      }
      return 0
    })
  })

  return {
    processedData,
    setSorter: (value: SortState) => {
      sorter.value = value
    },
    setFilters: (value: DataTableFilterState) => {
      filters.value = { ...value }
    },
  }
}
