/*
 * @Description: 表格列处理引擎 — 列映射、单元格渲染、列设置状态管理
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
 */

import {
  h,
  ref,
  shallowRef,
  shallowReactive,
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
import { renderEditComponent } from '../editRenderer'
export { renderEditComponent } from '../editRenderer'
import { flattenTableColumns } from '../helpers'
import C_Icon from '../../C_Icon/index.vue'
import { columnPixels, allocateColumnWidths } from './columnLayout'

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
  /** body 可用宽用于分配；外宽用于区分容器变化与滚动条 gutter。 */
  viewportWidth?: Readonly<Ref<{ width: number; outerWidth: number }>>
  nativeLayout?: () => boolean
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
    isNonEditable: (
      column: TableColumn,
      row?: DataRecord,
      index?: number
    ) => boolean
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
  nativeLayout: ComputedRef<{ columns: DataTableColumn[]; width?: number }>
  handleColumnChange: (columns: TableColumn[]) => void
  resetColumnPreferences: () => void
  rememberColumnWidth: (key: DataTableRowKey, width: number) => void
  flushColumnWidths: () => void
}

/* ================= 主函数 ================= */

const isUtilityColumn = (column: DataTableColumn) =>
  column.type === 'selection' ||
  column.type === 'expand' ||
  column.key === '_index' ||
  column.key === '_radio_selection' ||
  column.key === '_actions'

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
  const pendingWidths = shallowReactive(new Map<DataTableRowKey, number>())
  // 手动调宽后保留其余列的实际宽度，直到真实容器外宽改变；150ms 只负责存偏好。
  let frozenWidths: Map<DataTableRowKey, number> | undefined
  let frozenOuterWidth = 0
  let resizeTimer: ReturnType<typeof setTimeout> | undefined

  watch(
    storageKey,
    (key, previousKey) => {
      frozenWidths = undefined
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
    [rawColumns, storageKey, () => options.nativeLayout?.()],
    ([columns, key], [previous, previousKey]) => {
      frozenWidths = undefined
      if (!columns.length || (key !== previousKey && columns === previous))
        return
      // An empty loading schema can be temporary. A committed schema drops deleted keys.
      flushColumnWidths(key)
      const current = preferences.value
      const keys = new Set(
        flattenTableColumns(columns).map(column => column.key)
      )
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

    if (checker.isNonEditable(column, rowData, rowIndex)) {
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

    base.resizable =
      column.resizable ?? !isUtilityColumn(column as DataTableColumn)

    return base as unknown as DataTableColumn
  }

  /* ================= 计算列 ================= */

  const columnLayout = computed(() => {
    let headerFont: string | undefined
    let bodyFont: string | undefined
    let hasHeaderFloor = false
    let hasAutomatic = false
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
      hasAutomatic = true
      bodyFont ??= options.getFont?.() ?? '13px sans-serif'
      return contentWidth(column, bodyFont, fontRevision)
    }

    const mapColumns = (columns: TableColumn[]): DataTableColumn[] =>
      columns.flatMap(c => {
        if (c.visible === false || c.key === '_actions') return []
        if (c.type === 'group') {
          const children = mapColumns(c.children)
          return children.length
            ? [{ ...c, type: undefined, children } as DataTableColumn]
            : []
        }
        const col = c as ColumnWithKey
        if (c.type === 'index') return [mapIndexColumn(c, getHeaderFloor)]
        // 功能列保留显式宽度，分组不参与数据列宽估算。
        if (c.type === 'selection' || c.type === 'expand')
          return [{ ...col, width: col.width ?? 40 } as DataTableColumn]
        return [mapRegularColumn(c, getHeaderFloor(c), getContentWidth)]
      })
    let cols = mapColumns(reactiveColumns.value)

    if (
      options.rowNumber?.value &&
      rawColumns.value.length &&
      !flattenTableColumns(rawColumns.value).some(
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

    return { columns: cols, hasHeaderFloor, hasAutomatic }
  })
  const usesNativeWidths = computed(() => {
    if (options.nativeLayout?.()) return true
    const visibleKeys = new Set(
      flattenTableColumns(reactiveColumns.value, true).map(column => column.key)
    )
    // 隐藏列不影响当前布局；原始百分比声明在手动拖宽后仍保留原生兼容。
    return flattenTableColumns(rawColumns.value, true).some(
      column =>
        visibleKeys.has(column.key) &&
        column.width !== undefined &&
        columnPixels(column) === undefined
    )
  })
  const computedColumns = computed(() => {
    const { columns } = columnLayout.value
    const viewport = options.viewportWidth?.value
    if (frozenWidths && (viewport?.outerWidth ?? 0) !== frozenOuterWidth)
      frozenWidths = undefined
    const native = usesNativeWidths.value
    if (native) frozenWidths = undefined
    const automatic = new Set(
      flattenTableColumns(reactiveColumns.value)
        .filter(
          column =>
            !column.type &&
            column.key !== undefined &&
            !isUtilityColumn(column as DataTableColumn) &&
            column.width === undefined &&
            column.autoWidth !== false &&
            !options.columnWidthExplicit
        )
        .map(column => column.key!)
    )
    return allocateColumnWidths(columns, {
      available: native ? 0 : (viewport?.width ?? 0),
      automatic,
      pending: pendingWidths,
      frozen: frozenWidths,
    })
  })

  /* ================= 横向滚动 ================= */

  const computedScrollX = computed(() => {
    if (options.scrollX !== undefined) return options.scrollX

    const { hasHeaderFloor, hasAutomatic } = columnLayout.value
    const columns = computedColumns.value
    const leaves = flattenTableColumns(columns)
    const hasFixed =
      columns.some(col => col.fixed) || leaves.some(col => col.fixed)
    const hasSizedUtility =
      leaves.some(isUtilityColumn) &&
      leaves.every(col => columnPixels(col) !== undefined)
    if (!hasFixed && !hasAutomatic && !hasHeaderFloor && !hasSizedUtility)
      return undefined

    // 使用最终可见列：包含实际选择/展开/序号/操作列，不再额外猜测 200px。
    return leaves.reduce(
      (sum, col) =>
        sum +
        (columnPixels(col) ??
          (typeof col.minWidth === 'number' ? col.minWidth : 180)),
      0
    )
  })

  // 全数值列以最终列宽总和布局，不让 scrollX 的最小画布反向撑大任意列。
  // 原生百分比等非数值宽度保留 Naive 布局；显式 table-layout 在组件层单独转发。
  const nativeLayout = computed(() => {
    const columns = computedColumns.value
    const leaves = flattenTableColumns(columns)
    const widths = leaves.map(columnPixels)
    return {
      columns,
      width:
        !usesNativeWidths.value &&
        widths.length &&
        widths.every(width => width !== undefined)
          ? widths.reduce<number>((sum, width) => sum + width!, 0)
          : undefined,
    }
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
    const current = flattenTableColumns(computedColumns.value)
    if (
      current.some(
        column =>
          'key' in column &&
          column.key === key &&
          columnPixels(column) === width
      )
    )
      return
    if (!frozenWidths) {
      frozenWidths = new Map(
        current.flatMap(column => {
          const pixels = columnPixels(column)
          return 'key' in column && pixels !== undefined
            ? [[column.key, pixels] as const]
            : []
        })
      )
      frozenOuterWidth = options.viewportWidth?.value.outerWidth ?? 0
    }
    pendingWidths.set(key, width)
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => flushColumnWidths(storageKey.value), 150)
  }

  function handleColumnChange(columns: TableColumn[]) {
    frozenWidths = undefined
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
    frozenWidths = undefined
    clearTimeout(resizeTimer)
    pendingWidths.clear()
    savePreferences({ columns: [] }, storageKey.value)
  }

  return {
    reactiveColumns,
    showSettingsPanel,
    computedColumns,
    computedScrollX,
    nativeLayout,
    handleColumnChange,
    resetColumnPreferences,
    rememberColumnWidth,
    flushColumnWidths: () => flushColumnWidths(storageKey.value),
  }
}
