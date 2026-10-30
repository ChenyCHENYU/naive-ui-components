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
    :class="[
      wrapperClass,
      { 'c-table-wrapper--flex': flexHeight },
      resolved.density && `c-table-wrapper--${resolved.density}`,
    ]"
    :aria-busy="normalizedLoading"
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
        <C_ActionBar
          v-if="resolved.toolbarActions.length"
          :actions="resolved.toolbarActions"
          :config="{
            ...resolved.toolbarActionBarConfig,
          }"
        />
      </div>
      <div class="toolbar-right">
        <slot name="toolbar-right" />
        <C_ActionBar
          v-if="resolved.toolbarRightActions.length"
          :actions="resolved.toolbarRightActions"
          :config="{
            align: 'right',
            ...resolved.toolbarActionBarConfig,
          }"
        />
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
          :size="resolved.controlSize"
          :loading="batchTasks.isRunning(action.key)"
          :disabled="batchTasks.isRunning(action.key)"
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
          :size="resolved.controlSize"
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
            :size="resolved.controlSize"
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
      :flex-height="flexHeight"
      :columns="computedColumns"
      :data="
        usesNativePagination
          ? normalizedData
          : paginationState.paginatedData.value
      "
      :pagination="usesNativePagination ? props.pagination : false"
      :remote="usesNativePagination ? nativeRemote : true"
      @update:sorter="handleSorterChange"
      @update:filters="handleFilterChange"
      @update:page-size="handleNativePageSizeChange"
      @update:page="handleNativePageChange"
      :loading="normalizedLoading"
      :row-key="resolvedRowKey"
      :row-props="getRowProps"
      :expanded-row-keys="tableManager.expandedKeys.value"
      :checked-row-keys="crossPageCheckedKeys ?? tableManager.checkedKeys.value"
      @update:expanded-row-keys="tableManager.expandState?.handleExpandChange"
      @update:checked-row-keys="handleCheckedKeysChange"
      :scroll-x="computedScrollX"
      :virtual-scroll="resolved.virtualScroll"
      :virtual-scroll-x="props.virtualScrollX"
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
    >
      <template #loading>
        <slot name="loading"><C_Loading :label="t('table.loading')" /></slot>
      </template>
      <template
        v-if="$slots.empty"
        #empty
      >
        <slot name="empty" />
      </template>
    </NDataTable>

    <!-- 分页 -->
    <NPagination
      v-if="!usesNativePagination && paginationState.paginationConfig.value"
      v-bind="paginationState.paginationConfig.value"
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
          density: resolved.density,
          grid: {
            cols: 2,
            ...(resolved.density ? {} : { xGap: 16, yGap: 16 }),
          },
          showActions: false,
        }"
      />
      <template #action>
        <NSpace justify="end">
          <NButton
            :size="resolved.density ? resolved.controlSize : 'medium'"
            :disabled="modalSubmitLoading"
            @click="handleModalCancel"
            >{{ t('common.cancel') }}</NButton
          >
          <NButton
            type="primary"
            :size="resolved.density ? resolved.controlSize : 'medium'"
            :disabled="!editFormRef || modalSubmitLoading"
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

<script setup lang="ts" generic="T extends object = DataRecord, C = unknown">
  import {
    h,
    ref,
    computed,
    defineAsyncComponent,
    watch,
    nextTick,
    onMounted,
    onBeforeUnmount,
    useAttrs,
  } from 'vue'
  import type { SortableEvent } from 'sortablejs'
  import type Sortable from 'sortablejs'
  import {
    type DataTableRowKey,
    type DataTableInst,
    type DataTableFilterState,
    type PaginationProps,
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
    TableInstance,
    TableRuntimeProps,
    DataRecord,
    MaybeRefLike,
  } from './types'
  import {
    resolveConfig,
    createEditModeChecker,
    type TableConfig,
  } from './composables/useTableConfig'
  import { useTableManager } from './composables/useTableManager'
  import { usePagination } from './composables/usePagination'
  import { useTableDataPipeline } from './composables/useTableDataPipeline'
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
  import C_ActionBar from '../C_ActionBar/index.vue'
  import { useActionTask } from '../../composables/useActionTask'
  import { cloneData, isDataEqual } from '../../utils/data'
  import { useComponentFeedback, useComponentLocale } from '../../config'
  import { C_Loading } from '../C_Loading'
  import {
    collectTreeBranchKeys,
    validateTableRowKeys,
    getTableRowDragKey,
  } from './helpers'

  defineOptions({ name: 'C_Table', inheritAttrs: false })

  const C_Form = defineAsyncComponent(() =>
    import('../C_Form').then(module => module.C_Form)
  )

  /* ================= Props（极简 API） ================= */

  const props = withDefaults(defineProps<TableRuntimeProps<T, C>>(), {
    config: () => ({}),
    pagination: undefined,
    remote: undefined,
  })

  const publicEmit = defineEmits<TableEmits<T, C>>()

  // 内部状态引擎使用规范化记录；公开事件始终保留 props 推导的业务模型。
  type InternalTableEvent = {
    [K in keyof TableEmits]: [event: K, ...args: TableEmits[K]]
  }[keyof TableEmits]
  const emit = publicEmit as unknown as (...event: InternalTableEvent) => void
  const tableRef = ref<DataTableInst | null>(null)

  /* ================= CRUD 桥接 ================= */

  /** 事件桥接只适配实际拥有的业务入口，不泄漏内部可变参数签名。 */
  // eslint-disable-next-line complexity -- Keep the five typed CRUD ownership paths in one discriminated event dispatch.
  const bridgedEmit = (...event: InternalTableEvent): unknown => {
    emit(...event)
    const { crud } = props
    if (!crud) return
    switch (event[0]) {
      case 'save':
        return crud.save?.(event[1] as unknown as T, event[2], event[3])
      case 'cancel':
        return crud.handleCancel?.()
      case 'pagination-change':
        return crud.handlePaginationChange?.(event[1], event[2])
      case 'row-delete':
        return crud.handleRowDelete?.(event[1] as unknown as T, event[2])
      case 'view-detail':
        return crud.detail?.show(event[1] as unknown as T)
    }
  }

  /* ================= 有效值（全局 → crud → props 覆盖） ================= */

  const globalConfig = useTableGlobalConfig()
  const resolvedRowKey = (row: DataRecord): DataTableRowKey => {
    const key = props.rowKey ?? 'id'
    return typeof key === 'function'
      ? (key as (record: DataRecord) => DataTableRowKey)(row)
      : (row[key] as DataTableRowKey)
  }

  /** 合并 crud 返回的 actions/pagination 到用户 config，并叠加全局配置 */
  const effectiveConfig = computed<TableConfig>(() => {
    let cfg: TableConfig = (props.config as TableConfig | undefined) || {}
    if (props.crud) {
      const fromCrud: Partial<TableConfig> = {}
      if (props.crud.actions) {
        // Internal config uses DataRecord; the public CRUD binding retains T.
        const actions = props.crud.actions.value as unknown as NonNullable<
          TableConfig['actions']
        >
        // CRUD 的 edit 函数是持久化适配器；确认保存由 bridgedEmit -> crud.save 负责。
        // 有独立 save 时，铅笔只进入内置编辑器；显式 config.actions.edit 仍覆盖此默认桥接。
        fromCrud.actions = {
          ...actions,
          ...(props.crud.save && typeof actions.edit === 'function'
            ? { edit: undefined }
            : {}),
        }
      }
      if (props.crud.pagination)
        fromCrud.pagination = props.crud.pagination.value ?? undefined
      cfg = { ...fromCrud, ...cfg }
    }
    return mergeGlobalConfig(cfg, globalConfig)
  })

  const effectiveColumns = computed<TableColumn[]>(
    () =>
      (props.columns ??
        props.crud?.columns.value ??
        []) as unknown as TableColumn[]
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
    () =>
      (unwrapRef(props.data) ??
        props.crud?.data.value ??
        []) as unknown as DataRecord[]
  )

  const normalizedLoading = computed<boolean>(
    () => unwrapRef(props.loading) ?? props.crud?.loading.value ?? false
  )

  const treeDefaultKeys = computed(() =>
    resolved.value.treeEnabled && resolved.value.treeDefaultExpandAll
      ? collectTreeBranchKeys(
          normalizedData.value,
          resolved.value.treeChildrenKey,
          resolvedRowKey
        )
      : []
  )
  const managerConfig = computed(() => ({
    ...resolved.value,
    defaultExpandedKeys: [
      ...new Set([
        ...(resolved.value.defaultExpandedKeys ?? []),
        ...treeDefaultKeys.value,
      ]),
    ],
  }))

  let lastRowKeyIssueSignature = ''
  watch(
    () =>
      effectiveConfig.value.validateRowKeys === false
        ? []
        : normalizedData.value.map(row => {
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

  const usesNativePagination = computed(() => props.pagination !== undefined)
  const nativeRemote = computed(
    () => props.remote ?? resolved.value.pagination?.remote ?? false
  )
  const getDefaultNativePageSize = (
    pagination: PaginationProps | false | undefined
  ) => {
    if (!pagination) return 10
    if (pagination.defaultPageSize !== undefined)
      return pagination.defaultPageSize
    const firstSize = pagination.pageSizes?.[0]
    return typeof firstSize === 'number' ? firstSize : firstSize?.value || 10
  }
  const nativeUncontrolledPageSize = ref(
    getDefaultNativePageSize(props.pagination)
  )
  const nativeUncontrolledPage = ref(
    props.pagination ? (props.pagination.defaultPage ?? 1) : 1
  )
  const handleNativePageChange = (page: number) => {
    nativeUncontrolledPage.value = page
  }
  const handleNativePageSizeChange = (pageSize: number) => {
    nativeUncontrolledPageSize.value = pageSize
  }

  const tableManager = useTableManager({
    config: managerConfig,
    data: () => normalizedData.value,
    rowKey: resolvedRowKey,
    rowKeyField: () =>
      typeof props.rowKey === 'function' ? undefined : (props.rowKey ?? 'id'),
    emit: bridgedEmit,
    columns: () => effectiveColumns.value,
    renderLoading: () => h(C_Loading, { size: 32, label: t('table.loading') }),
  })

  const initializedTreeKeys = new Set<DataTableRowKey>()
  watch(
    treeDefaultKeys,
    keys => {
      if (!resolved.value.treeEnabled || !resolved.value.treeDefaultExpandAll) {
        initializedTreeKeys.clear()
        return
      }
      const newKeys = keys.filter(key => !initializedTreeKeys.has(key))
      keys.forEach(key => initializedTreeKeys.add(key))
      const expanded = tableManager.expandedKeys.value
      const missing = newKeys.filter(key => !expanded.includes(key))
      if (missing.length) {
        void tableManager.expandState?.handleExpandChange([
          ...expanded,
          ...missing,
        ])
      }
    },
    { immediate: true }
  )

  const tableActions = useTableActions({
    actions: computed(() => effectiveConfig.value.actions || {}),
    config: resolved,
    tableManager,
    rowKey: resolvedRowKey,
    onRowDeleted: (row, index) => emit('row-delete', row, index),
    isDeleteFeedbackHandled: action =>
      props.crud?.actions?.value.delete === action,
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
    data: normalizedData,
    getFont: (header = false) => {
      const root = tableWrapperRef.value
      const target = header
        ? (root?.querySelector('.n-data-table-th') ?? root)
        : root
      return target
        ? getComputedStyle(target).font || '600 13px sans-serif'
        : '600 13px sans-serif'
    },
    config: resolved,
    get columnWidth() {
      return resolved.value.columnWidth
    },
    get columnWidthExplicit() {
      return effectiveConfig.value.display?.columnWidth !== undefined
    },
    get scrollX() {
      return resolved.value.scrollX
    },
    rowKey: resolvedRowKey,
    // Column rendering consumes a non-generic manager view of the same rows.
    tableManager: tableManager as unknown as Parameters<
      typeof useTableColumns
    >[0]['tableManager'],
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

  const dataPipeline = useTableDataPipeline({
    data: normalizedData,
    columns: reactiveColumns,
    remote: () =>
      usesNativePagination.value || resolved.value.pagination?.remote === true,
  })
  // Older supported Naive releases do not expose current-page/filtered getters.
  // This fallback is computed only when those public methods are unavailable.
  const nativeFallbackPipeline = useTableDataPipeline({
    data: normalizedData,
    columns: reactiveColumns,
    remote: nativeRemote,
  })
  const paginationState = usePagination({
    data: dataPipeline.processedData,
    config: computed(() =>
      usesNativePagination.value ? null : resolved.value.pagination
    ),
    emit: bridgedEmit,
  })
  const displayedRows = computed<DataRecord[]>(() => {
    if (usesNativePagination.value) {
      const current = tableRef.value?.getCurrentPageData?.()
      if (current) return current
      const source = nativeFallbackPipeline.processedData.value
      if (!props.pagination || nativeRemote.value) return source
      const pageSize =
        props.pagination.pageSize ?? nativeUncontrolledPageSize.value
      const page = Math.max(
        1,
        Math.min(
          props.pagination.page ?? nativeUncontrolledPage.value,
          Math.ceil(source.length / Math.max(1, pageSize))
        )
      )
      return source.slice((page - 1) * pageSize, page * pageSize)
    }
    return paginationState.paginatedData.value
  })
  const handleSorterChange = (
    sorter: Parameters<typeof dataPipeline.setSorter>[0]
  ) => {
    dataPipeline.setSorter(sorter)
    nativeFallbackPipeline.setSorter(sorter)
  }
  const handleFilterChange = (filters: DataTableFilterState) => {
    dataPipeline.setFilters(filters)
    nativeFallbackPipeline.setFilters(filters)
    if (!usesNativePagination.value && !resolved.value.pagination?.remote) {
      paginationState.resetToFirstPage()
    }
  }

  /* ================= 行拖拽（可选） ================= */

  const attrs = useAttrs()
  const rowDragEnabled = computed(
    () =>
      resolved.value.rowDrag !== undefined &&
      resolved.value.rowDrag.enabled !== false &&
      !resolved.value.virtualScroll &&
      props.virtualScrollX !== true
  )
  const draggableRows = computed(() => {
    const rows = displayedRows.value
    const entries = rows.map(
      row => [getTableRowDragKey(row, resolvedRowKey), row] as const
    )
    const identities = new Set(entries.map(([key]) => key))
    if (
      entries.some(([key]) => key === undefined) ||
      identities.size !== rows.length
    )
      return new Map<string, DataRecord>()
    return new Map(entries as [string, DataRecord][])
  })
  const getRowProps = (row: DataRecord, index: number) => {
    const forwarded = attrs.rowProps ?? attrs['row-props']
    const userProps =
      typeof forwarded === 'function' ? forwarded(row, index) : undefined
    if (!rowDragEnabled.value) return userProps
    const key = getTableRowDragKey(row, resolvedRowKey)
    return {
      ...userProps,
      'data-c-table-row-key':
        key !== undefined && draggableRows.value.get(key) === row
          ? key
          : undefined,
    }
  }

  let draggedSourceIndexes: (number | undefined)[] | undefined
  const rowDragState = useRowDrag({
    data: displayedRows,
    rowKey: resolvedRowKey,
    // 虚拟列表只呈现窗口片段，禁止用局部 DOM 重排完整数据。
    config: computed(() =>
      rowDragEnabled.value ? resolved.value.rowDrag : undefined
    ),
    onReorder: newPageData => {
      const sourceIndexes = new Map(
        normalizedData.value.map((row, index) => [resolvedRowKey(row), index])
      )
      draggedSourceIndexes = displayedRows.value.map(row =>
        sourceIndexes.get(resolvedRowKey(row))
      )
      const isRemote = usesNativePagination.value
        ? nativeRemote.value
        : resolved.value.pagination?.remote === true
      if (isRemote) {
        bridgedEmit('update:data', newPageData)
        return
      }

      const newData = [...normalizedData.value]
      draggedSourceIndexes.forEach((sourceIndex, index) => {
        if (sourceIndex !== undefined) newData[sourceIndex] = newPageData[index]
      })
      bridgedEmit('update:data', newData)
    },
    onSort: (row, from, to) => {
      const fromIndex = draggedSourceIndexes?.[from] ?? from
      const toIndex = draggedSourceIndexes?.[to] ?? to
      draggedSourceIndexes = undefined
      emit('row-move', row, fromIndex, toIndex)
    },
  })

  /* ================= 跨页多选（可选） ================= */

  const crossPageState = useCrossPageSelection({
    allData: normalizedData,
    rowKey: resolvedRowKey,
    config: computed(() => resolved.value.crossPageSelection),
    remote: () =>
      usesNativePagination.value
        ? nativeRemote.value
        : resolved.value.pagination?.remote === true,
    childrenKey: () =>
      resolved.value.treeEnabled ? resolved.value.treeChildrenKey : undefined,
    rowCheckable: row => resolved.value.rowCheckable?.(row) ?? true,
    onSelectionChange: (keys, rows) =>
      emit('selection-change', keys, rows, new Map()),
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
  const batchTasks = useActionTask<string>()
  type BatchAction = {
    key: string
    onClick: (keys: DataTableRowKey[], rows: DataRecord[]) => unknown
  }

  /** 处理批量操作按钮点击 */
  // eslint-disable-next-line complexity -- 跨页/当前页选择与异步回滚必须作为同一操作处理。
  const handleBatchAction = async (action: BatchAction) => {
    if (batchTasks.isRunning(action.key)) return
    const keys = isCrossPageSelectionEnabled.value
      ? [...crossPageState.selectedKeys.value]
      : (tableManager.checkedKeys?.value ?? [])
    const selectedKeySet = new Set(keys)
    const rows = isCrossPageSelectionEnabled.value
      ? crossPageState.getSelectedRows()
      : normalizedData.value.filter(r => selectedKeySet.has(resolvedRowKey(r)))
    try {
      const result = await batchTasks.run(action.key, () =>
        action.onClick(keys, rows)
      )
      if (!result.executed) return
      if (resolved.value.batchActions?.clearSelectionOnSuccess) {
        clearBatchSelection()
      }
    } catch (error) {
      resolved.value.batchActions?.onError?.(error, action.key)
      emit('batch-action-error', error, action.key)
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
      ? crossPageState.getPageCheckedKeys(displayedRows.value)
      : null
  )

  /** 选中行变更统一处理 */
  const handleCheckedKeysChange = (keys: DataTableRowKey[]) => {
    if (isCrossPageSelectionEnabled.value) {
      crossPageState.handlePageSelectionChange(keys, displayedRows.value)
      return
    }
    tableManager.expandState?.handleSelectionChange?.(keys)
  }

  /** 导出 */
  const exportTasks = useActionTask<string>()
  const handleExport = async () => {
    const cfg = resolved.value.exportConfig ?? {}
    await exportTasks.run('export', async () => {
      const selectedRows = () =>
        isCrossPageSelectionEnabled.value
          ? crossPageState.getSelectedRows()
          : tableManager.stateManager.selection.getSelected()
      const source =
        cfg.scope === 'page' ? displayedRows.value : normalizedData.value
      const rows = cfg.requestData
        ? await cfg.requestData()
        : cfg.scope === 'selected'
          ? selectedRows()
          : source
      const columns =
        cfg.scope && cfg.scope !== 'source'
          ? reactiveColumns.value
          : effectiveColumns.value
      const exportColumns = columns.map(column =>
        column.dictionary !== undefined && !column.formatter
          ? {
              ...column,
              formatter: {
                type: 'enum' as const,
                fn: (value: unknown) =>
                  columnState.getDictionaryLabel(column, value),
              },
            }
          : column
      )
      await exportTableData(rows, exportColumns, {
        ...cfg,
        formatterConfig: resolved.value.formatterConfig,
      })
    })
  }

  /* ================= 合计行 ================= */

  const summaryFn = computed(() => resolved.value.summaryRender)

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

  const computedTableProps = computed(() => ({
    striped: resolved.value.striped,
    bordered: resolved.value.bordered,
    singleLine: resolved.value.singleLine,
    size: resolved.value.size,
    maxHeight: resolved.value.maxHeight,
    // 自动测宽使用固定布局和实际 scrollX，长内容只在单元格内省略。
    // 原生 table-layout 仍允许通过 $attrs 显式覆盖。
    tableLayout:
      computedScrollX.value !== undefined ? ('fixed' as const) : undefined,
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

  const formKey = computed(
    () =>
      `edit-form-${tableManager.editStates.modalEdit.editingRowKey.value ?? 'new'}`
  )

  const formOptions = computed(() =>
    generateFormOptions(effectiveColumns.value, () => localEditingData.value)
  )

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
    if (!editFormRef.value || modalSubmitLoading.value) return
    const targetKey = tableManager.editStates.modalEdit.editingRowKey.value
    const snapshot = cloneData(localEditingData.value)
    modalSubmitLoading.value = true
    try {
      try {
        await editFormRef.value.validate()
      } catch {
        /* 表单验证错误由组件内联显示 */
        return
      }
      if (
        targetKey !== tableManager.editStates.modalEdit.editingRowKey.value ||
        !isDataEqual(snapshot, localEditingData.value)
      )
        return
      await tableManager.editStates.modalEdit.saveEdit(snapshot)
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
  const getNativeLocalRowCount = () =>
    tableRef.value?.getFilteredAndSortedData?.().length ??
    nativeFallbackPipeline.processedData.value.length

  const exposedApi = {
    startEdit: edit.start,
    cancelEdit: edit.cancel,
    saveEdit: () =>
      tableManager.editStates.modalEdit.isModalVisible.value
        ? handleModalSave()
        : edit.save(),
    expandRow: expand.row,
    collapseRow: expand.collapse,
    toggleExpand: expand.toggle,
    retryExpand: (rowKey: DataTableRowKey) =>
      tableManager.expandState.retryExpand(rowKey),
    invalidateExpand: (rowKey?: DataTableRowKey) =>
      tableManager.expandState.invalidateExpand(rowKey),
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
    resetToFirstPage: () => {
      if (usesNativePagination.value) {
        nativeUncontrolledPage.value = 1
        tableRef.value?.page(1)
      } else paginationState.resetToFirstPage()
    },
    getTotalPages: () => {
      if (!usesNativePagination.value) return paginationState.getTotalPages()
      const native = props.pagination
      if (!native) return 1
      if (
        nativeRemote.value &&
        native.itemCount === undefined &&
        native.pageCount !== undefined
      )
        return Math.max(1, native.pageCount)
      const count = nativeRemote.value
        ? (native.itemCount ?? normalizedData.value.length)
        : getNativeLocalRowCount()
      const pageSize = native.pageSize ?? nativeUncontrolledPageSize.value
      return Math.max(1, Math.ceil(count / Math.max(1, pageSize)))
    },
    getSelectedRows: () =>
      isCrossPageSelectionEnabled.value
        ? crossPageState.getSelectedRows()
        : selection.getSelected(),
    getEditingData: () => edit.getEditingData() ?? null,
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

  // 先校验内部结构，再在唯一公开边界恢复数据输入已经确定的模型类型。
  const publicApi =
    exposedApi satisfies TableInstance as unknown as TableInstance<T, C>
  defineExpose(publicApi)

  /* 自动连接 crud.tableRef */
  onMounted(() => {
    const crudRef = props.crud?.tableRef
    if (crudRef) crudRef.value = publicApi
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
      rowDragEnabled,
      () => normalizedLoading.value,
      () => displayedRows.value.length,
      () => paginationState.currentPage.value,
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
