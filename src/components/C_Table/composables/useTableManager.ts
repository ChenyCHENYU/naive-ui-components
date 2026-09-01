/*
 * @Description: 表格统一状态管理器
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
 */

import { shallowRef, computed, toValue, type MaybeRefOrGetter } from 'vue'
import type { DataTableRowKey } from 'naive-ui'
import type { DataRecord, ParentChildLinkMode } from '../types'
import { useRowEdit } from './useRowEdit'
import { useCellEdit } from './useCellEdit'
import { useModalEdit } from './useModalEdit'
import { useTableExpand } from './useTableExpand'
import { useDynamicRows, type DynamicRowsOptions } from './useDynamicRow'
import {
  useComponentFeedback,
  useComponentLocale,
  type ComponentFeedback,
  type ComponentLocale,
} from '../../../config'

/**
 * 表格管理器配置接口
 */
interface TableManagerConfig {
  feedback?: ComponentFeedback
  locale?: ComponentLocale
  /* 基础配置 */
  editable: boolean
  editMode: string
  showRowActions: boolean
  modalTitle: string
  modalWidth: number
  onEditSave?: (
    rowData: DataRecord,
    rowIndex: number,
    columnKey?: string
  ) => void | Promise<void>
  onEditCancel?: (rowData: DataRecord, rowIndex: number) => void | Promise<void>
  onEditError?: (error: unknown) => void

  /* 展开配置 */
  expandable: boolean
  defaultExpandedKeys?: DataTableRowKey[]
  onLoadExpandData?: (row: DataRecord) => Promise<any[]> | any[]
  onExpandError?: (error: unknown, row: DataRecord) => void
  renderExpandContent?: unknown
  rowExpandable?: (row: DataRecord) => boolean

  /* 选择配置 */
  enableSelection: boolean
  defaultCheckedKeys?: DataTableRowKey[]
  rowCheckable?: (row: DataRecord) => boolean
  maxSelection?: number
  enableChildSelection: boolean
  childRowCheckable?: (childRow: DataRecord, parentRow: DataRecord) => boolean
  enableParentChildLink: boolean
  parentChildLinkMode: ParentChildLinkMode

  /* 动态行配置 */
  dynamicRows?: DynamicRowsOptions<DataRecord>
}

/**
 * 表格管理器参数接口
 */
interface TableManagerParams {
  config: MaybeRefOrGetter<TableManagerConfig>
  data: () => DataRecord[]
  rowKey: (row: DataRecord) => DataTableRowKey
  emit: (...args: any[]) => unknown
  /** 列配置（用于编辑校验） */
  columns?: () => import('../types').TableColumn[]
}

/**
 * 事件处理器接口
 */
interface EventHandlers {
  onSave: (
    rowData: DataRecord,
    rowIndex: number,
    columnKey?: string
  ) => Promise<void>
  onCancel: (rowData: DataRecord, rowIndex: number) => Promise<void>
  onExpandChange: (
    keys: DataTableRowKey[],
    row?: DataRecord,
    expanded?: boolean
  ) => void
  onSelectionChange: (
    checkedKeys: DataTableRowKey[],
    checkedRows: DataRecord[],
    childSelections: Map<DataTableRowKey, DataTableRowKey[]>
  ) => void
  onChildSelectionChange: (
    parentKey: DataTableRowKey,
    childKeys: DataTableRowKey[],
    childRows: DataRecord[]
  ) => void
  onRowChange: (data: DataRecord[]) => void
  onRowSelectionChange: (
    selectedKey: DataTableRowKey | null,
    selectedRow: DataRecord | null
  ) => void
  onRowAdd: (newRow: DataRecord) => void
  onRowDelete: (deletedRow: DataRecord, index: number) => void
  onRowCopy: (originalRow: DataRecord, newRow: DataRecord) => void
  onRowMove: (row: DataRecord, fromIndex: number, toIndex: number) => void
}

/**
 * 表格统一状态管理器
 */
export function useTableManager(params: TableManagerParams) {
  const { data, rowKey, emit } = params
  const getConfig = () => toValue(params.config)
  const feedback = useComponentFeedback(() => getConfig().feedback)
  const { t } = useComponentLocale(() => getConfig().locale)

  /* ================= 事件处理器工厂 ================= */

  /** 创建事件处理器集合 */
  const createEventHandlers = (): EventHandlers => ({
    /* 通用事件 */
    onSave: async (
      rowData: DataRecord,
      rowIndex: number,
      columnKey?: string
    ) => {
      if (!rowData || rowIndex < 0 || rowIndex >= data().length) return

      const newData = [...data()]
      newData[rowIndex] = { ...newData[rowIndex], ...rowData }

      try {
        await getConfig().onEditSave?.(newData[rowIndex], rowIndex, columnKey)
        await emit('save', newData[rowIndex], rowIndex, columnKey)
        emit('update:data', newData)
      } catch (error) {
        getConfig().onEditError?.(error)
        emit('edit-error', error)
        throw error
      }
    },

    onCancel: async (rowData: DataRecord, rowIndex: number) => {
      try {
        await getConfig().onEditCancel?.(rowData, rowIndex)
        await emit('cancel', rowData, rowIndex)
      } catch (error) {
        getConfig().onEditError?.(error)
        emit('edit-error', error)
        throw error
      }
    },

    /* 展开选择事件 */
    onExpandChange: (
      keys: DataTableRowKey[],
      row?: DataRecord,
      expanded?: boolean
    ) => {
      emit('expand-change', keys, row, expanded)
    },

    onSelectionChange: (
      checkedKeys: DataTableRowKey[],
      checkedRows: DataRecord[],
      childSelections: Map<DataTableRowKey, DataTableRowKey[]>
    ) => {
      emit('selection-change', checkedKeys, checkedRows, childSelections)
    },

    onChildSelectionChange: (
      parentKey: DataTableRowKey,
      childKeys: DataTableRowKey[],
      childRows: DataRecord[]
    ) => {
      emit('child-selection-change', parentKey, childKeys, childRows)
    },

    /* 动态行事件 */
    onRowChange: (data: DataRecord[]) => {
      emit('update:data', data)
      getConfig().dynamicRows?.onRowChange?.(data)
    },

    onRowSelectionChange: (
      selectedKey: DataTableRowKey | null,
      selectedRow: DataRecord | null
    ) => {
      emit('row-selection-change', selectedKey, selectedRow)
      getConfig().dynamicRows?.onSelectionChange?.(selectedKey, selectedRow)
    },

    onRowAdd: (newRow: DataRecord) => {
      emit('row-add', newRow)
      getConfig().dynamicRows?.onRowAdd?.(newRow)
    },

    onRowDelete: (deletedRow: DataRecord, index: number) => {
      emit('row-delete', deletedRow, index)
      getConfig().dynamicRows?.onRowDelete?.(deletedRow, index)
    },

    onRowCopy: (originalRow: DataRecord, newRow: DataRecord) => {
      emit('row-copy', originalRow, newRow)
      getConfig().dynamicRows?.onRowCopy?.(originalRow, newRow)
    },

    onRowMove: (row: DataRecord, fromIndex: number, toIndex: number) => {
      emit('row-move', row, fromIndex, toIndex)
      getConfig().dynamicRows?.onRowMove?.(row, fromIndex, toIndex)
    },
  })

  const eventHandlers = createEventHandlers()

  /* ================= 功能状态初始化 ================= */

  /** 初始化编辑功能状态 */
  const initEditStates = () => {
    const rowEdit = useRowEdit({
      data,
      rowKey,
      onSave: eventHandlers.onSave,
      onCancel: eventHandlers.onCancel,
      columns: params.columns,
    })

    const cellEdit = useCellEdit({
      data,
      rowKey,
      onSave: eventHandlers.onSave,
      columns: params.columns,
    })

    const modalEdit = useModalEdit({
      data,
      rowKey,
      onSave: eventHandlers.onSave,
      onCancel: eventHandlers.onCancel,
    })

    return { rowEdit, cellEdit, modalEdit }
  }

  /** 初始化展开功能状态 */
  const initExpandState = () => {
    return useTableExpand({
      data: computed(() => data()),
      rowKey,
      childRowKey: (child: DataRecord) => child.id as DataTableRowKey,

      get defaultExpandedKeys() {
        return getConfig().defaultExpandedKeys
      },
      get onLoadData() {
        return getConfig().onLoadExpandData
      },
      onError: (error: unknown, row: DataRecord) => {
        const handler = getConfig().onExpandError
        if (handler) handler(error, row)
        else feedback.error(t('table.loadFailed'), error)
      },
      get renderContent() {
        return getConfig().renderExpandContent as any
      },
      get rowExpandable() {
        return getConfig().rowExpandable
      },
      get enableSelection() {
        return getConfig().enableSelection
      },
      get defaultCheckedKeys() {
        return getConfig().defaultCheckedKeys
      },
      get rowCheckable() {
        return getConfig().rowCheckable
      },
      get maxSelection() {
        return getConfig().maxSelection
      },
      get enableChildSelection() {
        return getConfig().enableChildSelection
      },
      get childRowCheckable() {
        return getConfig().childRowCheckable
      },
      get enableParentChildLink() {
        return getConfig().enableParentChildLink
      },
      get parentChildLinkMode() {
        return getConfig().parentChildLinkMode
      },

      onExpandChange: eventHandlers.onExpandChange,
      onSelectionChange: eventHandlers.onSelectionChange as any,
      onChildSelectionChange: eventHandlers.onChildSelectionChange,
    })
  }

  /** 初始化动态行功能状态 */
  const initDynamicRowsState = () => {
    return useDynamicRows(
      computed(() => data()),
      computed<DynamicRowsOptions<DataRecord>>(() => ({
        ...getConfig().dynamicRows,
        enabled: Boolean(getConfig().dynamicRows),
        feedback: getConfig().feedback,
        locale: getConfig().locale,
        onRowChange: eventHandlers.onRowChange,
        onSelectionChange: eventHandlers.onRowSelectionChange,
        onRowAdd: eventHandlers.onRowAdd,
        onRowDelete: eventHandlers.onRowDelete,
        onRowCopy: eventHandlers.onRowCopy,
        onRowMove: eventHandlers.onRowMove,
      }))
    )
  }

  /* 初始化所有功能状态 */
  const editStates = initEditStates()
  const expandState = initExpandState()
  const dynamicRowsState = initDynamicRowsState()

  /* ================= 统一的状态管理器 ================= */

  /** 创建统一的状态管理器 */
  const createStateManager = () => {
    return {
      /* 编辑控制 */
      edit: {
        /** 开始编辑 */
        start(rowKey: DataTableRowKey, columnKey?: string) {
          const mode = getConfig().editMode
          if (mode === 'modal') editStates.modalEdit.startEdit(rowKey)
          else if (mode === 'cell' && columnKey)
            editStates.cellEdit.startEditCell(rowKey, columnKey)
          else if (mode === 'row' || mode === 'both')
            editStates.rowEdit.startEditRow(rowKey)
        },

        /** 取消编辑 */
        cancel() {
          if (editStates.modalEdit.isModalVisible.value)
            editStates.modalEdit.cancelEdit()
          else if (editStates.cellEdit.editingCell.value.rowKey !== null)
            editStates.cellEdit.cancelEditCell()
          else if (editStates.rowEdit.editingRowKey.value !== null)
            editStates.rowEdit.cancelEditRow()
        },

        /** 保存编辑 */
        async save() {
          if (editStates.modalEdit.isModalVisible.value)
            await editStates.modalEdit.saveEdit()
          else if (editStates.cellEdit.editingCell.value.rowKey !== null)
            await editStates.cellEdit.saveEditCell()
          else if (editStates.rowEdit.editingRowKey.value !== null)
            await editStates.rowEdit.saveEditRow()
        },

        /** 是否正在编辑 */
        isEditing(rowKey: DataTableRowKey, columnKey?: string) {
          if (getConfig().editMode === 'modal')
            return editStates.modalEdit.isEditingRow(rowKey)
          if (columnKey)
            return editStates.cellEdit.isEditingCell(rowKey, columnKey)
          return editStates.rowEdit.isEditingRow(rowKey)
        },

        /** 获取当前编辑数据 */
        getEditingData() {
          if (editStates.modalEdit.isModalVisible.value)
            return editStates.modalEdit.editingData.value
          if (editStates.rowEdit.editingRowKey.value !== null) {
            return editStates.rowEdit.getEditingRowData(
              editStates.rowEdit.editingRowKey.value!
            )
          }
          return null
        },
      },

      /* 展开控制 */
      expand: {
        /** 展开行 */
        async row(rowKey: DataTableRowKey) {
          if (expandState) {
            const currentKeys = [...expandState.expandedKeys.value]
            if (!currentKeys.includes(rowKey)) {
              currentKeys.push(rowKey)
              expandState.handleExpandChange(currentKeys)
            }
          }
        },

        /** 折叠行 */
        collapse(rowKey: DataTableRowKey) {
          if (expandState) {
            const currentKeys = expandState.expandedKeys.value.filter(
              key => key !== rowKey
            )
            expandState.handleExpandChange(currentKeys)
          }
        },

        /** 展开折叠切换 */
        async toggle(rowKey: DataTableRowKey) {
          if (expandState?.expandedKeys.value.includes(rowKey)) {
            this.collapse(rowKey)
          } else {
            await this.row(rowKey)
          }
        },

        /** 展开所有行 */
        async all() {
          await expandState?.expandAll()
        },

        /** 折叠所有行 */
        collapseAll() {
          expandState?.collapseAll()
        },

        /** 检查行是否已展开 */
        isExpanded(rowKey: DataTableRowKey) {
          return expandState?.expandedKeys.value.includes(rowKey) ?? false
        },
      },

      /* 选择控制 */
      selection: {
        /** 选择指定行 */
        select(rowKey: DataTableRowKey) {
          if (
            expandState?.checkedKeys.value &&
            !expandState.checkedKeys.value.includes(rowKey)
          ) {
            const newKeys = [...expandState.checkedKeys.value, rowKey]
            expandState.handleSelectionChange(newKeys)
          }
        },

        /** 取消选择指定行 */
        unselect(rowKey: DataTableRowKey) {
          if (expandState?.checkedKeys.value) {
            const newKeys = expandState.checkedKeys.value.filter(
              key => key !== rowKey
            )
            expandState.handleSelectionChange(newKeys)
          }
        },

        /** 选择所有行 */
        all() {
          expandState?.selectAll()
        },

        /** 清除所有行选择 */
        clear() {
          expandState?.clearSelection()
        },

        /** 检查行是否已选择 */
        isSelected(rowKey: DataTableRowKey) {
          return expandState?.checkedKeys.value.includes(rowKey) ?? false
        },

        /** 获取所有已选择的行数据 */
        getSelected() {
          if (!expandState?.checkedKeys.value) return []
          return data().filter(row =>
            expandState!.checkedKeys.value.includes(rowKey(row))
          )
        },
      },

      /* 子选择控制 */
      childSelection: {
        /** 选择指定父行下的子行 */
        select(parentKey: DataTableRowKey, childKey: DataTableRowKey) {
          if (expandState?.childSelections.value) {
            const current =
              expandState.childSelections.value.get(parentKey) || []
            if (!current.includes(childKey)) {
              const newSelection = [...current, childKey]
              expandState.childSelections.value.set(parentKey, newSelection)
              emit('child-selection-change', parentKey, newSelection, [])
            }
          }
        },

        /** 取消选择指定父行下的子行 */
        unselect(parentKey: DataTableRowKey, childKey: DataTableRowKey) {
          if (expandState?.childSelections.value) {
            const current =
              expandState.childSelections.value.get(parentKey) || []
            const newSelection = current.filter(k => k !== childKey)
            expandState.childSelections.value.set(parentKey, newSelection)
            emit('child-selection-change', parentKey, newSelection, [])
          }
        },

        /** 选择指定父行下的所有子行 */
        selectAll(parentKey: DataTableRowKey) {
          if (
            expandState?.childSelections.value &&
            expandState.expandDataMap?.value
          ) {
            const expandData =
              expandState.expandDataMap.value.get(parentKey) || []
            const allChildKeys = expandData.map(
              (child: DataRecord) => child.id as DataTableRowKey
            )
            expandState.childSelections.value.set(parentKey, allChildKeys)
            emit('child-selection-change', parentKey, allChildKeys, expandData)
          }
        },

        /** 清除指定父行下的所有子行选择 */
        clear(parentKey: DataTableRowKey) {
          if (expandState?.childSelections.value) {
            expandState.childSelections.value.set(parentKey, [])
            emit('child-selection-change', parentKey, [], [])
          }
        },

        /** 获取指定父行下所有已选择的子行数据 */
        getSelected(parentKey: DataTableRowKey) {
          if (
            !expandState?.childSelections.value ||
            !expandState.expandDataMap?.value
          ) {
            return []
          }
          const selectedKeys =
            expandState.childSelections.value.get(parentKey) || []
          const expandData =
            expandState.expandDataMap.value.get(parentKey) || []
          return expandData.filter((child: DataRecord) =>
            selectedKeys.includes(child.id as DataTableRowKey)
          )
        },
      },

      /* 动态行控制 */
      dynamicRows: {
        /** 添加行 */
        add() {
          dynamicRowsState?.addRow()
        },
        /** 插入行 */
        insert() {
          dynamicRowsState?.insertRow()
        },

        /** 删除行 */
        delete() {
          dynamicRowsState?.deleteRow()
        },
        /** 复制行 */
        copy() {
          dynamicRowsState?.copyRow()
        },
        /** 上移动态行 */
        moveUp() {
          dynamicRowsState?.moveRowUp()
        },
        /** 下移动态行 */
        moveDown() {
          dynamicRowsState?.moveRowDown()
        },
        /** 清空动态行数据 */
        clearSelection() {
          dynamicRowsState?.clearSelection()
        },
        /** 获取当前选中的动态行数据 */
        getSelected() {
          return dynamicRowsState?.selectedRowData.value || null
        },

        /** 打印表格 */
        async print(elementRef?: HTMLElement) {
          if (dynamicRowsState && elementRef) {
            await dynamicRowsState.handlePrint(
              shallowRef<HTMLElement | undefined>(elementRef)
            )
          }
        },

        /** 导出表格数据 */
        async download(elementRef?: HTMLElement, filename?: string) {
          if (dynamicRowsState && elementRef) {
            await dynamicRowsState.handleDownload(
              shallowRef<HTMLElement | undefined>(elementRef),
              filename
            )
          }
        },
      },

      /** 清除所有选择 */
      clearAllSelections() {
        expandState?.clearAllSelections()
      },
    }
  }

  const stateManager = createStateManager()

  /* ================= 计算属性 ================= */

  const expandedKeys = computed(() => expandState?.expandedKeys.value ?? [])
  const checkedKeys = computed(() => expandState?.checkedKeys.value ?? [])

  /* ================= 返回管理器实例 ================= */

  return {
    /* 编辑状态 */
    editStates,

    /* 功能状态 */
    expandState,
    dynamicRowsState,

    /* 状态管理器 */
    stateManager,

    /* 计算属性 */
    expandedKeys,
    checkedKeys,

    /* 事件处理器 */
    eventHandlers,
  }
}
