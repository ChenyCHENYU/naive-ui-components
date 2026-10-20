/*
 * @Description: 表格动态行操作 Hooks — 增行、插行、删除行、复制行、调整行、单选功能、打印功能
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
 */

import {
  h,
  ref,
  shallowRef,
  computed,
  reactive,
  toValue,
  watch,
  getCurrentScope,
  onScopeDispose,
  type MaybeRefOrGetter,
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
} from 'naive-ui'
import {
  usePrintWatermark,
  printPresets,
  type PrintWatermarkOptions,
} from './usePrintWatermark'
import type { TableColumn, DataRecord } from '../types'
import C_Icon from '../../C_Icon/index.vue'
import { cloneData } from '../../../utils/data'
import {
  useComponentFeedback,
  useComponentLocale,
  type ComponentFeedback,
  type ComponentLocale,
} from '../../../config'

/* ================= 类型定义 ================= */
interface DynamicRowsBaseOptions<T extends object> {
  /** 总开关；关闭时公开方法保持安全 no-op */
  enabled?: boolean
  /* 基础配置 */
  rowKey?: string | ((row: T) => DataTableRowKey)
  /** 新增返回完整业务行；复制时可接收原行副本，函数 rowKey 需返回完整的新副本。 */
  defaultRowData?: (source?: T) => T

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
  feedback?: ComponentFeedback
  locale?: ComponentLocale

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

/** 明确业务模型必须由工厂创建完整记录；开放记录保留原有空行兼容入口。 */
export type DynamicRowsOptions<T extends object = DataRecord> =
  DynamicRowsBaseOptions<T> &
    (string extends keyof T
      ? unknown
      : {
          defaultRowData: (source?: T) => T
        })

export interface DynamicRowsReturn<T extends object = DataRecord> {
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
  renderToolbar: (target?: HTMLElement) => VNodeChild
  renderConfirmModal: () => VNodeChild
}

/* ================= 辅助函数 ================= */

/** 生成唯一ID */
function generateUniqueId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return `row_${crypto.randomUUID()}`
  }
  return `row_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/** 获取行键值 */
function getRowKey<T extends object>(
  row: T,
  rowKey: string | ((row: T) => DataTableRowKey)
): DataTableRowKey {
  return typeof rowKey === 'function'
    ? rowKey(row)
    : (Reflect.get(row, rowKey) as DataTableRowKey)
}

/** 工厂拥有业务主键；字符串键复制只替换身份，函数键复制采用工厂给出的完整新行。 */
function createNewRow<T extends object>(
  factory: ((source?: T) => T) | undefined,
  rowKey: string | ((row: T) => DataTableRowKey),
  source?: T
): T | null {
  if (factory) {
    const created = factory(
      source === undefined ? undefined : cloneData(source)
    )
    if (!created || typeof created !== 'object' || Array.isArray(created))
      return null
    const next = cloneData(created)
    return source && typeof rowKey === 'string'
      ? { ...cloneData(source), [rowKey]: Reflect.get(next, rowKey) }
      : next
  }
  // 只有开放记录的字符串字段拥有兼容生成规则；函数键不能猜测其字段组成。
  if (typeof rowKey !== 'string') return null
  return {
    ...(source ? cloneData(source) : {}),
    [rowKey]: generateUniqueId(),
  } as T
}

/* ================= 主函数 ================= */

/**
 * 表格动态行操作功能组合
 */
export function useDynamicRows<T extends object = DataRecord>(
  data: Readonly<Ref<T[]>>,
  ...args: string extends keyof T
    ? [options?: MaybeRefOrGetter<DynamicRowsOptions<T>>]
    : [options: MaybeRefOrGetter<DynamicRowsOptions<T>>]
): DynamicRowsReturn<T> {
  const options = args[0] ?? {}
  /* 默认配置 */
  const defaults = {
    enabled: true,
    rowKey: 'id',
    enableRadioSelection: true,
    enableAdd: true,
    enableInsert: true,
    enableDelete: true,
    enableCopy: true,
    enableMove: true,
    enablePrint: true,
    confirmDelete: true,
    deleteConfirmText: '',
    printPreset: 'table' as const,
    printTargetSelector: '.c-table-wrapper',
  }
  const finalOptions = reactive({
    ...defaults,
    ...toValue(options),
  }) as DynamicRowsBaseOptions<T> &
    Omit<typeof defaults, 'rowKey'> & {
      rowKey: NonNullable<DynamicRowsBaseOptions<T>['rowKey']>
    }
  watch(
    () => toValue(options),
    next => {
      const target = finalOptions as unknown as Record<string, unknown>
      Object.keys(target).forEach(key => delete target[key])
      Object.assign(target, defaults, next)
    },
    { deep: true }
  )
  const feedback = useComponentFeedback(() => finalOptions.feedback)
  const { t } = useComponentLocale(() => finalOptions.locale)
  const radioGroupName = `c-table-radio-${generateUniqueId()}`

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
    finalOptions.onRowChange?.(newData)
  }

  const canInsertRow = (row: T) => {
    const key = getRowKey(row, finalOptions.rowKey)
    if (
      ((typeof key === 'string' && key !== '') ||
        (typeof key === 'number' && Number.isFinite(key))) &&
      !data.value.some(
        existing => getRowKey(existing, finalOptions.rowKey) === key
      )
    )
      return true
    feedback.warning(t('table.invalidRowKeys', { count: 1 }))
    return false
  }

  /** 拒绝无效工厂、主键和重复身份，失败时不发送数据变更。 */
  const createRow = (source?: T): T | null => {
    try {
      const next = createNewRow(
        finalOptions.defaultRowData,
        finalOptions.rowKey,
        source
      )
      if (next) return canInsertRow(next) ? next : null
      feedback.warning(t('table.invalidRowKeys', { count: 1 }))
    } catch (error) {
      feedback.error(
        t('table.actionFailed', {
          action: t(source ? 'table.copyRow' : 'table.addRow'),
        }),
        error
      )
    }
    return null
  }

  /** 添加新行到表格末尾 */
  const addRow = () => {
    if (!finalOptions.enabled || !finalOptions.enableAdd) return

    const newRow = createRow()
    if (!newRow) return
    const newData = [...data.value, newRow]
    updateData(newData)
    finalOptions.onRowAdd?.(newRow)
    feedback.success(t('table.addRowSuccess'))
  }

  /** 在选中行后插入新行 */
  const insertRow = () => {
    if (
      !finalOptions.enabled ||
      !finalOptions.enableInsert ||
      !selectedRowData.value
    ) {
      feedback.warning(t('table.selectRowFirst'))
      return
    }

    const newRow = createRow()
    if (!newRow) return
    const newData = [...data.value]
    newData.splice(selectedRowIndex.value + 1, 0, newRow)
    updateData(newData)
    finalOptions.onRowAdd?.(newRow)
    feedback.success(t('table.insertRowSuccess'))
  }

  /** 删除选中的行 */
  const deleteRow = () => {
    if (
      !finalOptions.enabled ||
      !finalOptions.enableDelete ||
      !selectedRowData.value
    ) {
      feedback.warning(t('table.selectDeleteRowFirst'))
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

    feedback.success(t('table.deleteRowSuccess'))
    deleteConfirmVisible.value = false
  }

  /** 复制选中的行 */
  const copyRow = () => {
    if (
      !finalOptions.enabled ||
      !finalOptions.enableCopy ||
      !selectedRowData.value
    ) {
      feedback.warning(t('table.selectCopyRowFirst'))
      return
    }

    const originalRow = selectedRowData.value
    const newRow = createRow(originalRow)
    if (!newRow) return
    const newData = [...data.value, newRow]
    updateData(newData)
    finalOptions.onRowCopy?.(originalRow, newRow)
    feedback.success(t('table.copyRowSuccess'))
  }

  /** 将选中行向上移动 */
  const moveRowUp = () => {
    if (!finalOptions.enabled || !finalOptions.enableMove || !canMoveUp.value)
      return

    const currentIndex = selectedRowIndex.value
    const newData = [...data.value]
    const movingRow = newData[currentIndex]

    ;[newData[currentIndex], newData[currentIndex - 1]] = [
      newData[currentIndex - 1],
      newData[currentIndex],
    ]

    updateData(newData)
    finalOptions.onRowMove?.(movingRow, currentIndex, currentIndex - 1)
    feedback.success(t('table.moveUpSuccess'))
  }

  /** 将选中行向下移动 */
  const moveRowDown = () => {
    if (!finalOptions.enabled || !finalOptions.enableMove || !canMoveDown.value)
      return

    const currentIndex = selectedRowIndex.value
    const newData = [...data.value]
    const movingRow = newData[currentIndex]

    ;[newData[currentIndex], newData[currentIndex + 1]] = [
      newData[currentIndex + 1],
      newData[currentIndex],
    ]

    updateData(newData)
    finalOptions.onRowMove?.(movingRow, currentIndex, currentIndex + 1)
    feedback.success(t('table.moveDownSuccess'))
  }

  /** 选中指定行 */
  const selectRow = (key: DataTableRowKey) => {
    if (!finalOptions.enabled) return
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
      feedback.error(t('table.printTargetMissing'))
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
      feedback.error(t('table.downloadTargetMissing'))
      return
    }

    const printOptions = getPrintOptions()
    await downloadScreenshot(elementRef.value, filename, printOptions)
  }

  /** 处理快速打印操作 */
  const handleQuickPrint = async (elementRef: Ref<HTMLElement | undefined>) => {
    if (!elementRef.value) {
      feedback.error(t('table.printTargetMissing'))
      return
    }

    const watermarkText = finalOptions.printWatermarkText || 'Robot Admin'
    await quickPrint(elementRef.value, watermarkText)
  }

  /** 增强表格列配置，添加单选列 */
  const enhanceColumns = (columns: TableColumn<T>[]): TableColumn<T>[] => {
    if (!finalOptions.enabled) return columns
    const enhancedColumns = [...columns]

    if (finalOptions.enabled && finalOptions.enableRadioSelection) {
      enhancedColumns.unshift({
        key: '_radio_selection',
        title: t('common.select'),
        width: 80,
        align: 'center',
        editable: false,
        render: (rowData: T) => {
          const rowKeyVal = getRowKey(rowData, finalOptions.rowKey)
          return h('div', { class: 'flex justify-center' }, [
            h('input', {
              type: 'radio',
              name: radioGroupName,
              'aria-label': t('common.select'),
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
  const renderToolbar = (target?: HTMLElement): VNodeChild => {
    if (!finalOptions.enabled) return null
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
                const tableElement =
                  target ??
                  document.querySelector(finalOptions.printTargetSelector)
                if (tableElement) {
                  await handlePrint(
                    shallowRef<HTMLElement | undefined>(
                      tableElement as HTMLElement
                    )
                  )
                } else {
                  feedback.warning(t('table.printTargetMissing'))
                }
              } catch (error) {
                feedback.error(t('table.printTargetMissing'), error)
              }
            },
          },
          {
            icon: () =>
              h(C_Icon, { name: 'mdi:printer', title: t('common.print') }),
            default: () => t('common.print'),
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
            icon: () =>
              h(C_Icon, { name: 'mdi:plus', title: t('table.addRow') }),
            default: () => t('table.addRow'),
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
                      title: t('table.insertRow'),
                    }),
                  default: () => t('table.insertRow'),
                }
              ),
            default: () => t('table.selectRowFirst'),
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
                    h(C_Icon, {
                      name: 'mdi:delete',
                      title: t('table.deleteRow'),
                    }),
                  default: () => t('table.deleteRow'),
                }
              ),
            default: () => t('table.selectDeleteRowFirst'),
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
                    h(C_Icon, {
                      name: 'mdi:content-copy',
                      title: t('table.copyRow'),
                    }),
                  default: () => t('table.copyRow'),
                }
              ),
            default: () => t('table.selectCopyRowFirst'),
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
                    h(C_Icon, {
                      name: 'mdi:arrow-up',
                      title: t('table.moveUp'),
                    }),
                  default: () => t('table.moveUp'),
                }
              ),
            default: () =>
              !selectedRowData.value
                ? t('table.selectRowFirst')
                : t('table.firstRow'),
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
                    h(C_Icon, {
                      name: 'mdi:arrow-down',
                      title: t('table.moveDown'),
                    }),
                  default: () => t('table.moveDown'),
                }
              ),
            default: () =>
              !selectedRowData.value
                ? t('table.selectRowFirst')
                : t('table.lastRow'),
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
      title: t('table.deleteTitle'),
      content: finalOptions.deleteConfirmText || t('table.deleteRowContent'),
      positiveText: t('table.confirmDeleteRow'),
      negativeText: t('common.cancel'),
      onPositiveClick: confirmDeleteFn,
    })
  }

  /* 组件卸载时清理 */
  if (getCurrentScope())
    onScopeDispose(() => {
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
