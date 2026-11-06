/*
 * @Description: 表格列处理引擎 — 列映射、单元格渲染、列设置状态管理
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
 */

import {
  h,
  ref,
  shallowRef,
  watch,
  computed,
  type Ref,
  type VNodeChild,
  type ComputedRef,
} from 'vue'
import { NTag, type DataTableRowKey, type DataTableColumn } from 'naive-ui'
import {
  createColumnMeasurer,
  resolveColumnStatus,
} from '../columnPresentation'
import type { TableColumn, DataRecord, ColumnWithKey } from '../types'
import type { ResolvedConfig } from './useTableConfig'
import {
  getColumnPreferences,
  mergeColumnPreferences,
  parseColumnPreferences,
  type ColumnPreferences,
} from '../components/ColumnSettings/persistence'
import { applyFormatter } from './useTableGlobalConfig'
import { EDIT_COMPONENTS } from '../data'
import C_Icon from '../../C_Icon/index.vue'
import {
  createOptionValueBinding,
  needsOptionValueBinding,
} from '../../../core/options'

/* ================= 内部辅助类型 ================= */

/** useTableColumns 中对 tableManager 的最小依赖接口 */
interface TableManagerRef {
  editStates: {
    cellEdit: {
      isSaving?: Ref<boolean>
      isEditingCell: (rowKey: DataTableRowKey, columnKey: string) => boolean
      getEditingCellValue: (
        rowKey: DataTableRowKey,
        columnKey: string
      ) => unknown
      updateEditingCellValue: (
        rowKey: DataTableRowKey,
        columnKey: string,
        value: unknown
      ) => void
      saveEditCell: () => Promise<unknown>
      cancelEditCell: () => void
      startEditCell: (rowKey: DataTableRowKey, columnKey: string) => void
    }
    rowEdit: {
      isSaving?: Ref<boolean>
      isEditingRow: (rowKey: DataTableRowKey) => boolean
      getEditingRowData: (rowKey: DataTableRowKey) => DataRecord | undefined
      updateEditingRowData: (
        rowKey: DataTableRowKey,
        field: string,
        value: unknown
      ) => void
    }
  }
  dynamicRowsState?: {
    enhanceColumns: (columns: TableColumn[]) => TableColumn[]
  } | null
  expandState?: {
    getTableColumns: (originalColumns: TableColumn[]) => DataTableColumn[]
  } | null
}

/* ================= 渲染工具函数 ================= */

interface EditComponentContext {
  size?: 'small' | 'medium' | 'large'
  busy?: boolean
}

function resolveEditProps(
  column: TableColumn,
  value: unknown,
  onUpdate: (value: unknown) => void,
  context: EditComponentContext
) {
  const col = column as ColumnWithKey
  const props = {
    value,
    'onUpdate:value': onUpdate,
    placeholder: `请输入${col.title ?? ''}`,
    style: { width: '100%' },
    ...(context.size ? { size: context.size } : {}),
    ...column.editProps,
    ...(context.busy ? { disabled: true } : {}),
  }
  if (column.editType !== 'select' || !Array.isArray(column.editProps?.options))
    return props
  if (!needsOptionValueBinding(column.editProps.options, value)) return props
  const binding = createOptionValueBinding(column.editProps.options, value)
  const update = props['onUpdate:value']
  return {
    ...props,
    value: binding.value,
    options: binding.options,
    fallbackOption: props.fallbackOption ?? binding.fallbackOption,
    'onUpdate:value': (
      next: Parameters<typeof binding.decode>[0],
      selected?: unknown
    ) => update(binding.decode(next, selected)),
  }
}

/**
 * 渲染编辑组件（行编辑/单元格编辑通用）
 */
export function renderEditComponent(
  column: TableColumn,
  value: unknown,
  onUpdate: (val: unknown) => void,
  rowData: DataRecord = {},
  rowIndex = 0,
  size?: EditComponentContext['size'] | EditComponentContext,
  busy = false
): VNodeChild {
  if (column.editRender)
    return column.editRender(value, rowData, rowIndex, { onUpdate })

  const context = typeof size === 'object' ? size : { size, busy }
  const componentProps = resolveEditProps(column, value, onUpdate, context)

  const Component =
    EDIT_COMPONENTS[column.editType || 'input'] || EDIT_COMPONENTS.input
  return h(Component, componentProps)
}

/**
 * 渲染只读单元格
 */
export function renderDisplayCell(
  column: TableColumn,
  rowData: DataRecord,
  rowIndex: number,
  value: unknown,
  formatterConfig?: import('./useTableGlobalConfig').FormatterConfig
): VNodeChild {
  if (column.render)
    return column.render(rowData, rowIndex) ?? String(value ?? '')

  const label = column.formatter
    ? applyFormatter(value, rowData, column.formatter, formatterConfig)
    : String(value ?? '')
  if (!column.status || value == null || value === '') return label
  const status = resolveColumnStatus(value, label, column.status)
  const color =
    status.color === 'danger'
      ? 'error'
      : status.color === 'neutral'
        ? 'default'
        : status.color
  const semantic = [
    'default',
    'success',
    'warning',
    'error',
    'info',
    'primary',
  ].includes(color)
  return h(
    NTag,
    {
      size: 'small',
      round: true,
      bordered: false,
      type: semantic
        ? (color as
            'default' | 'success' | 'warning' | 'error' | 'info' | 'primary')
        : 'default',
      ...(semantic
        ? {}
        : {
            color: {
              textColor: color,
              color: `color-mix(in srgb, ${color} 12%, transparent)`,
            },
          }),
    },
    () => status.label
  )
}

/**
 * 渲染编辑中的单元格（带保存/取消按钮）
 */
export function renderEditingCell(
  column: TableColumn,
  value: unknown,
  onUpdate: (val: unknown) => void,
  onSave: () => void,
  onCancel: () => void,
  context: {
    rowData: DataRecord
    rowIndex: number
    size?: 'small' | 'medium' | 'large'
    busy?: boolean
  } = {
    rowData: {},
    rowIndex: 0,
  }
): VNodeChild {
  const actionBtn = (
    name: string,
    title: string,
    onClick: (e: Event) => void
  ) =>
    h(
      'button',
      {
        class: `cell-action-btn cell-action-${name}`,
        disabled: context.busy,
        'aria-busy': context.busy || undefined,
        title,
        type: 'button',
        onClick: (e: Event) => {
          e.stopPropagation()
          e.preventDefault()
          onClick(e)
        },
      },
      [
        h(C_Icon, {
          name: `mdi:${name === 'save' ? 'check' : 'close'}`,
          title: name === 'save' ? '保存' : '取消',
          size: 12,
        }),
      ]
    )

  return h('div', { class: 'cell-editing-container' }, [
    h('div', { class: 'cell-editing-input' }, [
      renderEditComponent(
        column,
        value,
        onUpdate,
        context.rowData,
        context.rowIndex,
        context
      ),
    ]),
    h('div', { class: 'cell-editing-actions' }, [
      actionBtn('save', '保存', onSave),
      actionBtn('cancel', '取消', onCancel),
    ]),
  ])
}

/**
 * 渲染可编辑单元格（显示值 + 编辑图标）
 */
export function renderEditableCell(
  column: TableColumn,
  rowData: DataRecord,
  rowIndex: number,
  value: unknown,
  onStartEdit: () => void,
  formatterConfig?: import('./useTableGlobalConfig').FormatterConfig
): VNodeChild {
  return h('div', { class: 'cell-edit-wrapper' }, [
    h('span', { class: 'cell-value' }, [
      renderDisplayCell(column, rowData, rowIndex, value, formatterConfig),
    ]),
    h(C_Icon, {
      name: 'mdi:square-edit-outline',
      title: '编辑',
      class: 'cell-edit-icon',
      size: 14,
      clickable: true,
      onClick: (e: Event) => {
        e.stopPropagation()
        onStartEdit()
      },
    }),
  ])
}

/* ================= 组合式函数入参 ================= */

export interface UseTableColumnsOptions {
  /** 原始列配置 */
  rawColumns: ComputedRef<TableColumn[]>
  /** 统一配置 */
  config: ComputedRef<ResolvedConfig>
  /** 只对已加载数据做有界抽样；外部独立使用此 hook 时可省略。 */
  data?: ComputedRef<readonly DataRecord[]>
  getFont?: (header?: boolean) => string
  fontRevision?: Readonly<Ref<number>>
  /** 默认列宽 */
  columnWidth: number
  /** 区分使用侧显式统一列宽与内部默认值，不把默认值强加给弹性业务列。 */
  columnWidthExplicit?: boolean
  /** 用户设定的 scrollX */
  scrollX?: number | string
  /** 行键获取函数 */
  rowKey: (row: DataRecord) => DataTableRowKey
  /** 表格管理器 */
  tableManager: TableManagerRef
  /** 操作列渲染函数 */
  actionsRenderer: (row: DataRecord, index: number) => VNodeChild
  /** 编辑模式检查器 */
  editModeChecker: ComputedRef<{
    isNonEditable: (column: TableColumn) => boolean
    isRowEditMode: () => boolean
    isCellEditMode: () => boolean
  }>
  /** 是否渲染操作列 */
  showActionsColumn: ComputedRef<boolean>
  rowNumber?: ComputedRef<boolean>
  getRowNumber?: (row: DataRecord, index: number) => number | string
  rowNumberTitle?: () => string
}

export interface UseTableColumnsReturn {
  reactiveColumns: Ref<TableColumn[]>
  showSettingsPanel: Ref<boolean>
  computedColumns: ComputedRef<DataTableColumn[]>
  computedScrollX: ComputedRef<number | string | undefined>
  handleColumnChange: (columns: TableColumn[]) => void
  resetColumnPreferences: () => void
  rememberColumnWidth: (key: DataTableRowKey, width: number) => void
  flushColumnWidths: () => void
}

/* ================= 主函数 ================= */

/**
 * 表格列处理引擎
 */
export function useTableColumns(
  options: UseTableColumnsOptions
): UseTableColumnsReturn {
  const {
    rawColumns,
    config,
    rowKey,
    tableManager,
    actionsRenderer,
    editModeChecker,
    showActionsColumn,
  } = options

  /* ================= 响应式列状态 ================= */

  const showSettingsPanel = ref(false)
  const preferences = shallowRef<ColumnPreferences>({ columns: [] })
  const storageKey = computed(() =>
    config.value.persistKey
      ? `c_table_cols_${config.value.persistKey}`
      : undefined
  )
  const pendingWidths = new Map<DataTableRowKey, number>()
  let resizeTimer: ReturnType<typeof setTimeout> | undefined

  watch(
    storageKey,
    (key, previousKey) => {
      flushColumnWidths(previousKey)
      let stored: string | null = null
      try {
        if (key) stored = localStorage.getItem(key)
      } catch {
        // Column settings continue to work when browser storage is unavailable.
      }
      preferences.value = stored
        ? parseColumnPreferences(stored)
        : { columns: [] }
    },
    { immediate: true, flush: 'sync' }
  )

  const baseColumns = computed<TableColumn[]>(() => {
    const columns = rawColumns.value
    const regular = columns.filter(column => column.key !== '_actions')
    if (!columns.length || !showActionsColumn.value) return regular
    const actions = columns.find(column => column.key === '_actions')
    return [
      ...regular,
      actions ?? {
        key: '_actions',
        title: '操作',
        width: 180,
        editable: false,
        visible: true,
        fixed: 'right',
      },
    ]
  })
  const reactiveColumns = computed({
    get: () => mergeColumnPreferences(baseColumns.value, preferences.value),
    set: handleColumnChange,
  })
  watch(
    [rawColumns, storageKey],
    ([columns, key], [previous, previousKey]) => {
      if (!columns.length || (key !== previousKey && columns === previous))
        return
      // An empty loading schema can be temporary. A committed schema drops deleted keys.
      flushColumnWidths(key)
      const current = preferences.value
      const keys = new Set(columns.map(column => column.key))
      if (showActionsColumn.value) keys.add('_actions')
      const order = current.order?.filter(columnKey => keys.has(columnKey))
      const kept = current.columns.filter(column => keys.has(column.key))
      if (
        kept.length !== current.columns.length ||
        order?.length !== current.order?.length
      )
        savePreferences({ columns: kept, order }, key)
    },
    { immediate: true }
  )

  /* ================= 单元格渲染 ================= */

  /** 单元格编辑模式渲染 */
  const renderCellEdit = (
    column: TableColumn,
    rowData: DataRecord,
    rowIndex: number,
    rowKeyVal: DataTableRowKey
  ): VNodeChild => {
    const col = column as ColumnWithKey
    const colKey = col.key ?? ''
    const value = rowData[colKey]
    const {
      isEditingCell,
      getEditingCellValue,
      updateEditingCellValue,
      saveEditCell,
      cancelEditCell,
      startEditCell,
    } = tableManager.editStates.cellEdit

    if (isEditingCell(rowKeyVal, colKey)) {
      return renderEditingCell(
        column,
        getEditingCellValue(rowKeyVal, colKey),
        (val: unknown) => updateEditingCellValue(rowKeyVal, colKey, val),
        () => saveEditCell(),
        () => cancelEditCell(),
        {
          rowData,
          rowIndex,
          busy: tableManager.editStates.cellEdit.isSaving?.value,
          size: config.value.density ? config.value.controlSize : undefined,
        }
      )
    }

    return renderEditableCell(
      column,
      rowData,
      rowIndex,
      value,
      () => startEditCell(rowKeyVal, colKey),
      config.value.formatterConfig
    )
  }

  /** 统一单元格渲染入口 */
  const renderCell = (
    column: TableColumn,
    rowData: DataRecord,
    rowIndex: number
  ): VNodeChild => {
    const col = column as ColumnWithKey
    const colKey = col.key ?? ''
    const value = rowData[colKey]
    const checker = editModeChecker.value

    if (checker.isNonEditable(column)) {
      return renderDisplayCell(
        column,
        rowData,
        rowIndex,
        value,
        config.value.formatterConfig
      )
    }

    const key = rowKey(rowData)
    if (
      checker.isRowEditMode() &&
      tableManager.editStates.rowEdit.isEditingRow(key)
    ) {
      const editingRow = tableManager.editStates.rowEdit.getEditingRowData(key)
      return renderEditComponent(
        column,
        editingRow?.[colKey],
        (val: unknown) =>
          tableManager.editStates.rowEdit.updateEditingRowData(
            key,
            colKey,
            val
          ),
        editingRow ?? rowData,
        rowIndex,
        {
          size: config.value.density ? config.value.controlSize : undefined,
          busy: tableManager.editStates.rowEdit.isSaving?.value,
        }
      )
    }

    if (checker.isCellEditMode()) {
      return renderCellEdit(column, rowData, rowIndex, key)
    }

    return renderDisplayCell(
      column,
      rowData,
      rowIndex,
      value,
      config.value.formatterConfig
    )
  }

  /* ================= 列映射 ================= */

  const measure = createColumnMeasurer()
  const headerWidth = (column: TableColumn, font: string) =>
    Math.ceil(
      measure(column.title ?? String(column.key ?? ''), font) +
        (column.sorter ? 20 : 0) +
        (column.filter ? 28 : 0) +
        (column.type === 'index' ? 16 : 28)
    )
  const measureContentWidth = (column: TableColumn, font: string): number => {
    const { formatter, status } = column
    const key = String(column.key)
    const formatterConfig = formatter ? config.value.formatterConfig : undefined
    let width = 0
    const rows = options.data?.value ?? []
    const count = Math.min(rows.length, 100)
    for (let i = 0; i < count; i++) {
      const row =
        rows[
          count === 1 ? 0 : Math.floor((i * (rows.length - 1)) / (count - 1))
        ]
      const value = row[key]
      let label = formatter
        ? applyFormatter(value, row, formatter, formatterConfig)
        : String(value ?? '')
      if (status) label = resolveColumnStatus(value, label, status).label
      width = Math.max(
        width,
        measure(label.slice(0, 128), font) + (status ? 16 : 0)
      )
    }
    const min = column.minWidth ?? 80
    return Math.max(
      min,
      Math.min(Math.max(min, column.maxWidth ?? 360), Math.ceil(width + 28))
    )
  }

  const contentWidths = new WeakMap<
    TableColumn,
    { font: string; revision: number | undefined; width: ComputedRef<number> }
  >()
  const contentWidth = (
    column: TableColumn,
    font: string,
    revision: number | undefined
  ): number => {
    let cached = contentWidths.get(column)
    if (cached?.font !== font || cached.revision !== revision) {
      // 让 Vue 跟踪每列实际读到的采样值和格式化依赖，换列定义或字体时重新测量。
      cached = {
        font,
        revision,
        width: computed(() => measureContentWidth(column, font)),
      }
      contentWidths.set(column, cached)
    }
    return cached.width.value
  }

  // 表头完整展示优先，声明宽度和内容上限不能压缩标题。
  const widthWithHeader = (width: number | string, floor: number) =>
    typeof width === 'number' ? Math.max(width, floor) : width

  /** 序号列 */
  const mapIndexColumn = (
    column: TableColumn,
    getHeaderFloor: (column: TableColumn) => number
  ): DataTableColumn => {
    const col = column as ColumnWithKey
    const title = col.title ?? options.rowNumberTitle?.() ?? '序号'
    return {
      ...col,
      type: undefined,
      key: '_index',
      title,
      width: widthWithHeader(
        col.width ?? 50,
        getHeaderFloor({ ...col, title })
      ),
      className: [col.className, 'c-table-index-column']
        .filter(Boolean)
        .join(' '),
      titleAlign: col.titleAlign ?? 'center',
      align: col.align ?? 'center',
      render: (row: DataRecord, index: number) =>
        options.getRowNumber?.(row, index) ?? index + 1,
      fixed: column.fixed,
    }
  }

  /** 普通数据列 */
  const mapRegularColumn = (
    column: TableColumn,
    floor: number,
    getContentWidth: (column: TableColumn) => number
  ): DataTableColumn => {
    const col = column as ColumnWithKey
    const autoWidth = !options.columnWidthExplicit && col.autoWidth !== false
    const automatic = col.width === undefined && autoWidth
    const width =
      col.width ??
      (autoWidth ? getContentWidth(column) : (options.columnWidth ?? 180))
    const base: Record<string, unknown> = {
      ...col,
      width: widthWithHeader(width, floor),
      minWidth: Math.max(col.minWidth ?? (automatic ? 80 : 0), floor),
      maxWidth:
        col.maxWidth == null ? undefined : Math.max(col.maxWidth, floor),
      ellipsis: col.ellipsis ?? (automatic ? { tooltip: true } : undefined),
      titleAlign: col.titleAlign || ('center' as const),
      align: col.align || ('center' as const),
      render: (rowData: DataRecord, rowIndex: number) =>
        renderCell(column, rowData, rowIndex),
    }

    if (column.fixed) base.fixed = column.fixed

    if (column.resizable && typeof base.width === 'number') {
      base.resizable = true
      base.maxWidth = Math.max(base.minWidth as number, column.maxWidth ?? 500)
    }

    return base as unknown as DataTableColumn
  }

  /* ================= 计算列 ================= */

  const columnLayout = computed(() => {
    let headerFont: string | undefined
    let bodyFont: string | undefined
    let hasHeaderFloor = false
    // Web 字体加载完后，CSS 字体声明可能不变，实际字宽会变化。
    const fontRevision = options.fontRevision?.value
    const getHeaderFloor = (column: TableColumn) => {
      headerFont ??= options.getFont?.(true) ?? '600 13px sans-serif'
      const floor = headerWidth(column, headerFont)
      if (
        !column.type &&
        typeof column.width === 'number' &&
        floor > column.width
      )
        hasHeaderFloor = true
      return floor
    }
    const getContentWidth = (column: TableColumn) => {
      bodyFont ??= options.getFont?.() ?? '13px sans-serif'
      return contentWidth(column, bodyFont, fontRevision)
    }

    let cols: DataTableColumn[] = reactiveColumns.value
      .filter(c => {
        const col = c as ColumnWithKey
        return col.visible !== false && col.key !== '_actions'
      })
      .map(c => {
        const col = c as ColumnWithKey
        if (c.type === 'index') return mapIndexColumn(c, getHeaderFloor)
        // 原生辅助列保持自己的渲染和宽度，不套用业务数据列的 180px。
        if (c.type === 'selection' || c.type === 'expand') {
          return { ...col, width: col.width ?? 40 } as DataTableColumn
        }
        return mapRegularColumn(c, getHeaderFloor(c), getContentWidth)
      }) as DataTableColumn[]

    if (
      options.rowNumber?.value &&
      rawColumns.value.length &&
      !rawColumns.value.some(
        column => column.type === 'index' || column.key === '_index'
      )
    ) {
      const index = cols.findIndex(column => !column.type)
      cols.splice(
        index < 0 ? cols.length : index,
        0,
        mapIndexColumn({ type: 'index' }, getHeaderFloor)
      )
    }

    if (tableManager.dynamicRowsState) {
      cols = tableManager.dynamicRowsState.enhanceColumns(
        cols as unknown as TableColumn[]
      ) as unknown as DataTableColumn[]
    }

    if (
      tableManager.expandState &&
      (config.value.expandable || config.value.enableSelection)
    ) {
      cols = tableManager.expandState.getTableColumns(
        cols as unknown as TableColumn[]
      ) as unknown as DataTableColumn[]
    }

    if (showActionsColumn.value) {
      const actionsMeta = reactiveColumns.value.find(
        c => (c as ColumnWithKey).key === '_actions'
      )
      const title = actionsMeta?.title ?? '操作'
      const width = actionsMeta?.width ?? 180
      const floor = getHeaderFloor({
        ...actionsMeta,
        key: '_actions',
        title,
        width,
      })
      cols.push({
        ...actionsMeta,
        type: undefined,
        key: '_actions',
        title,
        width: widthWithHeader(width, floor),
        minWidth: Math.max(actionsMeta?.minWidth ?? 0, floor),
        maxWidth:
          actionsMeta?.maxWidth == null
            ? undefined
            : Math.max(actionsMeta.maxWidth, floor),
        className: [actionsMeta?.className, 'c-table-actions-column']
          .filter(Boolean)
          .join(' '),
        align: actionsMeta?.align ?? 'center',
        titleAlign: actionsMeta?.titleAlign ?? 'center',
        render: actionsRenderer,
        fixed: (actionsMeta as ColumnWithKey)?.fixed,
      })
    }

    return { columns: cols, hasHeaderFloor }
  })
  const computedColumns = computed(() => columnLayout.value.columns)

  /* ================= 横向滚动 ================= */

  const computedScrollX = computed(() => {
    if (options.scrollX !== undefined) return options.scrollX

    const { columns, hasHeaderFloor } = columnLayout.value
    const hasFixed = columns.some(col => col.fixed)
    const hasAutomatic = reactiveColumns.value.some(
      col =>
        !col.type &&
        col.width === undefined &&
        !options.columnWidthExplicit &&
        col.autoWidth !== false
    )
    if (!hasFixed && !hasAutomatic && !hasHeaderFloor) return undefined

    // 使用最终可见列：包含实际选择/展开/序号/操作列，不再额外猜测 200px。
    return columns.reduce((sum, col) => {
      const { width } = col
      const pixels =
        typeof width === 'number'
          ? width
          : typeof width === 'string' &&
              /^\s*\d+(?:\.\d+)?(?:px)?\s*$/.test(width)
            ? Number.parseFloat(width)
            : typeof col.minWidth === 'number'
              ? col.minWidth
              : 180
      return sum + pixels
    }, 0)
  })

  /* ================= 列设置变更 ================= */

  function savePreferences(
    settings: ColumnPreferences,
    key: string | undefined
  ) {
    preferences.value = settings
    if (!key) return
    try {
      if (settings.columns.length || settings.order?.length)
        localStorage.setItem(key, JSON.stringify(settings))
      else localStorage.removeItem(key)
    } catch {
      // The preferences stay active for this instance.
    }
  }

  function flushColumnWidths(key: string | undefined) {
    clearTimeout(resizeTimer)
    if (!pendingWidths.size) return
    const current = preferences.value
    const columns = new Map(current.columns.map(column => [column.key, column]))
    for (const [key, width] of pendingWidths)
      columns.set(key, { ...columns.get(key), key, width })
    pendingWidths.clear()
    savePreferences({ ...current, columns: [...columns.values()] }, key)
  }

  const rememberColumnWidth = (key: DataTableRowKey, width: number) => {
    if (!Number.isFinite(width) || width < 0) return
    pendingWidths.set(key, width)
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => flushColumnWidths(storageKey.value), 150)
  }

  function handleColumnChange(columns: TableColumn[]) {
    const updated = columns.map(column => {
      const width =
        column.key == null ? undefined : pendingWidths.get(column.key)
      return width === undefined ? column : { ...column, width }
    })
    clearTimeout(resizeTimer)
    pendingWidths.clear()
    savePreferences(
      getColumnPreferences(baseColumns.value, updated),
      storageKey.value
    )
  }
  const resetColumnPreferences = () => {
    clearTimeout(resizeTimer)
    pendingWidths.clear()
    savePreferences({ columns: [] }, storageKey.value)
  }

  return {
    reactiveColumns,
    showSettingsPanel,
    computedColumns,
    computedScrollX,
    handleColumnChange,
    resetColumnPreferences,
    rememberColumnWidth,
    flushColumnWidths: () => flushColumnWidths(storageKey.value),
  }
}
