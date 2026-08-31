<!--
 * @Description: C_Table 超级表格组件（薄 UI 壳）
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
 *
 *   使用侧 API：
 *   <C_Table :columns="cols" :data="data" :loading="loading" :config="tableConfig" />
 *
 *   config 收拢了所有功能配置：edit / selection / expand / pagination / dynamicRows / toolbar / display
 *   列处理 → composables/useTableColumns.ts
 *   配置解析 → composables/useTableConfig.ts
 *   编辑/展开/动态行 → composables/useTableManager.ts
 -->

<template>
  <div
    ref="tableWrapperRef"
    class="c-table-wrapper"
  >
    <!-- 动态行工具栏 -->
    <component
      v-if="resolved.dynamicRows && tableManager.dynamicRowsState"
      :is="tableManager.dynamicRowsState.renderToolbar(tableWrapperRef)"
    />

    <!-- 表格工具栏 -->
    <div
      v-if="resolved.showToolbar"
      class="table-toolbar"
    >
      <div class="toolbar-left">
        <slot name="toolbar-left" />
      </div>
      <div class="toolbar-right">
        <slot name="toolbar-right" />
        <C_Icon
          v-if="resolved.exportConfig"
          name="mdi:download"
          size="18"
          :title="t('table.export')"
          clickable
          class="column-settings-btn"
          @click="handleExport()"
        />
        <C_Icon
          v-if="resolved.enableColumnSettings"
          name="mdi:cog"
          size="18"
          :title="t('table.settings')"
          clickable
          class="column-settings-btn"
          @click="showSettingsPanel = true"
        />
      </div>
    </div>

    <!-- 批量操作栏 -->
    <div
      v-if="resolved.batchActions?.enabled && batchSelectedCount > 0"
      class="batch-actions-bar"
    >
      <span class="batch-info">{{
        t('table.selectedCount', { count: batchSelectedCount })
      }}</span>
      <NSpace :size="8">
        <NButton
          v-for="action in resolved.batchActions.actions || []"
          :key="action.key"
          :type="(action.type as any) || 'default'"
          size="small"
          :loading="runningBatchActions.has(action.key)"
          :disabled="runningBatchActions.has(action.key)"
          @click="handleBatchAction(action)"
        >
          <template
            v-if="action.icon"
            #icon
          >
            <C_Icon
              :name="action.icon"
              size="14"
            />
          </template>
          {{ action.label }}
        </NButton>
        <NButton
          size="small"
          @click="clearBatchSelection"
          >{{ t('table.cancelSelection') }}</NButton
        >
      </NSpace>
    </div>

    <!-- 错误状态 -->
    <div
      v-if="resolved.error?.show"
      class="table-error-state"
    >
      <slot
        name="error"
        :error="resolved.error"
      >
        <div class="error-content">
          <C_Icon
            name="mdi:alert-circle-outline"
            size="48"
          />
          <p class="error-message">{{
            resolved.error.message || t('table.loadFailed')
          }}</p>
          <NButton
            v-if="resolved.error.onRetry"
            type="primary"
            size="small"
            @click="resolved.error.onRetry"
          >
            {{ t('common.retry') }}
          </NButton>
        </div>
      </slot>
    </div>

    <!-- 表格主体 -->
    <NDataTable
      v-if="!resolved.error?.show"
      ref="tableRef"
      v-bind="{ ...computedTableProps, ...$attrs }"
      :columns="computedColumns"
      :data="pagination.paginatedData.value"
      :loading="normalizedLoading"
      :row-key="resolvedRowKey"
      :expanded-row-keys="tableManager.expandedKeys.value"
      :checked-row-keys="crossPageCheckedKeys ?? tableManager.checkedKeys.value"
      @update:expanded-row-keys="tableManager.expandState?.handleExpandChange"
      @update:checked-row-keys="handleCheckedKeysChange"
      :scroll-x="computedScrollX"
      :virtual-scroll="resolved.virtualScroll"
      :min-row-height="
        resolved.virtualScroll ? resolved.virtualItemHeight : undefined
      "
      :max-height="
        resolved.virtualScroll ? resolved.virtualMaxHeight : resolved.maxHeight
      "
      :summary="summaryFn"
      :summary-placement="resolved.summaryPosition"
      :children-key="
        resolved.treeEnabled ? resolved.treeChildrenKey : undefined
      "
      :indent="resolved.treeEnabled ? resolved.treeIndent : undefined"
      :default-expand-all="
        resolved.treeEnabled ? resolved.treeDefaultExpandAll : undefined
      "
      style="width: 100%"
    />

    <!-- 分页 -->
    <NPagination
      v-if="pagination.paginationConfig.value"
      v-bind="pagination.paginationConfig.value"
      class="pagination-wrapper"
    />

    <!-- 编辑弹窗 -->
    <NModal
      v-if="resolved.editMode === 'modal' || resolved.editMode === 'both'"
      v-model:show="modalVisible"
      :title="resolved.modalTitle"
      :width="resolved.modalWidth"
      preset="card"
      :mask-closable="false"
      :close-on-esc="false"
      class="w60%"
      :closable="false"
    >
      <C_Form
        v-if="modalVisible && formOptions.length"
        ref="editFormRef"
        :key="formKey"
        v-model="localEditingData"
        :options="formOptions"
        :config="{
          layout: 'grid',
          grid: { cols: 2, xGap: 16, yGap: 16 },
          showActions: false,
        }"
      />
      <template #action>
        <NSpace justify="end">
          <NButton @click="handleModalCancel">{{ t('common.cancel') }}</NButton>
          <NButton
            type="primary"
            :loading="modalSubmitLoading"
            @click="handleModalSave"
          >
            {{ t('common.save') }}
          </NButton>
        </NSpace>
      </template>
    </NModal>

    <!-- 动态行确认删除弹窗 -->
    <component
      v-if="resolved.dynamicRows && tableManager.dynamicRowsState"
      :is="tableManager.dynamicRowsState.renderConfirmModal()"
    />

    <!-- 列设置抽屉 -->
    <NDrawer
      v-model:show="showSettingsPanel"
      :width="420"
      placement="right"
      :mask-closable="true"
    >
      <NDrawerContent
        :title="t('table.columnSettings')"
        closable
      >
        <ColumnSettings
          :columns="reactiveColumns"
          :persist-key="resolved.persistKey"
          @change="onColumnSettingsChange"
        />
      </NDrawerContent>
    </NDrawer>
  </div>
</template>

<script setup lang="ts">
  import {
    ref,
    computed,
    watch,
    nextTick,
    onMounted,
    onBeforeUnmount,
    type ComponentPublicInstance,
  } from 'vue'
  import type { SortableEvent } from 'sortablejs'
  import type Sortable from 'sortablejs'
  import {
    type DataTableRowKey,
    NDataTable,
    NPagination,
    NModal,
    NSpace,
    NButton,
    NDrawer,
    NDrawerContent,
  } from 'naive-ui'
  import type {
    TableColumn,
    TableEmits,
    DataRecord,
    MaybeRefLike,
  } from './types'
  import {
    resolveConfig,
    createEditModeChecker,
    type TableConfig,
    type CrudBinding,
  } from './composables/useTableConfig'
  import { useTableManager } from './composables/useTableManager'
  import { usePagination } from './composables/usePagination'
  import { useTableActions } from './composables/useTableActions'
  import { useTableColumns } from './composables/useTableColumns'
  import {
    useTableGlobalConfig,
    mergeGlobalConfig,
  } from './composables/useTableGlobalConfig'
  import { useRowDrag } from './composables/useRowDrag'
  import { useCrossPageSelection } from './composables/useCrossPageSelection'
  import { exportTableData } from './composables/useTableExport'
  import { generateFormOptions } from './data'
  import ColumnSettings from './components/ColumnSettings/index.vue'
  import C_Icon from '../C_Icon/index.vue'
  import C_Form from '../C_Form/index.vue'
  import { cloneData } from '../../utils/data'
  import { useComponentFeedback, useComponentLocale } from '../../config'
  import { validateTableRowKeys } from './helpers'

  defineOptions({ name: 'C_Table', inheritAttrs: false })

  /* ================= Props（极简 API） ================= */

  const props = withDefaults(
    defineProps<{
      /** 列配置（crud 模式下可省略） */
      columns?: TableColumn[]
      /** 数据源（crud 模式下可省略） */
      data?: MaybeRefLike<DataRecord[]>
      /** 加载状态 */
      loading?: MaybeRefLike<boolean>
      /** 行唯一键 */
      rowKey?: string | ((row: DataRecord) => DataTableRowKey)
      /** 统一功能配置（edit / selection / expand / pagination / dynamicRows / toolbar / display） */
      config?: TableConfig
      /** CRUD 绑定 — 传入 useTableCrud() 的返回值，自动接管 data/columns/loading/actions/pagination/events */
      crud?: CrudBinding
    }>(),
    {
      rowKey: 'id',
      config: () => ({}),
    }
  )

  const emit = defineEmits<
    TableEmits & {
      'row-add': [newRow: DataRecord]
      'row-delete': [deletedRow: DataRecord, index: number]
      'row-copy': [originalRow: DataRecord, newRow: DataRecord]
      'row-move': [row: DataRecord, fromIndex: number, toIndex: number]
      'row-selection-change': [
        selectedKey: DataTableRowKey | null,
        selectedRow: DataRecord | null,
      ]
      'pagination-change': [page: number, pageSize: number]
      'view-detail': [data: DataRecord]
      'column-change': [columns: TableColumn[]]
    }
  >()

  /* ================= CRUD 桥接 ================= */

  /** 包装 emit：在触发事件的同时自动调用 crud 对应的方法 */
  const bridgedEmit: typeof emit = (event: any, ...args: any[]) => {
    ;(emit as any)(event, ...args)

    if (!props.crud) return undefined as never
    const handlers: Record<string, ((...a: any[]) => void) | undefined> = {
      save: props.crud.save,
      cancel: props.crud.handleCancel,
      'pagination-change': props.crud.handlePaginationChange,
      'row-delete': props.crud.handleRowDelete,
      'view-detail': props.crud.detail?.show,
    }
    return handlers[event]?.(...args) as never
  }

  /* ================= 有效值（全局 → crud → props 覆盖） ================= */

  const globalConfig = useTableGlobalConfig()
  const resolvedRowKey = (row: DataRecord): DataTableRowKey =>
    typeof props.rowKey === 'function'
      ? props.rowKey(row)
      : (row[props.rowKey] as DataTableRowKey)

  /** 合并 crud 返回的 actions/pagination 到用户 config，并叠加全局配置 */
  const effectiveConfig = computed<TableConfig>(() => {
    let cfg: TableConfig = props.config || {}
    if (props.crud) {
      const fromCrud: Partial<TableConfig> = {}
      if (props.crud.actions) fromCrud.actions = props.crud.actions.value
      if (props.crud.pagination)
        fromCrud.pagination = props.crud.pagination.value ?? undefined
      cfg = { ...fromCrud, ...cfg }
    }
    return mergeGlobalConfig(cfg, globalConfig)
  })

  const effectiveColumns = computed<TableColumn[]>(
    () => props.columns ?? props.crud?.columns.value ?? []
  )

  /* ================= 配置解析 ================= */

  const resolved = computed(() => resolveConfig(effectiveConfig.value))
  const feedback = useComponentFeedback(() => resolved.value.feedback)
  const { t } = useComponentLocale(() => resolved.value.locale)
  const editModeChecker = computed(() => createEditModeChecker(resolved.value))

  /* ================= 数据规范化（兼容跨实例 Ref） ================= */

  const unwrapRef = <T,>(val: MaybeRefLike<T> | undefined): T | undefined =>
    val && typeof val === 'object' && 'value' in val ? val.value : (val as T)

  const normalizedData = computed<DataRecord[]>(
    () => unwrapRef(props.data) ?? props.crud?.data.value ?? []
  )

  const normalizedLoading = computed<boolean>(
    () => unwrapRef(props.loading) ?? props.crud?.loading.value ?? false
  )

  let lastRowKeyIssueSignature = ''
  watch(
    () =>
      normalizedData.value.map(row => {
        try {
          return resolvedRowKey(row)
        } catch {
          return undefined
        }
      }),
    () => {
      if (effectiveConfig.value.validateRowKeys === false) {
        lastRowKeyIssueSignature = ''
        return
      }
      const issues = validateTableRowKeys(normalizedData.value, resolvedRowKey)
      if (issues.length === 0) {
        lastRowKeyIssueSignature = ''
        return
      }
      const signature = issues
        .map(issue =>
          [issue.type, issue.index, issue.firstIndex, String(issue.key)].join(
            ':'
          )
        )
        .join('|')
      if (signature === lastRowKeyIssueSignature) return
      lastRowKeyIssueSignature = signature
      feedback.warning(t('table.invalidRowKeys', { count: issues.length }))
      emit('row-key-error', issues)
    },
    { immediate: true }
  )

  /* ================= Hooks ================= */

  const pagination = usePagination({
    data: normalizedData,
    config: computed(() => resolved.value.pagination),
    emit: bridgedEmit,
  })

  const tableManager = useTableManager({
    config: resolved,
    data: () => normalizedData.value,
    rowKey: resolvedRowKey,
    emit: bridgedEmit,
    columns: () => effectiveColumns.value,
  })

  const tableActions = useTableActions({
    actions: computed(() => effectiveConfig.value.actions || {}),
    config: resolved,
    tableManager,
    rowKey: resolvedRowKey,
    onRowDeleted: (row, index) => emit('row-delete', row, index),
    onViewDetail: (data: DataRecord) => bridgedEmit('view-detail', data),
  })

  const showActionsColumn = computed(() => {
    const { actions } = effectiveConfig.value
    return Boolean(
      resolved.value.showRowActions ||
      actions?.delete ||
      actions?.detail ||
      actions?.custom?.length ||
      actions?.render
    )
  })

  const columnState = useTableColumns({
    rawColumns: effectiveColumns,
    config: resolved,
    columnWidth: resolved.value.columnWidth,
    scrollX: resolved.value.scrollX,
    rowKey: resolvedRowKey,
    tableManager,
    actionsRenderer: tableActions.renderActions,
    editModeChecker,
    showActionsColumn,
  })

  const {
    showSettingsPanel,
    reactiveColumns,
    computedColumns,
    computedScrollX,
  } = columnState

  /* ================= 行拖拽（可选） ================= */

  const rowDragState = useRowDrag({
    data: pagination.paginatedData,
    rowKey: resolvedRowKey,
    config: computed(() => resolved.value.rowDrag),
    onReorder: newPageData => {
      const paginationConfig = resolved.value.pagination
      if (!paginationConfig?.enabled || paginationConfig.remote) {
        bridgedEmit('update:data', newPageData)
        return
      }

      const start =
        (pagination.currentPage.value - 1) * pagination.currentPageSize.value
      const newData = [...normalizedData.value]
      newData.splice(start, newPageData.length, ...newPageData)
      bridgedEmit('update:data', newData)
    },
    onSort: (row, from, to) => {
      const isLocalPagination =
        resolved.value.pagination?.enabled && !resolved.value.pagination.remote
      const offset = isLocalPagination
        ? (pagination.currentPage.value - 1) * pagination.currentPageSize.value
        : 0
      emit('row-move', row, from + offset, to + offset)
    },
  })

  /* ================= 跨页多选（可选） ================= */

  const crossPageState = useCrossPageSelection({
    allData: normalizedData,
    rowKey: resolvedRowKey,
    config: computed(() => resolved.value.crossPageSelection),
  })
  const isCrossPageSelectionEnabled = computed(
    () => resolved.value.crossPageSelection?.enabled === true
  )

  /** 批量选中数量（用于批量操作栏） */
  const batchSelectedCount = computed(() =>
    isCrossPageSelectionEnabled.value
      ? crossPageState.selectedCount.value
      : (tableManager.checkedKeys?.value?.length ?? 0)
  )
  const runningBatchActions = ref<Set<string>>(new Set())
  type BatchAction = {
    key: string
    onClick: (
      keys: DataTableRowKey[],
      rows: DataRecord[]
    ) => void | Promise<void>
  }

  /** 处理批量操作按钮点击 */
  // eslint-disable-next-line complexity -- 跨页/当前页选择与异步回滚必须作为同一操作处理。
  const handleBatchAction = async (action: BatchAction) => {
    if (runningBatchActions.value.has(action.key)) return
    const keys = isCrossPageSelectionEnabled.value
      ? [...crossPageState.selectedKeys.value]
      : (tableManager.checkedKeys?.value ?? [])
    const rows = isCrossPageSelectionEnabled.value
      ? crossPageState.getSelectedRows()
      : normalizedData.value.filter(r => keys.includes(resolvedRowKey(r)))
    runningBatchActions.value = new Set(runningBatchActions.value).add(
      action.key
    )
    try {
      await action.onClick(keys, rows)
      if (resolved.value.batchActions?.clearSelectionOnSuccess) {
        clearBatchSelection()
      }
    } catch (error) {
      resolved.value.batchActions?.onError?.(error, action.key)
      emit('batch-action-error', error, action.key)
    } finally {
      const nextRunning = new Set(runningBatchActions.value)
      nextRunning.delete(action.key)
      runningBatchActions.value = nextRunning
    }
  }

  /** 清除批量选择 */
  const clearBatchSelection = () => {
    if (isCrossPageSelectionEnabled.value) crossPageState.clearAll()
    else tableManager.stateManager.selection.clear()
  }

  /** 跨页多选时的 checked-row-keys */
  const crossPageCheckedKeys = computed(() =>
    isCrossPageSelectionEnabled.value
      ? crossPageState.getPageCheckedKeys(pagination.paginatedData.value)
      : null
  )

  /** 选中行变更统一处理 */
  const handleCheckedKeysChange = (keys: DataTableRowKey[]) => {
    if (isCrossPageSelectionEnabled.value) {
      crossPageState.handlePageSelectionChange(
        keys,
        pagination.paginatedData.value
      )
    }
    tableManager.expandState?.handleSelectionChange?.(keys)
  }

  /** 导出 */
  const handleExport = async () => {
    const cfg = resolved.value.exportConfig ?? {}
    await exportTableData(normalizedData.value, effectiveColumns.value, {
      ...cfg,
      formatterConfig: resolved.value.formatterConfig,
    })
  }

  /* ================= 合计行 ================= */

  const summaryFn = computed(() => {
    const cfg = resolved.value
    if (!cfg.summaryRender) return undefined
    return (data: DataRecord[]) => {
      const result = cfg.summaryRender!(data)
      return computedColumns.value.map((col: any) => {
        const key = col.key as string
        const def = result[key]
        return def
          ? { value: def.value, colSpan: def.colSpan ?? 1 }
          : { value: '' }
      })
    }
  })

  /* ================= 列拖拽排序 ================= */

  const tableWrapperRef = ref<HTMLElement>()
  let sortableInstance: Sortable | null = null
  let columnDragVersion = 0

  const destroyColumnDrag = () => {
    columnDragVersion += 1
    sortableInstance?.destroy()
    sortableInstance = null
  }

  const initColumnDrag = async () => {
    const version = ++columnDragVersion
    sortableInstance?.destroy()
    sortableInstance = null
    if (!resolved.value.enableColumnDrag || !tableWrapperRef.value) return
    try {
      const { default: Sortable } = await import('sortablejs')
      if (version !== columnDragVersion || !tableWrapperRef.value) return
      const headerRow = tableWrapperRef.value.querySelector(
        '.n-data-table-thead tr'
      )
      if (!headerRow) return
      sortableInstance = new Sortable(headerRow as HTMLElement, {
        animation: resolved.value.columnDragAnimationDuration,
        handle: resolved.value.columnDragHandleClass
          ? `.${resolved.value.columnDragHandleClass}`
          : undefined,
        filter: '.c-table-actions-column',
        preventOnFilter: true,
        ghostClass: 'column-drag-ghost',
        onEnd: (evt: SortableEvent) => {
          if (evt.oldIndex == null || evt.newIndex == null) return
          const cols = [...reactiveColumns.value]
          const visibleColumns = cols.filter(
            column => column.visible !== false && column.key !== '_actions'
          )
          const moved = visibleColumns[evt.oldIndex]
          const target = visibleColumns[evt.newIndex]
          if (!moved || !target || moved === target) return
          const fromIndex = cols.indexOf(moved)
          const toIndex = cols.indexOf(target)
          cols.splice(fromIndex, 1)
          cols.splice(toIndex, 0, moved)
          columnState.handleColumnChange(cols)
          emit('column-change', cols)
        },
      })
    } catch {
      // sortablejs 未安装时静默降级
    }
  }

  /* ================= 表格属性 ================= */

  const tableRef = ref<ComponentPublicInstance>()

  const computedTableProps = computed(() => ({
    striped: resolved.value.striped,
    bordered: resolved.value.bordered,
    singleLine: resolved.value.singleLine,
    size: resolved.value.size,
    maxHeight: resolved.value.maxHeight,
  }))

  /* ================= 编辑弹窗 ================= */

  const editFormRef = ref<{ validate: () => Promise<void> }>()
  const modalSubmitLoading = ref(false)
  const localEditingData = ref<DataRecord>({})

  const modalVisible = computed({
    get: () => tableManager.editStates.modalEdit.isModalVisible.value,
    set: (val: boolean) => {
      tableManager.editStates.modalEdit.isModalVisible.value = val
    },
  })

  const editableColumns = computed(() =>
    effectiveColumns.value.filter(
      (col): col is TableColumn => col.editable !== false
    )
  )

  const formKey = computed(
    () =>
      `edit-form-${tableManager.editStates.modalEdit.editingRowKey.value ?? 'new'}`
  )

  const formOptions = computed(() => generateFormOptions(editableColumns.value))

  watch(
    () => tableManager.editStates.modalEdit.editingData.value,
    newData => {
      if (newData && Object.keys(newData).length > 0) {
        localEditingData.value = cloneData(newData)
      }
    },
    { immediate: true, deep: true }
  )

  let modalCloseTimer: ReturnType<typeof setTimeout> | null = null

  watch(modalVisible, visible => {
    if (visible && modalCloseTimer) {
      clearTimeout(modalCloseTimer)
      modalCloseTimer = null
    }
    if (!visible) {
      if (modalCloseTimer) clearTimeout(modalCloseTimer)
      modalCloseTimer = setTimeout(() => {
        localEditingData.value = {}
        modalCloseTimer = null
      }, 300)
    }
  })

  const handleModalSave = async () => {
    if (!editFormRef.value) return
    modalSubmitLoading.value = true
    try {
      await editFormRef.value.validate()
    } catch {
      /* 表单验证错误由组件内联显示 */
      modalSubmitLoading.value = false
      return
    }
    try {
      await tableManager.editStates.modalEdit.saveEdit(localEditingData.value)
    } finally {
      modalSubmitLoading.value = false
    }
  }

  const handleModalCancel = () => {
    localEditingData.value = {}
    tableManager.editStates.modalEdit.cancelEdit()
  }

  /* ================= 列设置 ================= */

  const onColumnSettingsChange = (columns: TableColumn[]) => {
    columnState.handleColumnChange(columns)
    emit('column-change', columnState.reactiveColumns.value)
  }

  /* ================= Expose ================= */

  const { edit, expand, selection, dynamicRows } = tableManager.stateManager

  const exposedApi = {
    startEdit: edit.start,
    cancelEdit: edit.cancel,
    saveEdit: edit.save,
    expandRow: expand.row,
    collapseRow: expand.collapse,
    toggleExpand: expand.toggle,
    expandAll: expand.all,
    collapseAll: expand.collapseAll,
    selectRow: (rowKey: DataTableRowKey) => {
      if (isCrossPageSelectionEnabled.value)
        return crossPageState.select(rowKey)
      selection.select(rowKey)
      return selection.isSelected(rowKey)
    },
    unselectRow: (rowKey: DataTableRowKey) => {
      if (isCrossPageSelectionEnabled.value) crossPageState.unselect(rowKey)
      else selection.unselect(rowKey)
    },
    selectAll: () => {
      if (isCrossPageSelectionEnabled.value) crossPageState.selectAll()
      else selection.all()
    },
    clearSelection: clearBatchSelection,
    isRowSelected: (rowKey: DataTableRowKey) =>
      isCrossPageSelectionEnabled.value
        ? crossPageState.isSelected(rowKey)
        : selection.isSelected(rowKey),
    clearAllSelections: () => {
      crossPageState.clearAll()
      tableManager.stateManager.clearAllSelections()
    },
    selectChildRow: tableManager.stateManager.childSelection.select,
    unselectChildRow: tableManager.stateManager.childSelection.unselect,
    selectAllChildren: tableManager.stateManager.childSelection.selectAll,
    clearChildrenSelection: tableManager.stateManager.childSelection.clear,
    getChildSelectedRows: tableManager.stateManager.childSelection.getSelected,
    addRow: dynamicRows.add,
    insertRow: dynamicRows.insert,
    deleteRow: dynamicRows.delete,
    copyRow: dynamicRows.copy,
    moveRowUp: dynamicRows.moveUp,
    moveRowDown: dynamicRows.moveDown,
    clearRowSelection: dynamicRows?.clearSelection,
    getSelectedRowData: dynamicRows.getSelected,
    printTable: (elementRef?: HTMLElement) =>
      dynamicRows.print(elementRef ?? tableWrapperRef.value),
    downloadTableScreenshot: (elementRef?: HTMLElement, filename?: string) =>
      dynamicRows.download(elementRef ?? tableWrapperRef.value, filename),
    resetToFirstPage: pagination.resetToFirstPage,
    getTotalPages: pagination.getTotalPages,
    getSelectedRows: () =>
      isCrossPageSelectionEnabled.value
        ? crossPageState.getSelectedRows()
        : selection.getSelected(),
    getEditingData: edit.getEditingData,
    isEditing: edit.isEditing,
    isExpanded: expand.isExpanded,
    getManager: () => tableManager.stateManager,
    /** 导出数据 */
    exportData: handleExport,
    /** 跨页选择 */
    crossPageSelection: {
      enabled: isCrossPageSelectionEnabled,
      selectedKeys: crossPageState.selectedKeys,
      selectedCount: crossPageState.selectedCount,
      select: crossPageState.select,
      unselect: crossPageState.unselect,
      selectAll: crossPageState.selectAll,
      clearAll: crossPageState.clearAll,
      getSelectedRows: crossPageState.getSelectedRows,
    },
  }

  defineExpose(exposedApi)

  /* 自动连接 crud.tableRef */
  onMounted(() => {
    const crudRef = props.crud?.tableRef
    if (crudRef) crudRef.value = exposedApi
    void initColumnDrag()
    if (tableWrapperRef.value) {
      void rowDragState.initRowDrag(tableWrapperRef.value)
    }
  })

  watch(
    [
      () => resolved.value.enableColumnDrag,
      () => resolved.value.columnDragHandleClass,
      () => normalizedLoading.value,
      () => computedColumns.value.length,
    ],
    async () => {
      await nextTick()
      await initColumnDrag()
    },
    { immediate: true, flush: 'post' }
  )

  watch(
    [
      () => resolved.value.rowDrag,
      () => normalizedLoading.value,
      () => pagination.paginatedData.value.length,
      () => pagination.currentPage.value,
    ],
    async () => {
      await nextTick()
      if (tableWrapperRef.value) {
        await rowDragState.initRowDrag(tableWrapperRef.value)
      }
    },
    { immediate: true, deep: true, flush: 'post' }
  )

  onBeforeUnmount(() => {
    if (modalCloseTimer) clearTimeout(modalCloseTimer)
    destroyColumnDrag()
    rowDragState.destroyRowDrag()
  })
</script>

<style scoped lang="scss">
  @use './index.scss';
</style>
