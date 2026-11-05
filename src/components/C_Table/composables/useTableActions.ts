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
  InlineTableAction,
  UseTableActionsOptions,
  UseTableActionsReturn,
} from '../types'
import { renderActionIcon } from '../../C_ActionBar/actionIcon'
import { resolveActionPreset } from '../../C_ActionBar/presets'
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
        title,
        'aria-label': title,
        onClick,
        loading: loading || (runningKey ? tasks.isRunning(runningKey) : false),
        disabled: runningKey ? tasks.isRunning(runningKey) : false,
      },
      () => renderActionIcon(icon, 14)
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
      createButton('mdi:pencil-outline', t('common.edit'), 'warning', () =>
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
          'mdi:eye-outline',
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
          'mdi:pencil-outline',
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
          'mdi:delete-outline',
          t('common.delete'),
          'error',
          () => void handleDelete(row, index).catch(() => undefined),
          taskKey(rowKey(row), 'delete')
        )
      )
    }

    return buttons
  }

  const resolveRowAction = (
    action: InlineTableAction<T>,
    row: T,
    index: number
  ) => {
    const { key, onClick, show, disabled } = action
    const preset = resolveActionPreset({
      key,
      label:
        typeof action.label === 'function'
          ? action.label(row, index)
          : action.label,
      icon:
        typeof action.icon === 'function'
          ? action.icon(row, index)
          : action.icon,
      type:
        typeof action.type === 'function'
          ? action.type(row, index)
          : action.type,
    })
    const { label, icon } = preset
    const task = taskKey(rowKey(row), `custom:${key}`)
    const canRun = () => show?.(row, index) !== false && !disabled?.(row, index)
    const loading = tasks.isRunning(task)
    return {
      key,
      label,
      icon,
      type: preset.type,
      loading,
      disabled: loading || !!disabled?.(row, index),
      run: () =>
        void tasks
          .run(task, () => onClick(row, index), canRun)
          .catch(error =>
            feedback.error(t('table.actionFailed', { action: label }), error)
          ),
    }
  }

  const renderInlineActions = (row: T, index: number) =>
    (actions.value?.inline ?? [])
      .filter(action => action.show?.(row, index) !== false)
      .map(action => {
        const entry = resolveRowAction(action, row, index)
        return h(
          NButton,
          {
            key: entry.key,
            text: true,
            size: config.value.controlSize ?? 'small',
            type: entry.type,
            title: action.tooltip ?? entry.label,
            loading: entry.loading,
            disabled: entry.disabled,
            onClick: (event: MouseEvent) => {
              // 行动作不能同时切换工作区的当前记录。
              event.stopPropagation()
              entry.run()
            },
          },
          {
            default: () => entry.label,
            icon: () => renderActionIcon(entry.icon, 14),
          }
        )
      })

  const renderCustomDropdown = (row: T, index: number) => {
    const entries = (actions.value?.custom ?? [])
      .filter(action => action.show?.(row, index) !== false)
      .map(action => resolveRowAction(action, row, index))
    if (!entries.length) return null

    return h(
      NDropdown,
      {
        options: entries.map(({ key, label, icon, disabled }) => ({
          key,
          label,
          disabled,
          icon: () => renderActionIcon(icon, 14),
        })),
        onSelect: (key: string) =>
          entries.find(entry => entry.key === key)?.run(),
      },
      () =>
        createButton(
          'mdi:dots-horizontal',
          t('table.moreActions'),
          'default',
          () => {},
          undefined,
          entries.some(entry => entry.loading)
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
      ...renderInlineActions(row, index),
    ]

    const dropdown = renderCustomDropdown(row, index)
    if (dropdown) allButtons.push(dropdown)

    return h(NSpace, { size: 2, wrap: false }, () => allButtons)
  }

  return { renderActions, isActionEnabled }
}
