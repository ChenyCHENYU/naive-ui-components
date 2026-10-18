/*
 * @Description: 表格操作按钮Hook
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
 */

import { h, getCurrentScope, onScopeDispose, type VNodeChild } from 'vue'
import { NButton, NSpace, NDropdown, type DataTableRowKey } from 'naive-ui'
import type {
  DataRecord,
  ApiFunction,
  ButtonType,
  UseTableActionsOptions,
  UseTableActionsReturn,
} from '../types'
import C_Icon from '../../C_Icon/index.vue'
import { useActionTask } from '../../../composables/useActionTask'
import { useComponentFeedback, useComponentLocale } from '../../../config'

/** Request-core reports action failures as values rather than rejected promises. */
const actionResultError = (result: unknown): unknown =>
  result && typeof result === 'object' && 'error' in result
    ? result.error
    : null

/**
 * 表格操作Hook
 */
export function useTableActions<T extends object = DataRecord>(
  options: UseTableActionsOptions<T>
): UseTableActionsReturn<T> {
  const {
    actions,
    config,
    tableManager,
    rowKey,
    onRowDeleted,
    onViewDetail,
    isDeleteFeedbackHandled,
  } = options
  const tasks = useActionTask<string>()
  let active = true
  if (getCurrentScope())
    onScopeDispose(() => {
      active = false
    })
  const taskKey = (key: DataTableRowKey, action: string) =>
    JSON.stringify([typeof key, key, action])
  const feedback = useComponentFeedback(() => config.value.feedback)
  const { t } = useComponentLocale(() => config.value.locale)

  /* 检查操作是否启用 */
  const isActionEnabled = (key: 'edit' | 'delete' | 'detail') => {
    if (key === 'edit') {
      return config.value.editable && actions.value?.edit !== false
    }
    return typeof actions.value?.[key] === 'function'
  }

  /* 类型守卫：检查是否为有效API函数 */
  const isValidApiFunction = <TData extends object>(
    action: false | ApiFunction<TData> | undefined
  ): action is ApiFunction<TData> => {
    return action !== false && typeof action === 'function'
  }

  /* 自动提取API响应数据 */
  const extractApiResponseData = <TData>(response: unknown): TData => {
    if (response && typeof response === 'object' && 'data' in response) {
      return (response as Record<string, unknown>).data as TData
    }
    return response as TData
  }

  /* 创建按钮的通用方法 */
  const createButton = (
    icon: string,
    title: string,
    type: ButtonType = 'primary',
    onClick: () => void,
    runningKey?: string,
    loading = false
  ) =>
    h(
      NButton,
      {
        size: config.value.controlSize ?? 'small',
        type,
        quaternary: true,
        onClick,
        loading: loading || (runningKey ? tasks.isRunning(runningKey) : false),
        disabled: runningKey ? tasks.isRunning(runningKey) : false,
      },
      () => [h(C_Icon, { name: icon, size: 14, title })]
    )

  /* 处理编辑操作 */
  const performEdit = async (row: T, index: number) => {
    const rowKeyValue = rowKey(row)
    const editAction = actions.value?.edit

    if (isValidApiFunction(editAction)) {
      try {
        await editAction(row, index)
      } catch (error) {
        feedback.error(
          t('table.actionFailed', { action: t('common.edit') }),
          error
        )
      }
      return
    }

    if (config.value.editMode === 'modal') {
      tableManager.editStates.modalEdit.startEdit(rowKeyValue, { ...row })
    } else {
      tableManager.editStates.rowEdit.startEditRow(rowKeyValue)
    }
  }

  const reportDeleteError = (error: unknown, feedbackHandled: boolean) => {
    if (active && !feedbackHandled)
      feedback.error(t('table.deleteFailed'), error)
  }

  /* 执行删除API */
  const executeDelete = async (
    deleteAction: ApiFunction<T>,
    row: T,
    index: number
  ) => {
    const feedbackHandled = isDeleteFeedbackHandled?.(deleteAction) === true
    try {
      const result = await deleteAction(row, index)
      if (!active) return
      const resultError = actionResultError(result)
      if (resultError !== null && resultError !== undefined) {
        reportDeleteError(resultError, feedbackHandled)
        return
      }
      if (!feedbackHandled) feedback.success(t('table.deleteSuccess'))
      onRowDeleted?.(row, index)
    } catch (error) {
      reportDeleteError(error, feedbackHandled)
      throw error
    }
  }

  /* 处理删除操作 */
  const performDelete = async (row: T, index: number) => {
    const deleteAction = actions.value?.delete

    if (!isValidApiFunction(deleteAction)) {
      return
    }

    const confirmed = await feedback.confirm({
      title: t('table.deleteTitle'),
      content: t('table.deleteContent'),
      positiveText: t('common.confirm'),
      negativeText: t('common.cancel'),
      type: 'warning',
    })
    if (confirmed && active) await executeDelete(deleteAction, row, index)
  }

  /* 处理详情操作 */
  const performDetail = async (row: T, index: number) => {
    const detailAction = actions.value?.detail

    if (!isValidApiFunction(detailAction)) {
      onViewDetail?.(row)
      return
    }

    try {
      const apiResponse = await detailAction(row, index)
      if (!active) return
      const detailData = extractApiResponseData<T>(apiResponse)
      onViewDetail?.(detailData || row)
    } catch (error) {
      if (!active) return
      feedback.error(t('table.detailFailed'), error)
      onViewDetail?.(row)
    }
  }

  const handleEdit = (row: T, index: number) =>
    tasks.run(taskKey(rowKey(row), 'edit'), () => performEdit(row, index))
  const handleDelete = (row: T, index: number) =>
    tasks.run(taskKey(rowKey(row), 'delete'), () => performDelete(row, index))
  const handleDetail = (row: T, index: number) =>
    tasks.run(taskKey(rowKey(row), 'detail'), () => performDetail(row, index))

  /* 渲染行编辑按钮 */
  const renderRowEditButtons = (rowKeyValue: DataTableRowKey) => {
    const isEditing = tableManager.editStates.rowEdit.isEditingRow(rowKeyValue)

    if (isEditing) {
      return [
        createButton(
          'mdi:check',
          t('common.save'),
          'primary',
          () =>
            void tasks
              .run(taskKey(rowKeyValue, 'save'), () =>
                tableManager.editStates.rowEdit.saveEditRow()
              )
              .catch((error: unknown) =>
                feedback.error(
                  t('table.actionFailed', { action: t('common.save') }),
                  error
                )
              ),
          taskKey(rowKeyValue, 'save')
        ),
        createButton(
          'mdi:close',
          t('common.cancel'),
          'default',
          () =>
            void tasks
              .run(taskKey(rowKeyValue, 'cancel'), () =>
                tableManager.editStates.rowEdit.cancelEditRow()
              )
              .catch(error =>
                feedback.error(
                  t('table.actionFailed', { action: t('common.cancel') }),
                  error
                )
              ),
          taskKey(rowKeyValue, 'cancel')
        ),
      ]
    }

    return [
      createButton('mdi:pencil', t('common.edit'), 'warning', () =>
        tableManager.editStates.rowEdit.startEditRow(rowKeyValue)
      ),
    ]
  }

  /* 渲染基础操作按钮 */
  const renderBasicActions = (row: T, index: number) => {
    const buttons: VNodeChild[] = []

    if (isActionEnabled('detail')) {
      buttons.push(
        createButton(
          'mdi:eye',
          t('common.detail'),
          'info',
          () => void handleDetail(row, index),
          taskKey(rowKey(row), 'detail')
        )
      )
    }

    if (
      isActionEnabled('edit') &&
      (config.value.editMode === 'modal' ||
        isValidApiFunction(actions.value?.edit))
    ) {
      buttons.push(
        createButton(
          'mdi:pencil',
          t('common.edit'),
          'warning',
          () => void handleEdit(row, index),
          taskKey(rowKey(row), 'edit')
        )
      )
    }

    if (isActionEnabled('delete')) {
      buttons.push(
        createButton(
          'mdi:delete',
          t('common.delete'),
          'error',
          () => void handleDelete(row, index).catch(() => undefined),
          taskKey(rowKey(row), 'delete')
        )
      )
    }

    return buttons
  }

  /* 渲染自定义操作下拉菜单 */
  const renderCustomDropdown = (row: T, index: number) => {
    const customActions = actions.value?.custom
    if (!customActions?.length) return null

    const visibleActions = customActions.filter(action =>
      action.show ? action.show(row, index) : true
    )

    if (!visibleActions.length) return null

    const options = visibleActions.map(action => {
      const label =
        typeof action.label === 'function'
          ? action.label(row, index)
          : action.label
      const icon =
        typeof action.icon === 'function'
          ? action.icon(row, index)
          : action.icon

      return {
        label,
        key: action.key,
        icon: () => h(C_Icon, { name: icon, size: 14 }),
        disabled:
          action.disabled?.(row, index) ||
          tasks.isRunning(taskKey(rowKey(row), `custom:${action.key}`)),
      }
    })

    return h(
      NDropdown,
      {
        options,
        onSelect: (key: string) => {
          const action = visibleActions.find(a => a.key === key)
          if (!action) return
          const actionLabel =
            typeof action.label === 'function'
              ? action.label(row, index)
              : action.label
          void tasks
            .run(
              taskKey(rowKey(row), `custom:${action.key}`),
              () => action.onClick(row, index),
              () => !action.disabled?.(row, index)
            )
            .catch(error =>
              feedback.error(
                t('table.actionFailed', { action: actionLabel }),
                error
              )
            )
        },
      },
      () =>
        createButton(
          'mdi:dots-horizontal',
          t('table.moreActions'),
          'default',
          () => {},
          undefined,
          visibleActions.some(action =>
            tasks.isRunning(taskKey(rowKey(row), `custom:${action.key}`))
          )
        )
    )
  }

  /* 主渲染方法 */
  const renderActions = (row: T, index: number): VNodeChild => {
    if (actions.value?.render) {
      return actions.value.render(row, index)
    }

    const rowKeyValue = rowKey(row)
    const isRowEditMode =
      config.value.editable && ['row', 'both'].includes(config.value.editMode)

    if (
      isRowEditMode &&
      tableManager.editStates.rowEdit.isEditingRow(rowKeyValue)
    ) {
      return h(NSpace, { size: 2, wrap: false }, () =>
        renderRowEditButtons(rowKeyValue)
      )
    }

    const hasCustomEditAction = isValidApiFunction(actions.value?.edit)
    const allButtons = [
      ...(isRowEditMode && !hasCustomEditAction
        ? renderRowEditButtons(rowKeyValue)
        : []),
      ...renderBasicActions(row, index),
    ]

    const dropdown = renderCustomDropdown(row, index)
    if (dropdown) allButtons.push(dropdown)

    return h(NSpace, { size: 2, wrap: false }, () => allButtons)
  }

  return { renderActions, isActionEnabled }
}
