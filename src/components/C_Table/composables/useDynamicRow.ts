/*
 * @Description: 表格动态行操作 Hooks — 增行、插行、删除行、复制行、调整行、单选功能、打印功能
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
 */

import {
  h,
  ref,
  computed,
  onBeforeUnmount,
  type VNode,
  type Ref,
  type VNodeChild,
} from 'vue'
import {
  type DataTableRowKey,
  NButton,
  NTooltip,
  NModal,
  NButtonGroup,
  NSpace,
  useMessage,
} from 'naive-ui/es'
import {
  usePrintWatermark,
  printPresets,
  type PrintWatermarkOptions,
} from './usePrintWatermark'
import type { TableColumn, DataRecord } from '../types'
import C_Icon from '../../C_Icon/index.vue'

/* ================= 类型定义 ================= */
export interface DynamicRowsOptions<T extends DataRecord = DataRecord> {
  /* 基础配置 */
  rowKey?: string | ((row: T) => DataTableRowKey)
  defaultRowData?: () => T

  /* 功能开关 */
  enableRadioSelection?: boolean
  enableAdd?: boolean
  enableInsert?: boolean
  enableDelete?: boolean
  enableCopy?: boolean
  enableMove?: boolean
  enablePrint?: boolean

  /* 打印配置 */
  printOptions?: PrintWatermarkOptions
  printPreset?: 'table' | 'form' | 'report'
  printWatermarkText?: string
  printTargetSelector?: string

  /* 交互配置 */
  confirmDelete?: boolean
  deleteConfirmText?: string

  /* 事件回调 */
  onRowChange?: (data: T[]) => void
  onSelectionChange?: (
    selectedKey: DataTableRowKey | null,
    selectedRow: T | null
  ) => void
  onRowAdd?: (newRow: T) => void
  onRowDelete?: (deletedRow: T, index: number) => void
  onRowCopy?: (originalRow: T, newRow: T) => void
  onRowMove?: (row: T, fromIndex: number, toIndex: number) => void
}

export interface DynamicRowsReturn<T extends DataRecord = DataRecord> {
  /* 状态 */
  selectedRowKey: Ref<DataTableRowKey | null>
  selectedRowData: Ref<T | null>
  selectedRowIndex: Ref<number>
  canMoveUp: Ref<boolean>
  canMoveDown: Ref<boolean>
  deleteConfirmVisible: Ref<boolean>
  printLoading: Ref<boolean>
  printProgress: Ref<number>

  /* 行操作方法 */
  addRow: () => void
  insertRow: () => void
  deleteRow: () => void
  confirmDelete: () => void
  copyRow: () => void
  moveRowUp: () => void
  moveRowDown: () => void

  /* 选择方法 */
  selectRow: (key: DataTableRowKey) => void
  clearSelection: () => void

  /* 打印方法 */
  handlePrint: (elementRef: Ref<HTMLElement | undefined>) => Promise<void>
  handleDownload: (
    elementRef: Ref<HTMLElement | undefined>,
    filename?: string
  ) => Promise<void>
  handleQuickPrint: (elementRef: Ref<HTMLElement | undefined>) => Promise<void>

  /* 列增强方法 */
  enhanceColumns: (columns: TableColumn<T>[]) => TableColumn<T>[]

  /* 工具栏渲染 */
  renderToolbar: () => VNodeChild
  renderConfirmModal: () => VNodeChild
}

/* ================= 辅助函数 ================= */

/** 生成唯一ID */
function generateUniqueId(): string {
  return `row_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/** 获取行键值 */
function getRowKey<T extends DataRecord>(
  row: T,
  rowKey: string | ((row: T) => DataTableRowKey)
): DataTableRowKey {
  return typeof rowKey === 'function' ? rowKey(row) : (row as any)[rowKey]
}

/** 创建新行数据 */
function createNewRow<T extends DataRecord>(
  defaultRowData: (() => T) | undefined,
  rowKey: string | ((row: T) => DataTableRowKey)
): T {
  const newRow = defaultRowData?.() || ({} as T)
  const keyField = typeof rowKey === 'string' ? rowKey : 'id'
  return {
    ...newRow,
    [keyField]: generateUniqueId(),
  } as T
}

/* ================= 主函数 ================= */

/**
 * 表格动态行操作功能组合
 */
export function useDynamicRows<T extends DataRecord = DataRecord>(
  data: Ref<T[]>,
  options: DynamicRowsOptions<T> = {}
): DynamicRowsReturn<T> {
  const message = useMessage()

  /* 默认配置 */
  const finalOptions = {
    rowKey: 'id',
    enableRadioSelection: true,
    enableAdd: true,
    enableInsert: true,
    enableDelete: true,
    enableCopy: true,
    enableMove: true,
    enablePrint: true,
    confirmDelete: true,
    deleteConfirmText: '确定要删除选中的行吗？此操作不可撤销。',
    printPreset: 'table' as const,
    printTargetSelector: '.c-table-wrapper',
    defaultRowData: () => ({}) as T,
    ...options,
  }

  /* 状态 */
  const selectedRowKey = ref<DataTableRowKey | null>(null)
  const deleteConfirmVisible = ref(false)

  const selectedRowData = computed(() => {
    if (selectedRowKey.value === null) return null
    return (
      data.value.find(
        row => getRowKey(row, finalOptions.rowKey) === selectedRowKey.value
      ) || null
    )
  })

  const selectedRowIndex = computed(() => {
    if (!selectedRowData.value) return -1
    return data.value.findIndex(row => row === selectedRowData.value)
  })

  const canMoveUp = computed(() => selectedRowIndex.value > 0)
  const canMoveDown = computed(
    () =>
      selectedRowIndex.value >= 0 &&
      selectedRowIndex.value < data.value.length - 1
  )

  /* 打印功能 */
  const {
    loading: printLoading,
    progress: printProgress,
    printWithWatermark,
    downloadScreenshot,
    quickPrint,
  } = usePrintWatermark()

  /** 获取打印配置选项 */
  const getPrintOptions = (): PrintWatermarkOptions => {
    if (finalOptions.printOptions) {
      return finalOptions.printOptions
    }

    const preset = finalOptions.printPreset || 'table'
    const baseConfig = printPresets[preset]

    if (finalOptions.printWatermarkText && baseConfig.watermark) {
      return {
        ...baseConfig,
        watermark: {
          ...baseConfig.watermark,
          text: finalOptions.printWatermarkText,
        },
      }
    }

    return baseConfig
  }

  /** 更新表格数据 */
  const updateData = (newData: T[]) => {
    data.value = newData
    finalOptions.onRowChange?.(newData)
  }

  /** 添加新行到表格末尾 */
  const addRow = () => {
    if (!finalOptions.enableAdd) return

    const newRow = createNewRow(
      finalOptions.defaultRowData,
      finalOptions.rowKey
    )
    const newData = [...data.value, newRow]
    updateData(newData)
    finalOptions.onRowAdd?.(newRow)
    message.success('添加行成功')
  }

  /** 在选中行后插入新行 */
  const insertRow = () => {
    if (!finalOptions.enableInsert || !selectedRowData.value) {
      message.warning('请先选择一行数据')
      return
    }

    const newRow = createNewRow(
      finalOptions.defaultRowData,
      finalOptions.rowKey
    )
    const newData = [...data.value]
    newData.splice(selectedRowIndex.value + 1, 0, newRow)
    updateData(newData)
    finalOptions.onRowAdd?.(newRow)
    message.success('插入行成功')
  }

  /** 删除选中的行 */
  const deleteRow = () => {
    if (!finalOptions.enableDelete || !selectedRowData.value) {
      message.warning('请先选择要删除的行')
      return
    }

    if (finalOptions.confirmDelete) {
      deleteConfirmVisible.value = true
    } else {
      confirmDeleteFn()
    }
  }

  /** 确认删除操作 */
  const confirmDeleteFn = () => {
    if (!selectedRowData.value) return

    const deletedRow = selectedRowData.value
    const deletedIndex = selectedRowIndex.value

    const newData = data.value.filter((_, index) => index !== deletedIndex)
    updateData(newData)

    selectedRowKey.value = null
    finalOptions.onSelectionChange?.(null, null)
    finalOptions.onRowDelete?.(deletedRow, deletedIndex)

    message.success('删除行成功')
    deleteConfirmVisible.value = false
  }

  /** 复制选中的行 */
  const copyRow = () => {
    if (!finalOptions.enableCopy || !selectedRowData.value) {
      message.warning('请先选择要复制的行')
      return
    }

    const originalRow = selectedRowData.value
    const keyField =
      typeof finalOptions.rowKey === 'string' ? finalOptions.rowKey : 'id'
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { [keyField]: _originalKey, ...rowData } = originalRow as Record<
      string,
      unknown
    >

    const newRow = {
      ...rowData,
      [keyField]: generateUniqueId(),
    } as T

    const newData = [...data.value, newRow]
    updateData(newData)
    finalOptions.onRowCopy?.(originalRow, newRow)
    message.success('复制行成功')
  }

  /** 将选中行向上移动 */
  const moveRowUp = () => {
    if (!finalOptions.enableMove || !canMoveUp.value) return

    const currentIndex = selectedRowIndex.value
    const newData = [...data.value]
    const movingRow = newData[currentIndex]

    ;[newData[currentIndex], newData[currentIndex - 1]] = [
      newData[currentIndex - 1],
      newData[currentIndex],
    ]

    updateData(newData)
    finalOptions.onRowMove?.(movingRow, currentIndex, currentIndex - 1)
    message.success('行已上移')
  }

  /** 将选中行向下移动 */
  const moveRowDown = () => {
    if (!finalOptions.enableMove || !canMoveDown.value) return

    const currentIndex = selectedRowIndex.value
    const newData = [...data.value]
    const movingRow = newData[currentIndex]

    ;[newData[currentIndex], newData[currentIndex + 1]] = [
      newData[currentIndex + 1],
      newData[currentIndex],
    ]

    updateData(newData)
    finalOptions.onRowMove?.(movingRow, currentIndex, currentIndex + 1)
    message.success('行已下移')
  }

  /** 选中指定行 */
  const selectRow = (key: DataTableRowKey) => {
    const row = data.value.find(
      row => getRowKey(row, finalOptions.rowKey) === key
    )
    if (row) {
      selectedRowKey.value = key
      finalOptions.onSelectionChange?.(key, row)
    }
  }

  /** 清空选择状态 */
  const clearSelection = () => {
    selectedRowKey.value = null
    finalOptions.onSelectionChange?.(null, null)
  }

  /** 处理打印操作 */
  const handlePrint = async (elementRef: Ref<HTMLElement | undefined>) => {
    if (!elementRef.value) {
      message.error('打印元素未找到')
      return
    }

    const printOptions = getPrintOptions()
    await printWithWatermark(elementRef.value, printOptions)
  }

  /** 处理下载操作 */
  const handleDownload = async (
    elementRef: Ref<HTMLElement | undefined>,
    filename?: string
  ) => {
    if (!elementRef.value) {
      message.error('下载元素未找到')
      return
    }

    const printOptions = getPrintOptions()
    await downloadScreenshot(elementRef.value, filename, printOptions)
  }

  /** 处理快速打印操作 */
  const handleQuickPrint = async (elementRef: Ref<HTMLElement | undefined>) => {
    if (!elementRef.value) {
      message.error('打印元素未找到')
      return
    }

    const watermarkText = finalOptions.printWatermarkText || 'Robot Admin'
    await quickPrint(elementRef.value, watermarkText)
  }

  /** 增强表格列配置，添加单选列 */
  const enhanceColumns = (columns: TableColumn<T>[]): TableColumn<T>[] => {
    const enhancedColumns = [...columns]

    if (finalOptions.enableRadioSelection) {
      enhancedColumns.unshift({
        key: '_radio_selection',
        title: '选择',
        width: 80,
        align: 'center',
        editable: false,
        render: (rowData: T) => {
          const rowKeyVal = getRowKey(rowData, finalOptions.rowKey)
          return h('div', { class: 'flex justify-center' }, [
            h('input', {
              type: 'radio',
              name: 'table-radio-selection',
              checked: selectedRowKey.value === rowKeyVal,
              class: 'cursor-pointer accent-blue-500 scale-110',
              onChange: (e: Event) => {
                if ((e.target as HTMLInputElement).checked) {
                  selectRow(rowKeyVal)
                }
              },
            }),
          ])
        },
      } as TableColumn<T>)
    }

    return enhancedColumns
  }

  /** 渲染工具栏 */
  const renderToolbar = (): VNodeChild => {
    const buttons: VNode[] = []

    if (finalOptions.enablePrint) {
      buttons.push(
        h(
          NButton,
          {
            loading: printLoading.value,
            type: 'primary',
            ghost: true,
            onClick: async () => {
              try {
                const tableElement = document.querySelector(
                  finalOptions.printTargetSelector
                )
                if (tableElement) {
                  await handlePrint(ref(tableElement as HTMLElement))
                } else {
                  console.warn('未找到表格容器元素')
                }
              } catch (error) {
                console.error('打印失败:', error)
              }
            },
          },
          {
            icon: () => h(C_Icon, { name: 'mdi:printer', title: '打印' }),
            default: () => '打印',
          }
        )
      )
    }

    const rowButtons: VNode[] = []

    if (finalOptions.enableAdd) {
      rowButtons.push(
        h(
          NButton,
          {
            onClick: addRow,
            type: 'primary',
          },
          {
            icon: () => h(C_Icon, { name: 'mdi:plus', title: '增行' }),
            default: () => '增行',
          }
        )
      )
    }

    if (finalOptions.enableInsert) {
      rowButtons.push(
        h(
          NTooltip,
          {
            disabled: !!selectedRowData.value,
          },
          {
            trigger: () =>
              h(
                NButton,
                {
                  onClick: insertRow,
                  disabled: !selectedRowData.value,
                  type: 'primary',
                  ghost: true,
                },
                {
                  icon: () =>
                    h(C_Icon, {
                      name: 'mdi:table-row-plus-after',
                      title: '插行',
                    }),
                  default: () => '插行',
                }
              ),
            default: () => '请先选择一行数据',
          }
        )
      )
    }

    if (finalOptions.enableDelete) {
      rowButtons.push(
        h(
          NTooltip,
          {
            disabled: !!selectedRowData.value,
          },
          {
            trigger: () =>
              h(
                NButton,
                {
                  onClick: deleteRow,
                  disabled: !selectedRowData.value,
                  type: 'error',
                  ghost: true,
                },
                {
                  icon: () =>
                    h(C_Icon, { name: 'mdi:delete', title: '删除行' }),
                  default: () => '删除行',
                }
              ),
            default: () => '请先选择要删除的行',
          }
        )
      )
    }

    if (finalOptions.enableCopy) {
      rowButtons.push(
        h(
          NTooltip,
          {
            disabled: !!selectedRowData.value,
          },
          {
            trigger: () =>
              h(
                NButton,
                {
                  onClick: copyRow,
                  disabled: !selectedRowData.value,
                  type: 'info',
                  ghost: true,
                },
                {
                  icon: () =>
                    h(C_Icon, { name: 'mdi:content-copy', title: '复制行' }),
                  default: () => '复制行',
                }
              ),
            default: () => '请先选择要复制的行',
          }
        )
      )
    }

    if (finalOptions.enableMove) {
      rowButtons.push(
        h(
          NTooltip,
          {
            disabled: canMoveUp.value,
          },
          {
            trigger: () =>
              h(
                NButton,
                {
                  onClick: moveRowUp,
                  disabled: !canMoveUp.value,
                  type: 'warning',
                  ghost: true,
                },
                {
                  icon: () =>
                    h(C_Icon, { name: 'mdi:arrow-up', title: '上移' }),
                  default: () => '上移',
                }
              ),
            default: () =>
              !selectedRowData.value ? '请先选择数据' : '已经是第一行',
          }
        ),
        h(
          NTooltip,
          {
            disabled: canMoveDown.value,
          },
          {
            trigger: () =>
              h(
                NButton,
                {
                  onClick: moveRowDown,
                  disabled: !canMoveDown.value,
                  type: 'warning',
                  ghost: true,
                },
                {
                  icon: () =>
                    h(C_Icon, { name: 'mdi:arrow-down', title: '下移' }),
                  default: () => '下移',
                }
              ),
            default: () =>
              !selectedRowData.value ? '请先选择数据' : '已经是最后一行',
          }
        )
      )
    }

    if (rowButtons.length > 0) {
      buttons.push(h(NButtonGroup, {}, () => rowButtons))
    }

    return h('div', { class: 'dynamic-rows-toolbar mb-4 flex justify-end' }, [
      h(NSpace, {}, () => buttons),
    ])
  }

  /** 渲染删除确认模态框 */
  const renderConfirmModal = (): VNodeChild => {
    return h(NModal, {
      show: deleteConfirmVisible.value,
      'onUpdate:show': (show: boolean) => {
        deleteConfirmVisible.value = show
      },
      preset: 'dialog',
      title: '确认删除',
      content: finalOptions.deleteConfirmText,
      positiveText: '确认删除',
      negativeText: '取消',
      onPositiveClick: confirmDeleteFn,
    })
  }

  /* 组件卸载时清理 */
  onBeforeUnmount(() => {
    selectedRowKey.value = null
    deleteConfirmVisible.value = false
  })

  return {
    /* 状态 */
    selectedRowKey,
    selectedRowData,
    selectedRowIndex,
    canMoveUp,
    canMoveDown,
    deleteConfirmVisible,
    printLoading,
    printProgress,

    /* 行操作方法 */
    addRow,
    insertRow,
    deleteRow,
    confirmDelete: confirmDeleteFn,
    copyRow,
    moveRowUp,
    moveRowDown,

    /* 选择方法 */
    selectRow,
    clearSelection,

    /* 打印方法 */
    handlePrint,
    handleDownload,
    handleQuickPrint,

    /* 列增强方法 */
    enhanceColumns,

    /* 工具栏渲染 */
    renderToolbar,
    renderConfirmModal,
  }
}
