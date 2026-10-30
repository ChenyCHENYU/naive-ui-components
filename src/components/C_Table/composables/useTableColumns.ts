/*
 * @Description: 表格列处理引擎 — 列映射、单元格渲染、列设置状态管理
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
 */

import {
  h,
  ref,
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
import { applyFormatter } from './useTableGlobalConfig'
import { EDIT_COMPONENTS } from '../data'
import C_Icon from '../../C_Icon/index.vue'
import { useDictionaryOptions } from '../../../composables/useDictionary'
import {
  decodeDictionaryControlValue,
  encodeDictionaryControlValue,
  toDictionaryControlOptions,
  type DictionaryOption,
} from '../../../core/dictionary'

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
  dictionaryOptions?: readonly DictionaryOption[]
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
  if (
    !context.dictionaryOptions ||
    column.editProps?.options !== undefined ||
    (column.editType && column.editType !== 'select')
  )
    return props
  const update = props['onUpdate:value']
  props.value = encodeDictionaryControlValue(value)
  props['onUpdate:value'] = val => update(decodeDictionaryControlValue(val))
  return {
    ...props,
    options: toDictionaryControlOptions(context.dictionaryOptions),
    fallbackOption: (native: unknown) => ({
      value: native,
      label: String(decodeDictionaryControlValue(native) ?? ''),
    }),
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
    EDIT_COMPONENTS[
      column.editType || (context.dictionaryOptions ? 'select' : 'input')
    ] || EDIT_COMPONENTS.input
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
    dictionaryOptions?: readonly DictionaryOption[]
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
  let displayValue: string | VNodeChild
  if (column.render) {
    displayValue = column.render(rowData, rowIndex) ?? String(value ?? '')
  } else if ((column as any).formatter) {
    displayValue = applyFormatter(
      value,
      rowData,
      (column as any).formatter,
      formatterConfig
    )
  } else {
    displayValue = String(value ?? '')
  }

  return h('div', { class: 'cell-edit-wrapper' }, [
    h('span', { class: 'cell-value' }, displayValue),
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
}

export interface UseTableColumnsReturn {
  reactiveColumns: Ref<TableColumn[]>
  showSettingsPanel: Ref<boolean>
  computedColumns: ComputedRef<DataTableColumn[]>
  computedScrollX: ComputedRef<number | string | undefined>
  getDictionaryLabel: (column: TableColumn, value: unknown) => string
  handleColumnChange: (columns: TableColumn[]) => void
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

  const reactiveColumns = ref<TableColumn[]>([]) as Ref<TableColumn[]>
  const showSettingsPanel = ref(false)

  /** 同步外部列配置到响应式状态 */
  const syncColumns = (newColumns: TableColumn[]) => {
    const declaredActions = newColumns.find(
      col => (col as ColumnWithKey).key === '_actions'
    )
    const existingActions = reactiveColumns.value.find(
      col => (col as ColumnWithKey).key === '_actions'
    )
    const regularColumns = newColumns.filter(
      col => (col as ColumnWithKey).key !== '_actions'
    )
    reactiveColumns.value = showActionsColumn.value
      ? [
          ...regularColumns,
          declaredActions ||
            existingActions ||
            ({
              key: '_actions',
              title: '操作',
              width: 180,
              editable: false,
              visible: true,
              fixed: 'right',
            } as TableColumn),
        ]
      : regularColumns
  }

  watch(
    [rawColumns, showActionsColumn],
    ([cols]) => {
      if (cols?.length) syncColumns(cols)
      else reactiveColumns.value = []
    },
    { deep: true, immediate: true }
  )

  const dictionaryOptions = useDictionaryOptions(
    () =>
      new Map(
        reactiveColumns.value
          .filter(column => column.dictionary !== undefined)
          .map(column => [String(column.key), column.dictionary])
      ),
    {
      onError: error =>
        config.value.feedback?.error?.(
          error instanceof Error ? error.message : String(error),
          error
        ),
    }
  )

  const columnDictionaryOptions = (column: TableColumn) =>
    column.dictionary === undefined
      ? undefined
      : dictionaryOptions.getOptions(String(column.key))

  const displayColumn = (column: TableColumn): TableColumn =>
    column.dictionary !== undefined && !column.formatter
      ? {
          ...column,
          formatter: {
            type: 'enum',
            fn: value => dictionaryOptions.getLabel(String(column.key), value),
          },
        }
      : column

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
          dictionaryOptions: columnDictionaryOptions(column),
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
    const key = rowKey(rowData)
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
          dictionaryOptions: columnDictionaryOptions(column),
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
  const headerWidth = (column: TableColumn) =>
    Math.ceil(
      measure(
        column.title ?? String(column.key ?? ''),
        options.getFont?.(true) ?? '600 13px sans-serif'
      ) +
        (column.sorter ? 20 : 0) +
        (column.filter ? 28 : 0) +
        28
    )
  const contentWidth = (column: TableColumn): number => {
    const font = options.getFont?.() ?? '13px sans-serif'
    const display = displayColumn(column)
    let width = headerWidth(column) - 28
    const rows = options.data?.value ?? []
    const count = Math.min(rows.length, 100)
    for (let i = 0; i < count; i++) {
      const row =
        rows[
          count === 1 ? 0 : Math.floor((i * (rows.length - 1)) / (count - 1))
        ]
      const value = row[String(column.key)]
      let label = display.formatter
        ? applyFormatter(
            value,
            row,
            display.formatter,
            config.value.formatterConfig
          )
        : String(value ?? '')
      if (column.status)
        label = resolveColumnStatus(value, label, column.status).label
      width = Math.max(
        width,
        measure(label.slice(0, 128), font) + (column.status ? 16 : 0)
      )
    }
    const min = column.minWidth ?? 80
    return Math.max(
      min,
      Math.min(Math.max(min, column.maxWidth ?? 360), Math.ceil(width + 28))
    )
  }

  const getColWidth = (col: TableColumn): number | string => {
    if (col.type === 'selection' || col.type === 'expand')
      return col.width ?? 40
    const width =
      col.width ??
      (col.type === 'index'
        ? 50
        : options.columnWidthExplicit || col.autoWidth === false
          ? (options.columnWidth ?? 180)
          : contentWidth(col))
    // 表头完整展示优先，声明宽度和内容上限不能压缩标题。
    return typeof width === 'number' ? Math.max(width, headerWidth(col)) : width
  }

  /** 序号列 */
  const mapIndexColumn = (column: TableColumn): DataTableColumn => {
    const col = column as ColumnWithKey
    return {
      ...col,
      type: undefined,
      key: '_index',
      title: col.title ?? '序号',
      width: getColWidth(column),
      className: [col.className, 'c-table-index-column']
        .filter(Boolean)
        .join(' '),
      titleAlign: col.titleAlign ?? 'center',
      align: col.align ?? 'center',
      render: (_: DataRecord, index: number) => index + 1,
      fixed: column.fixed,
    }
  }

  /** 普通数据列 */
  const mapRegularColumn = (column: TableColumn): DataTableColumn => {
    const col = column as ColumnWithKey
    const effectiveColumn = displayColumn(column)
    const automatic =
      col.width === undefined &&
      !options.columnWidthExplicit &&
      col.autoWidth !== false
    const base: Record<string, unknown> = {
      ...col,
      width: getColWidth(column),
      minWidth: Math.max(
        col.minWidth ?? (automatic ? 80 : 0),
        headerWidth(col)
      ),
      maxWidth:
        col.maxWidth == null
          ? undefined
          : Math.max(col.maxWidth, headerWidth(col)),
      ellipsis: col.ellipsis ?? (automatic ? { tooltip: true } : undefined),
      titleAlign: col.titleAlign || ('center' as const),
      align: col.align || ('center' as const),
      render: (rowData: DataRecord, rowIndex: number) =>
        renderCell(effectiveColumn, rowData, rowIndex),
    }

    if (column.fixed) base.fixed = column.fixed

    if (column.resizable && typeof base.width === 'number') {
      base.resizable = true
      base.maxWidth = Math.max(base.minWidth as number, column.maxWidth ?? 500)
    }

    return base as unknown as DataTableColumn
  }

  /* ================= 计算列 ================= */

  const computedColumns = computed((): DataTableColumn[] => {
    let cols: DataTableColumn[] = reactiveColumns.value
      .filter(c => {
        const col = c as ColumnWithKey
        return col.visible !== false && col.key !== '_actions'
      })
      .map(c => {
        const col = c as ColumnWithKey
        if (c.type === 'index') return mapIndexColumn(c)
        // 原生辅助列保持自己的渲染和宽度，不套用业务数据列的 180px。
        if (c.type === 'selection' || c.type === 'expand') {
          return { ...col, width: getColWidth(c) } as DataTableColumn
        }
        return mapRegularColumn(c)
      }) as DataTableColumn[]

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
      cols.push({
        ...actionsMeta,
        type: undefined,
        key: '_actions',
        title: (actionsMeta as ColumnWithKey)?.title ?? '操作',
        width: getColWidth({
          ...actionsMeta,
          key: '_actions',
          title: actionsMeta?.title ?? '操作',
          width: actionsMeta?.width ?? 180,
        }),
        minWidth: Math.max(
          actionsMeta?.minWidth ?? 0,
          headerWidth(actionsMeta ?? { key: '_actions', title: '操作' })
        ),
        maxWidth:
          actionsMeta?.maxWidth == null
            ? undefined
            : Math.max(actionsMeta.maxWidth, headerWidth(actionsMeta)),
        className: [actionsMeta?.className, 'c-table-actions-column']
          .filter(Boolean)
          .join(' '),
        align: actionsMeta?.align ?? 'center',
        titleAlign: actionsMeta?.titleAlign ?? 'center',
        render: actionsRenderer,
        fixed: (actionsMeta as ColumnWithKey)?.fixed,
      })
    }

    return cols
  })

  /* ================= 横向滚动 ================= */

  const computedScrollX = computed(() => {
    if (options.scrollX !== undefined) return options.scrollX

    const hasFixed = computedColumns.value.some(col => col.fixed)
    const hasAutomatic = reactiveColumns.value.some(
      col =>
        !col.type &&
        col.width === undefined &&
        !options.columnWidthExplicit &&
        col.autoWidth !== false
    )
    const hasHeaderFloor = reactiveColumns.value.some(
      col =>
        !col.type &&
        typeof col.width === 'number' &&
        headerWidth(col) > col.width
    )
    if (!hasFixed && !hasAutomatic && !hasHeaderFloor) return undefined

    // 使用最终可见列：包含实际选择/展开/序号/操作列，不再额外猜测 200px。
    return computedColumns.value.reduce((sum, col) => {
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

  const handleColumnChange = (columns: TableColumn[]) => {
    reactiveColumns.value = columns.map(col => {
      const c = col as ColumnWithKey
      return {
        ...col,
        visible: c.visible !== false,
        fixed: col.fixed,
        width: c.width ?? (c.type ? getColWidth(col) : undefined),
        align: c.align || 'center',
        titleAlign: c.titleAlign || 'center',
      } as unknown as TableColumn
    })
  }

  return {
    reactiveColumns,
    showSettingsPanel,
    computedColumns,
    computedScrollX,
    getDictionaryLabel: (column, value) =>
      dictionaryOptions.getLabel(String(column.key), value),
    handleColumnChange,
  }
}
