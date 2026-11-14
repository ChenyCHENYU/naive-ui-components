/** 远程实体选择会话：分页请求和回显分别拥有资源，本地草稿只在确认时提交。 */
import {
  computed,
  nextTick,
  onDeactivated,
  onScopeDispose,
  shallowRef,
  watch,
  type Ref,
} from 'vue'
import type { DataTableRowKey } from 'naive-ui'
import { useDataResource } from '../../composables/useDataResource'
import type { TableInstance, TableConfig } from '../C_Table'
import { cloneData, isDataEqual } from '../../utils/data'
import type {
  DataPickerEmits,
  DataPickerProps,
  DataPickerRequest,
  DataPickerValue,
} from './types'
import { getPickerRowKey, getPickerValue, validatePickerPage } from './source'
export { isPickerValue } from './source'
import { usePickerHistory } from './usePickerHistory'
import { usePickerResolver } from './usePickerResolver'
import type { ComponentDensity } from '../../core/density'

function normalizeValues(
  value: DataPickerProps<object>['modelValue']
): DataPickerValue[] {
  if (value == null) return []
  return [...new Set(Array.isArray(value) ? value : [value as DataPickerValue])]
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
  density: () => ComponentDensity,
  quickMode: () => boolean = () => false
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
  const searchOptions = computed(() => {
    const { debounce, minChars } = props.source
    return {
      debounce:
        debounce !== undefined &&
        Number.isSafeInteger(debounce) &&
        debounce >= 0
          ? debounce
          : 250,
      minChars:
        minChars !== undefined &&
        Number.isSafeInteger(minChars) &&
        minChars >= 0
          ? minChars
          : 0,
    }
  })
  const sourceVersion = shallowRef(0)
  const session = shallowRef(0)
  const draft = shallowRef(new Map<DataPickerValue, T | undefined>())
  const committedRows = shallowRef(
    new Map<DataPickerValue, { row: T; fromPage: boolean }>()
  )
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
  const maximum = computed(() => {
    if (!props.multiple) return 1
    const max = props.maxSelection
    return max !== undefined && Number.isFinite(max) && max >= 1
      ? Math.trunc(max)
      : Infinity
  })
  const history = usePickerHistory(props)
  const resolver = usePickerResolver(props)
  const { pending: confirming, error: selectionError } = resolver
  let filterBaseline = cloneData(props.initialValues)
  let fixedBaseline = cloneData(props.fixedFilters)
  let restoringSelection = false
  let selectionPage: { table: TableInstance<T>; rows: readonly T[] } | undefined
  const rowValue = (row: T) => getPickerValue(props.source, row)
  const checkable = (row: T) =>
    props.rowCheckable?.(row) !== false && !props.disabledReason?.(row)
  const hasCapacity = (value: DataPickerValue) =>
    !props.multiple ||
    draft.value.has(value) ||
    draft.value.size < maximum.value
  const requestFilters = (filters: TFilters | undefined) =>
    props.fixedFilters === undefined
      ? cloneData(filters)
      : { ...cloneData(filters), ...cloneData(props.fixedFilters) }
  const invalidateSource = () => {
    close()
    committedRows.value = new Map()
    sourceVersion.value++
  }

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
    invalidateSource,
    { flush: 'sync' }
  )
  watch(
    () => props.fixedFilters,
    value => {
      if (isDataEqual(fixedBaseline, value)) return
      fixedBaseline = cloneData(value)
      invalidateSource()
    },
    { deep: true, flush: 'sync' }
  )
  watch(() => props.history?.scope, invalidateSource, { flush: 'sync' })
  watch(() => props.scope, invalidateSource, { flush: 'sync' })
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
      opened.value &&
      (!quickMode() ||
        (searchDraft.value === search.value &&
          searchDraft.value.length >= searchOptions.value.minChars))
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
      const mergedFilters = requestFilters(filters)
      const query: DataPickerRequest<TFilters> = {
        page: page.value,
        pageSize: pageSize.value,
        search: search.value,
        signal,
        ...(props.scope === undefined ? {} : { scope: props.scope }),
        ...(mergedFilters === undefined ? {} : { filters: mergedFilters }),
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
      const resolved =
        props.scope === undefined
          ? await source.resolve!(selected, signal)
          : await source.resolve!(selected, signal, { scope: props.scope })
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
  const emptyRows: T[] = []
  const rows = computed(() => list.data.value?.rows ?? emptyRows)
  // 换页期间保留已知总数，旧页行数据仍由资源管理器清除。
  const total = shallowRef<number | null>(null)
  watch(list.data, result => {
    if (!opened.value || !result) return
    total.value = result.total
    const lastPage = Math.max(1, Math.ceil(result.total / pageSize.value))
    if (page.value > lastPage) page.value = lastPage
  })
  function knownRow(value: DataPickerValue): T | undefined {
    const committed = committedRows.value.get(value)
    // 用户确认过的候选行优先。仅来自回显的缓存仍可被新回显补全或更新。
    return committed?.fromPage
      ? committed.row
      : (labels.data.value?.get(value) ?? committed?.row)
  }
  const display = computed(() =>
    values.value
      .map(value => {
        const row = knownRow(value)
        return row ? props.source.label(row) : String(value)
      })
      .join('、')
  )
  const selectedCount = computed(() => draft.value.size)
  const canConfirm = computed(
    () =>
      !blocked.value &&
      !confirming.value &&
      selectedCount.value <= maximum.value &&
      (!props.requireSelection || selectedCount.value > 0) &&
      (!(props.rowCheckable || props.disabledReason) ||
        [...draft.value.keys()].every(value => {
          const row = resolveDraftRow(value)
          return row !== undefined && checkable(row)
        }))
  )
  const selectedItems = computed(() => {
    const visible: Array<{
      value: DataPickerValue
      label: string
      row: T | undefined
    }> = []
    for (const value of draft.value.keys()) {
      const row = resolveDraftRow(value)
      visible.push({
        value,
        label: row ? props.source.label(row) : String(value),
        row,
      })
    }
    return visible
  })
  const selected = computed(() => selectedItems.value.slice(0, 30))
  const columns = computed(() => [
    { type: 'selection' as const, multiple: props.multiple },
    ...props.columns.filter(column => column.type !== 'selection'),
  ])
  const tableConfig = computed<TableConfig<T>>(() => ({
    density: density(),
    locale: props.locale,
    toolbar: { show: false },
    pagination: false,
    selection: {
      enabled: true,
      maxSelection: Number.isFinite(maximum.value) ? maximum.value : undefined,
      rowCheckable: row =>
        !confirming.value && checkable(row) && hasCapacity(rowValue(row)),
    },
    virtualScroll: { enabled: true, maxHeight: 360 },
  }))

  function close(): void {
    opened.value = false
    total.value = null
    draft.value = new Map()
    selectionPage = undefined
    resolver.abort()
  }

  // 缓存页面切离时丢弃未确认会话，避免 Teleport 弹窗覆盖新页面。
  onDeactivated(close)
  onScopeDispose(close)

  function open(): void {
    if (blocked.value || opened.value) return
    draft.value = new Map(values.value.map(value => [value, undefined]))
    queryState.value = {
      page: 1,
      search: '',
      filters: requestFilters(filterBaseline),
      revision: 0,
    }
    searchDraft.value = ''
    session.value++
    opened.value = true
  }

  /** 迟到的回显只补全已选值对应的行，当前会话内看到的候选数据优先。 */
  function resolveDraftRow(value: DataPickerValue): T | undefined {
    return draft.value.get(value) ?? knownRow(value)
  }

  const confirmationRequired = computed(() =>
    Boolean(
      props.source.resolve &&
      (props.rowCheckable ||
        props.disabledReason ||
        props.revalidateOnConfirm ||
        history.enabled.value ||
        props.presentation === 'popover')
    )
  )

  async function confirm(): Promise<boolean> {
    if (!canConfirm.value || !opened.value) return false
    const chosen = [...draft.value.keys()]
    const currentSession = session.value
    const validate = confirmationRequired.value
    const resolvedRows = validate ? await resolver.resolve(chosen) : undefined
    if (validate && !resolvedRows) return false
    if (!opened.value || session.value !== currentSession || !canConfirm.value)
      return false
    completeSelection(chosen, resolvedRows)
    return true
  }

  function completeSelection(
    chosen: DataPickerValue[],
    resolvedRows?: Map<DataPickerValue, T>
  ): void {
    const { source } = props
    const committed = new Map<DataPickerValue, { row: T; fromPage: boolean }>()
    const resolved: T[] = []
    for (const value of chosen) {
      const row = resolvedRows?.get(value) ?? resolveDraftRow(value)
      if (!row) continue
      committed.set(value, {
        row,
        fromPage:
          draft.value.get(value) !== undefined ||
          committedRows.value.get(value)?.fromPage === true,
      })
      resolved.push(row)
    }
    committedRows.value = committed
    history.remember(
      resolved.map(row => ({ value: rowValue(row), label: source.label(row) }))
    )
    close()
    emit('update:modelValue', props.multiple ? chosen : (chosen[0] ?? null))
    emit('select', resolved)
  }

  function clear(): void {
    if (blocked.value || !props.clearable) return
    emit('update:modelValue', props.multiple ? [] : null)
    emit('select', [])
  }

  /** 只操作完成回填的表格实例，忽略换页和异步重挂载中的通知。 */
  function currentSelectionTable(): TableInstance<T> | undefined {
    if (
      selectionPage?.rows === rows.value &&
      selectionPage.table === table.value
    )
      return selectionPage.table
  }

  function selectPage(_keys: DataTableRowKey[], selectedRows: T[]): void {
    if (
      restoringSelection ||
      confirming.value ||
      !opened.value ||
      !currentSelectionTable()
    )
      return
    const nextDraft = mergePageSelection(selectedRows)
    draft.value = nextDraft
    const expected = rows.value.filter(row => nextDraft.has(rowValue(row)))
    if (
      selectedRows.length !== expected.length ||
      selectedRows.some(row => !nextDraft.has(rowValue(row)))
    )
      void nextTick(restoreSelection)
  }

  function mergePageSelection(
    selectedRows: T[]
  ): Map<DataPickerValue, T | undefined> {
    const currentPage = new Set(rows.value.map(rowValue))
    const selectedValues = new Set(selectedRows.map(rowValue))
    // 保留仍被勾选的旧值及其插入顺序，换页/重绘不能改写顺序审批名单。
    const nextDraft = new Map(
      props.multiple
        ? [...draft.value].filter(
            ([value]) => !currentPage.has(value) || selectedValues.has(value)
          )
        : []
    )
    const available = new Map(
      rows.value.map(row => [getPickerRowKey(props.source, row), row])
    )
    const next = props.multiple ? selectedRows : selectedRows.slice(-1)
    for (const selectedRow of next) {
      const row = available.get(getPickerRowKey(props.source, selectedRow))
      if (!row || !checkable(row)) continue
      const value = rowValue(row)
      if (!nextDraft.has(value) && nextDraft.size >= maximum.value) continue
      nextDraft.set(value, row)
    }
    return nextDraft
  }

  function remove(value: DataPickerValue): void {
    if (confirming.value) return
    const nextDraft = new Map(draft.value)
    if (!nextDraft.delete(value)) return
    draft.value = nextDraft
    const currentTable = currentSelectionTable()
    if (!currentTable) return
    const row = rows.value.find(row => rowValue(row) === value)
    if (!row) return
    restoringSelection = true
    try {
      currentTable.unselectRow(getPickerRowKey(props.source, row))
    } finally {
      restoringSelection = false
    }
  }

  function move(value: DataPickerValue, offset: number): void {
    if (
      !opened.value ||
      confirming.value ||
      blocked.value ||
      !Number.isInteger(offset)
    )
      return
    const entries = [...draft.value]
    const from = entries.findIndex(([key]) => key === value)
    const to = from + offset
    if (from < 0 || to < 0 || to >= entries.length || from === to) return
    const [entry] = entries.splice(from, 1)
    entries.splice(to, 0, entry)
    draft.value = new Map(entries)
  }

  function restoreSelection(): void {
    const currentTable = table.value
    if (!opened.value || !currentTable) return
    restoringSelection = true
    try {
      selectionPage = { table: currentTable, rows: rows.value }
      let nextDraft: Map<DataPickerValue, T | undefined> | undefined
      currentTable.clearSelection()
      for (const row of rows.value) {
        const value = rowValue(row)
        if (draft.value.has(value)) {
          if (draft.value.get(value) !== row)
            (nextDraft ??= new Map(draft.value)).set(value, row)
          if (checkable(row))
            currentTable.selectRow(
              props.source.value === undefined
                ? value
                : getPickerRowKey(props.source, row)
            )
        }
      }
      if (nextDraft) draft.value = nextDraft
    } finally {
      restoringSelection = false
    }
  }

  function query(): void {
    applyQuery(searchDraft.value, queryState.value.filters)
  }

  function submitFilters(filters: TFilters): void {
    const next = { ...filters }
    const { navigation } = props
    const current = queryState.value.filters
    // 查询表单只替换自身字段；省略导航字段时保留当前分类，显式提交仍可覆盖或清除。
    if (
      navigation &&
      current &&
      !Object.prototype.hasOwnProperty.call(filters, navigation.field) &&
      Object.prototype.hasOwnProperty.call(current, navigation.field)
    ) {
      Reflect.set(next, navigation.field, current[navigation.field])
    }
    applyQuery('', requestFilters(next))
  }

  function navigate(key: DataPickerValue | undefined): void {
    const { navigation } = props
    if (!navigation) return
    // The caller names the business filter. Only that field is changed here.
    const filters = { ...queryState.value.filters } as TFilters
    if (key === undefined) Reflect.deleteProperty(filters, navigation.field)
    else Reflect.set(filters, navigation.field, key)
    applyQuery(searchDraft.value, requestFilters(filters))
  }

  async function chooseHistory(value: DataPickerValue): Promise<void> {
    if (
      blocked.value ||
      !opened.value ||
      !props.source.resolve ||
      confirming.value
    )
      return
    const rows = await resolver.resolve([value])
    const row = rows?.get(value)
    if (!row || !opened.value) return
    if (!hasCapacity(value)) return
    draft.value = props.multiple
      ? new Map(draft.value).set(value, row)
      : new Map([[value, row]])
    restoreSelection()
  }

  function favoriteSelection(): void {
    if (blocked.value || !canConfirm.value) return
    const entries: Array<{ value: DataPickerValue; label: string }> = []
    for (const value of draft.value.keys()) {
      const row = resolveDraftRow(value)
      if (row && checkable(row))
        entries.push({ value, label: props.source.label(row) })
    }
    history.addFavorites(entries)
  }

  function removeFavorite(value: DataPickerValue): void {
    if (blocked.value || confirming.value) return
    const entry = history.favorites.value.find(item => item.value === value)
    if (entry) history.toggleFavorite(entry)
  }

  function applyQuery(search: string, filters: TFilters | undefined): void {
    if (!opened.value || blocked.value || confirming.value) return
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
    // 表格内的点击已更新勾选，只在候选页替换或表格重挂载时回填。
    [rows, table],
    () => {
      void nextTick(restoreSelection)
    },
    { flush: 'post' }
  )
  watch(
    values,
    (next, previous) => {
      if (
        next.length === previous.length &&
        next.every((value, index) => Object.is(value, previous[index]))
      )
        return
      close()
      // 保留刚确认的受控值；已离开选择的值再次进入时从当前数据源回显。
      if (!committedRows.value.size) return
      const selectedValues = new Set(next)
      committedRows.value = new Map(
        [...committedRows.value].filter(([value]) => selectedValues.has(value))
      )
    },
    { flush: 'sync' }
  )
  watch(
    [() => props.multiple, () => props.disabled, () => props.readonly],
    close,
    { flush: 'sync' }
  )
  return {
    opened,
    reset: invalidateSource,
    open,
    close,
    confirm,
    clear,
    page,
    pageSize,
    searchDraft,
    search,
    searchOptions,
    query,
    submitFilters,
    list,
    labels,
    rows,
    total,
    display,
    selected,
    selectedItems,
    move,
    selectedCount,
    canConfirm,
    columns,
    tableConfig,
    selectPage,
    remove,
    confirming,
    selectionError,
    history,
    chooseHistory,
    navigate,
    favoriteSelection,
    removeFavorite,
    canFavorite: computed(
      () =>
        canConfirm.value &&
        history.canAddFavorite.value &&
        [...draft.value.keys()].some(
          value =>
            resolveDraftRow(value) !== undefined &&
            !history.favorites.value.some(item => item.value === value)
        )
    ),
    filters: computed(() => cloneData(queryState.value.filters)),
    setTable: (instance: TableInstance<T> | null) => {
      table.value = instance
    },
  }
}
