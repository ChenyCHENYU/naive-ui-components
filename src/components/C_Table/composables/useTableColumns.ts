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
import type { DataTableRowKey, DataTableColumn } from 'naive-ui/es'
import type { TableColumn, DataRecord, ColumnWithKey } from '../types'
import type { ResolvedConfig } from './useTableConfig'
import { applyFormatter } from './useTableGlobalConfig'
import { EDIT_COMPONENTS } from '../data'
import C_Icon from '../../C_Icon/index.vue'

/* ================= 内部辅助类型 ================= */

/** useTableColumns 中对 tableManager 的最小依赖接口 */
interface TableManagerRef {
  editStates: {
    cellEdit: {
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
 * 渲染编辑组件（行编辑/单元格编辑通用）
 */
export function renderEditComponent(
  column: TableColumn,
  value: unknown,
  onUpdate: (val: unknown) => void
): VNodeChild {
  if (column.editRender) return column.editRender(value, {} as DataRecord, 0)

  const col = column as ColumnWithKey
  const componentProps = {
    value,
    'onUpdate:value': onUpdate,
    placeholder: `请输入${col.title ?? ''}`,
    style: { width: '100%' },
    ...column.editProps,
  }

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

  // 列级 formatter
  if ((column as any).formatter) {
    return applyFormatter(
      value,
      rowData,
      (column as any).formatter,
      formatterConfig
    )
  }

  return String(value ?? '')
}

/**
 * 渲染编辑中的单元格（带保存/取消按钮）
 */
export function renderEditingCell(
  column: TableColumn,
  value: unknown,
  onUpdate: (val: unknown) => void,
  onSave: () => void,
  onCancel: () => void
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
      renderEditComponent(column, value, onUpdate),
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
  /** 默认列宽 */
  columnWidth: number
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
}

export interface UseTableColumnsReturn {
  reactiveColumns: Ref<TableColumn[]>
  showSettingsPanel: Ref<boolean>
  computedColumns: ComputedRef<DataTableColumn[]>
  computedScrollX: ComputedRef<number | string | undefined>
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
    columnWidth,
    rowKey,
    tableManager,
    actionsRenderer,
    editModeChecker,
  } = options

  /* ================= 响应式列状态 ================= */

  const reactiveColumns = ref<TableColumn[]>([])
  const showSettingsPanel = ref(false)

  /** 同步外部列配置到响应式状态 */
  const syncColumns = (newColumns: TableColumn[]) => {
    const existingActions = reactiveColumns.value.find(
      col => (col as ColumnWithKey).key === '_actions'
    )
    reactiveColumns.value = [
      ...newColumns,
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
  }

  watch(
    rawColumns,
    cols => {
      if (cols?.length) syncColumns(cols)
    },
    { deep: true, immediate: true }
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
        getEditingCellValue(rowKeyVal, colKey) ?? value,
        (val: unknown) => updateEditingCellValue(rowKeyVal, colKey, val),
        () => saveEditCell(),
        () => cancelEditCell()
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
      return renderEditComponent(
        column,
        tableManager.editStates.rowEdit.getEditingRowData(key)?.[colKey] ??
          value,
        (val: unknown) =>
          tableManager.editStates.rowEdit.updateEditingRowData(key, colKey, val)
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

  const getColWidth = (col: TableColumn): number => {
    const w = (col as ColumnWithKey).width || columnWidth || 180
    return typeof w === 'number' ? w : 180
  }

  /** 序号列 */
  const mapIndexColumn = (column: TableColumn): DataTableColumn => {
    const col = column as ColumnWithKey
    return {
      key: '_index',
      title: col.title || '序号',
      width:
        typeof (col.width || 50) === 'number'
          ? (col.width as number) || 50
          : 50,
      titleAlign: 'center' as const,
      align: 'center' as const,
      render: (_: DataRecord, index: number) => index + 1,
      fixed: column.fixed,
    }
  }

  /** 普通数据列 */
  const mapRegularColumn = (column: TableColumn): DataTableColumn => {
    const col = column as ColumnWithKey
    const base: Record<string, unknown> = {
      ...col,
      width: getColWidth(column),
      titleAlign: col.titleAlign || ('center' as const),
      align: col.align || ('center' as const),
      render:
        column.render ||
        ((rowData: DataRecord, rowIndex: number) =>
          renderCell(column, rowData, rowIndex)),
    }

    if (column.fixed) base.fixed = column.fixed

    if (column.resizable && typeof base.width === 'number') {
      base.resizable = true
      base.minWidth = column.minWidth || 80
      base.maxWidth = column.maxWidth || 500
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
        return (col as any).type === 'index'
          ? mapIndexColumn(c)
          : mapRegularColumn(c)
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

    const actionsMeta = reactiveColumns.value.find(
      c => (c as ColumnWithKey).key === '_actions'
    )
    cols.push({
      key: '_actions',
      title: '操作',
      align: 'center' as const,
      titleAlign: 'center' as const,
      render: actionsRenderer,
      fixed: (actionsMeta as ColumnWithKey)?.fixed,
    })

    return cols
  })

  /* ================= 横向滚动 ================= */

  const computedScrollX = computed(() => {
    if (options.scrollX !== undefined) return options.scrollX

    const hasFixed = reactiveColumns.value.some(c => {
      const col = c as ColumnWithKey
      return col.fixed && col.visible !== false
    })
    if (!hasFixed) return undefined

    const total = reactiveColumns.value
      .filter(c => (c as ColumnWithKey).visible !== false)
      .reduce((sum: number, c) => sum + getColWidth(c), 0)

    return total + 200
  })

  /* ================= 列设置变更 ================= */

  const handleColumnChange = (columns: TableColumn[]) => {
    reactiveColumns.value = columns.map(col => {
      const c = col as ColumnWithKey
      return {
        ...col,
        visible: c.visible !== false,
        fixed: col.fixed,
        width: c.width || columnWidth,
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
    handleColumnChange,
  }
}
