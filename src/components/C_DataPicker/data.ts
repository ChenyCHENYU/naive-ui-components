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
import { cloneData, isDataEqual } from '../../utils/data'
import type {
  DataPickerEmits,
  DataPickerProps,
  DataPickerRequest,
  DataPickerSourceInput,
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
  source: Pick<DataPickerSourceInput<T>, 'rowKey'>,
  row: T
): DataPickerValue {
  const key =
    typeof source.rowKey === 'function'
      ? source.rowKey(row)
      : row[source.rowKey]
  if (!isPickerValue(key))
    throw new TypeError('[C_DataPicker] rowKey 必须为字符串或有限数值')
  return key
}

function getPickerValue<T extends object>(
  source: Pick<DataPickerSourceInput<T>, 'rowKey' | 'value'>,
  row: T
): DataPickerValue {
  return source.value === undefined
    ? getPickerRowKey(source, row)
    : source.value(row)
}

function validatePickerBusinessValues<T extends object>(
  source: Pick<DataPickerSourceInput<T>, 'value'>,
  rows: readonly T[]
): void {
  // 默认业务值与行键相同，行键检查已验证类型、缺失与重复。
  if (source.value === undefined) return
  const values = new Set<DataPickerValue>()
  for (const row of rows) {
    const value = source.value(row)
    if (!isPickerValue(value) || values.has(value))
      throw new TypeError('[C_DataPicker] 业务值必须为唯一的字符串或有限数值')
    values.add(value)
  }
}

function validatePickerPage<T extends object>(
  source: Pick<DataPickerSourceInput<T>, 'rowKey' | 'value'>,
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
  validatePickerBusinessValues(source, result.rows)
}

/** 只复用 C_Table 的公开选择 API，不依赖内部行索引或 DOM。 */
export function useDataPicker<T extends object, TFilters extends object>(
  props: Readonly<DataPickerProps<T, TFilters>>,
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
  const queryState = shallowRef<{
    page: number
    search: string
    filters?: TFilters
    revision: number
  }>({ page: 1, search: '', revision: 0 })
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
  let filterBaseline = cloneData(props.initialValues)
  let restoringSelection = false
  let selectionRows: readonly T[] = []
  const rowValue = (row: T) => getPickerValue(props.source, row)

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
  watch(
    () => props.initialValues,
    value => {
      if (isDataEqual(filterBaseline, value)) return
      filterBaseline = cloneData(value)
      close()
    },
    { deep: true, flush: 'sync' }
  )

  const list = useDataResource({
    key: () =>
      opened.value
        ? JSON.stringify([
            sourceVersion.value,
            session.value,
            page.value,
            pageSize.value,
            queryState.value.revision,
          ])
        : null,
    load: async ({ signal }) => {
      const { source } = props
      const { filters } = queryState.value
      const query: DataPickerRequest<TFilters> = {
        page: page.value,
        pageSize: pageSize.value,
        search: search.value,
        signal,
        ...(filters === undefined ? {} : { filters: cloneData(filters) }),
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
      const rowsByValue = new Map<DataPickerValue, T>()
      for (const row of resolved) {
        const value = getPickerValue(source, row)
        if (requested.has(value)) rowsByValue.set(value, row)
      }
      return rowsByValue
    },
    isEmpty: result => result.size === 0,
  })
  const rows = computed(() => list.data.value?.rows ?? [])
  // 换页期间保留已知总数，旧页行数据仍由资源管理器清除。
  const total = shallowRef<number | null>(null)
  watch(list.data, result => {
    if (!opened.value || !result) return
    total.value = result.total
    const lastPage = Math.max(1, Math.ceil(result.total / pageSize.value))
    if (page.value > lastPage) page.value = lastPage
  })
  const knownRows = computed(() => {
    const known = new Map(committedRows.value)
    for (const [value, row] of labels.data.value ?? []) known.set(value, row)
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
  const canConfirm = computed(
    () => !blocked.value && (!props.requireSelection || selectedCount.value > 0)
  )
  const selected = computed(() =>
    draft.value.slice(0, 30).map(value => {
      const row = draftRows.value.get(value)
      return { value, label: row ? props.source.label(row) : String(value) }
    })
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
    total.value = null
    draft.value = []
    draftRows.value = new Map()
  }

  // 缓存页面切离时丢弃未确认会话，避免 Teleport 弹窗覆盖新页面。
  onDeactivated(close)

  function open(): void {
    if (blocked.value || opened.value) return
    draft.value = [...values.value]
    draftRows.value = new Map(knownRows.value)
    queryState.value = {
      page: 1,
      search: '',
      filters: cloneData(filterBaseline),
      revision: 0,
    }
    searchDraft.value = ''
    session.value++
    opened.value = true
  }

  function confirm(): void {
    if (!canConfirm.value || !opened.value) return
    const chosen = [...draft.value]
    const resolved = new Map<DataPickerValue, T>()
    for (const value of chosen) {
      const row = draftRows.value.get(value)
      if (row) resolved.set(value, row)
    }
    committedRows.value = resolved
    close()
    emit('update:modelValue', props.multiple ? chosen : (chosen[0] ?? null))
    emit('select', [...resolved.values()])
  }

  function clear(): void {
    if (blocked.value || !props.clearable) return
    emit('update:modelValue', props.multiple ? [] : null)
    emit('select', [])
  }

  function selectPage(_keys: DataTableRowKey[], selectedRows: T[]): void {
    if (restoringSelection || !opened.value || selectionRows !== rows.value)
      return
    let nextValues: DataPickerValue[] = []
    if (props.multiple) {
      // 只替换当前页的选择，保留其他页的草稿。
      const currentPage = new Set(rows.value.map(rowValue))
      nextValues = draft.value.filter(value => !currentPage.has(value))
    }
    const next = props.multiple ? selectedRows : selectedRows.slice(-1)
    const rowsByValue = new Map(draftRows.value)
    for (const row of next) {
      const value = rowValue(row)
      rowsByValue.set(value, row)
      nextValues.push(value)
    }
    draftRows.value = rowsByValue
    draft.value = nextValues
  }

  function remove(value: DataPickerValue): void {
    draft.value = draft.value.filter(item => item !== value)
  }

  function restoreSelection(): void {
    if (!opened.value || !table.value) return
    restoringSelection = true
    try {
      selectionRows = rows.value
      const known = new Map(draftRows.value)
      table.value.clearSelection()
      for (const row of rows.value) {
        const value = rowValue(row)
        if (draft.value.includes(value)) {
          known.set(value, row)
          table.value.selectRow(
            props.source.value === undefined
              ? value
              : getPickerRowKey(props.source, row)
          )
        }
      }
      draftRows.value = known
    } finally {
      restoringSelection = false
    }
  }

  function query(): void {
    applyQuery(searchDraft.value, queryState.value.filters)
  }

  function submitFilters(filters: TFilters): void {
    applyQuery('', filters)
  }

  function applyQuery(search: string, filters: TFilters | undefined): void {
    if (!opened.value || blocked.value) return
    const previous = queryState.value
    const sameQuery =
      previous.search === search && isDataEqual(previous.filters, filters)
    if (previous.page === 1 && sameQuery) {
      void list.reload()
      return
    }
    if (!sameQuery) total.value = null
    queryState.value = {
      page: 1,
      search,
      filters: cloneData(filters),
      revision: previous.revision + 1,
    }
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
    submitFilters,
    list,
    labels,
    rows,
    total,
    display,
    selected,
    selectedCount,
    canConfirm,
    columns,
    tableConfig,
    selectPage,
    remove,
  }
}
