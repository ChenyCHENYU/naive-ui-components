/** 远程实体选择会话：分页请求和回显分别拥有资源，本地草稿只在确认时提交。 */
import {
  computed,
  nextTick,
  onDeactivated,
  shallowRef,
  watch,
  type Ref,
} from 'vue'
import type { DataTableRowKey } from 'naive-ui'
import { useDataResource } from '../../composables/useDataResource'
import type { TableInstance, TableConfig } from '../C_Table'
import { validateTableRowKeys } from '../C_Table/helpers'
import type {
  DataPickerEmits,
  DataPickerProps,
  DataPickerSource,
  DataPickerValue,
} from './types'
import type { ComponentDensity } from '../../core/density'

function normalizeValues(
  value: DataPickerProps<object>['modelValue']
): DataPickerValue[] {
  if (value == null) return []
  return [...new Set(Array.isArray(value) ? value : [value as DataPickerValue])]
}

function isPickerValue(value: unknown): value is DataPickerValue {
  return (
    typeof value === 'string' ||
    (typeof value === 'number' && Number.isFinite(value))
  )
}

function getPickerRowKey<T extends object>(
  source: DataPickerSource<T>,
  row: T
): DataTableRowKey {
  const key =
    typeof source.rowKey === 'function'
      ? source.rowKey(row)
      : row[source.rowKey]
  if (!isPickerValue(key))
    throw new TypeError('[C_DataPicker] rowKey 必须为字符串或有限数值')
  return key
}

function validatePickerPage<T extends object>(
  source: DataPickerSource<T>,
  result: { rows: T[]; total: number },
  pageSize: number
): void {
  if (
    !Array.isArray(result.rows) ||
    !Number.isSafeInteger(result.total) ||
    result.total < 0
  ) {
    throw new TypeError(
      '[C_DataPicker] request 必须返回 rows 数组和非负安全整数 total'
    )
  }
  if (result.rows.length > pageSize || result.rows.length > result.total) {
    throw new TypeError('[C_DataPicker] rows 超过请求的分页或 total 范围')
  }
  if (
    validateTableRowKeys(result.rows, row => getPickerRowKey(source, row))
      .length
  ) {
    throw new TypeError('[C_DataPicker] rowKey 不得缺失或重复')
  }
  const values = new Set<DataPickerValue>()
  for (const row of result.rows) {
    const value = source.value(row)
    if (!isPickerValue(value) || values.has(value))
      throw new TypeError('[C_DataPicker] 业务值必须为唯一的字符串或有限数值')
    values.add(value)
  }
}

/** 只复用 C_Table 的公开选择 API，不依赖内部行索引或 DOM。 */
export function useDataPicker<T extends object>(
  props: Readonly<DataPickerProps<T>>,
  emit: {
    <E extends keyof DataPickerEmits<T>>(
      event: E,
      ...args: DataPickerEmits<T>[E]
    ): void
  },
  table: Ref<TableInstance<T> | null>,
  density: () => ComponentDensity
) {
  const opened = shallowRef(false)
  const queryState = shallowRef({ page: 1, search: '' })
  const page = computed({
    get: () => queryState.value.page,
    set: value => {
      queryState.value = { ...queryState.value, page: value }
    },
  })
  const searchDraft = shallowRef('')
  const search = computed(() => queryState.value.search)
  const sourceVersion = shallowRef(0)
  const session = shallowRef(0)
  const draft = shallowRef<DataPickerValue[]>([])
  const draftRows = shallowRef(new Map<DataPickerValue, T>())
  const committedRows = shallowRef(new Map<DataPickerValue, T>())
  const values = computed(() => {
    const selected = normalizeValues(props.modelValue)
    return props.multiple ? selected : selected.slice(0, 1)
  })
  const pageSize = computed(() =>
    Number.isFinite(props.pageSize) && props.pageSize! > 0
      ? Math.max(1, Math.trunc(props.pageSize!))
      : 20
  )
  const blocked = computed(() => props.disabled || props.readonly)
  let restoringSelection = false
  let selectionRows: readonly T[] = []

  // 先失效会话，再由资源观察器读取新源，避免一次源替换发起两次回显请求。
  watch(
    () =>
      [
        props.source,
        props.source.request,
        props.source.resolve,
        props.source.rowKey,
        props.source.value,
      ] as const,
    () => {
      close()
      committedRows.value = new Map()
      sourceVersion.value++
    },
    { flush: 'sync' }
  )

  const list = useDataResource({
    key: () =>
      opened.value
        ? JSON.stringify([
            sourceVersion.value,
            session.value,
            page.value,
            pageSize.value,
            search.value,
          ])
        : null,
    load: async ({ signal }) => {
      const { source } = props
      const query = {
        page: page.value,
        pageSize: pageSize.value,
        search: search.value,
        signal,
      }
      const result = await source.request(query)
      validatePickerPage(source, result, query.pageSize)
      return { rows: [...result.rows], total: result.total }
    },
    isEmpty: result => result.rows.length === 0,
  })
  const labels = useDataResource({
    key: () =>
      props.source.resolve && values.value.length
        ? JSON.stringify([sourceVersion.value, values.value])
        : null,
    load: async ({ signal }) => {
      const { source } = props
      const selected = [...values.value]
      const resolved = await source.resolve!(selected, signal)
      if (!Array.isArray(resolved))
        throw new TypeError('[C_DataPicker] resolve 必须返回行数组')
      const requested = new Set(selected)
      return resolved.filter(row => requested.has(source.value(row)))
    },
  })
  const rows = computed(() => list.data.value?.rows ?? [])
  const total = computed(() => list.data.value?.total ?? 0)
  const knownRows = computed(() => {
    const known = new Map(committedRows.value)
    for (const row of labels.data.value ?? [])
      known.set(props.source.value(row), row)
    return known
  })
  const display = computed(() =>
    values.value
      .map(value => {
        const row = knownRows.value.get(value)
        return row ? props.source.label(row) : String(value)
      })
      .join('、')
  )
  const selectedCount = computed(() => draft.value.length)
  const selected = computed(() =>
    draft.value.slice(0, 30).map(value => ({
      value,
      label: draftRows.value.has(value)
        ? props.source.label(draftRows.value.get(value)!)
        : String(value),
    }))
  )
  const columns = computed(() => [
    { type: 'selection' as const, multiple: props.multiple },
    ...props.columns.filter(column => column.type !== 'selection'),
  ])
  const tableConfig = computed<TableConfig<T>>(() => ({
    density: density(),
    locale: props.locale,
    toolbar: { show: false },
    pagination: false,
    selection: { enabled: true, maxSelection: props.multiple ? undefined : 1 },
    virtualScroll: { enabled: true, maxHeight: 360 },
  }))

  function close(): void {
    opened.value = false
    draft.value = []
    draftRows.value = new Map()
  }

  // 缓存页面切离时丢弃未确认会话，避免 Teleport 弹窗覆盖新页面。
  onDeactivated(close)

  function open(): void {
    if (blocked.value || opened.value) return
    draft.value = [...values.value]
    draftRows.value = new Map(knownRows.value)
    queryState.value = { page: 1, search: '' }
    searchDraft.value = ''
    session.value++
    opened.value = true
  }

  function confirm(): void {
    if (blocked.value || !opened.value) return
    const chosen = [...draft.value]
    const chosenRows = chosen.flatMap(value =>
      draftRows.value.has(value) ? [draftRows.value.get(value)!] : []
    )
    committedRows.value = new Map(
      chosenRows.map(row => [props.source.value(row), row])
    )
    close()
    emit('update:modelValue', props.multiple ? chosen : (chosen[0] ?? null))
    emit('select', chosenRows)
  }

  function clear(): void {
    if (blocked.value || !props.clearable) return
    emit('update:modelValue', props.multiple ? [] : null)
    emit('select', [])
  }

  function selectPage(_keys: DataTableRowKey[], selectedRows: T[]): void {
    if (restoringSelection || !opened.value || selectionRows !== rows.value)
      return
    const currentPage = new Set(rows.value.map(row => props.source.value(row)))
    const previous = props.multiple
      ? draft.value.filter(value => !currentPage.has(value))
      : []
    const next = props.multiple ? selectedRows : selectedRows.slice(-1)
    const rowMap = new Map(draftRows.value)
    for (const row of next) rowMap.set(props.source.value(row), row)
    draftRows.value = rowMap
    draft.value = [...previous, ...next.map(row => props.source.value(row))]
  }

  function remove(value: DataPickerValue): void {
    draft.value = draft.value.filter(item => item !== value)
  }

  function rowKey(row: T): DataTableRowKey {
    return getPickerRowKey(props.source, row)
  }

  function restoreSelection(): void {
    if (!opened.value || !table.value) return
    restoringSelection = true
    try {
      selectionRows = rows.value
      const known = new Map(draftRows.value)
      table.value.clearSelection()
      for (const row of rows.value)
        if (draft.value.includes(props.source.value(row))) {
          known.set(props.source.value(row), row)
          table.value.selectRow(rowKey(row))
        }
      draftRows.value = known
    } finally {
      restoringSelection = false
    }
  }

  function query(): void {
    const changed = search.value !== searchDraft.value || page.value !== 1
    queryState.value = { page: 1, search: searchDraft.value }
    if (!changed) void list.reload()
  }

  watch(
    [rows, draft],
    () => {
      void nextTick(restoreSelection)
    },
    { flush: 'post' }
  )
  watch(
    () =>
      [
        props.modelValue,
        props.multiple,
        props.disabled,
        props.readonly,
      ] as const,
    close,
    { deep: true, flush: 'sync' }
  )
  return {
    opened,
    open,
    close,
    confirm,
    clear,
    page,
    pageSize,
    searchDraft,
    query,
    list,
    labels,
    rows,
    total,
    display,
    selected,
    selectedCount,
    columns,
    tableConfig,
    selectPage,
    remove,
  }
}
