<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-14
 * @Description: 通用操作按钮组件 - 配置化管理任何场景的按钮组
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
-->
<template>
  <div
    class="c-action-bar"
    :class="{
      'is-compact': finalConfig.compact,
      'is-inline': finalConfig.inline,
      'is-wrap': finalConfig.wrap,
      [`is-align-${finalConfig.align}`]: true,
      'has-only-left':
        leftButtonList.length > 0 &&
        rightButtonList.length === 0 &&
        !$slots.center,
      'has-only-right':
        rightButtonList.length > 0 &&
        leftButtonList.length === 0 &&
        !$slots.center,
    }"
  >
    <div
      v-if="leftButtonList.length > 0"
      class="actions-group actions-left"
      :style="{ gap: `${finalConfig.gap}px` }"
    >
      <template
        v-for="(entry, index) in leftButtonList"
        :key="entry.renderKey"
      >
        <ActionButton
          :action="entry.action"
          :task-key="entry.taskKey"
          @click="handleActionClick(entry)"
          @dropdown-select="item => handleDropdownClick(item, entry)"
        />
        <NDivider
          v-if="
            finalConfig.showDivider &&
            index < leftButtonList.length - 1 &&
            finalConfig.dividerType === 'vertical'
          "
          vertical
          class="action-divider"
        />
      </template>
    </div>

    <div
      v-if="$slots.center"
      class="actions-center"
    >
      <slot name="center" />
    </div>

    <div
      v-if="rightButtonList.length > 0"
      class="actions-group actions-right"
      :style="{ gap: `${finalConfig.gap}px` }"
    >
      <template
        v-for="(entry, index) in rightButtonList"
        :key="entry.renderKey"
      >
        <ActionButton
          :action="entry.action"
          :task-key="entry.taskKey"
          @click="handleActionClick(entry)"
          @dropdown-select="item => handleDropdownClick(item, entry)"
        />
        <NDivider
          v-if="
            finalConfig.showDivider &&
            index < rightButtonList.length - 1 &&
            finalConfig.dividerType === 'vertical'
          "
          vertical
          class="action-divider"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
  import {
    computed,
    h,
    withDirectives,
    defineComponent,
    type PropType,
  } from 'vue'
  import { NButton, NTooltip, NDropdown, NDivider } from 'naive-ui'
  import C_Icon from '../C_Icon/index.vue'
  import { useActionTask } from '../../composables/useActionTask'
  import type {
    ActionItem,
    ActionDropdownItem,
    ActionBarConfig,
    ActionButtonSize,
    TableActionsProps,
    TableActionsEmits,
  } from './types'
  import {
    ACTION_BAR_DEFAULT_CONFIG,
    resolveActionPreset,
    resolveActionState,
  } from './presets'

  defineOptions({ name: 'C_ActionBar' })

  const props = withDefaults(defineProps<TableActionsProps>(), {
    actions: () => [],
    leftActions: () => [],
    rightActions: () => [],
    config: () => ({}),
  })

  const emit = defineEmits<TableActionsEmits>()

  const finalConfig = computed<Required<ActionBarConfig>>(() => ({
    ...ACTION_BAR_DEFAULT_CONFIG,
    ...props.config,
  }))

  const leftActions = computed<ActionItem[]>(() => {
    if (props.leftActions && props.leftActions.length > 0) {
      return props.leftActions.filter(action => shouldShowAction(action))
    }
    if (props.actions.length > 0) {
      const hasRightActions =
        props.rightActions && props.rightActions.length > 0
      const hasRightGroup = props.actions.some(
        action => action.group === 'right'
      )
      if (!hasRightActions && !hasRightGroup) {
        return props.actions.filter(action => shouldShowAction(action))
      }
      return props.actions.filter(
        action => action.group !== 'right' && shouldShowAction(action)
      )
    }
    return []
  })

  const rightActions = computed<ActionItem[]>(() => {
    if (props.rightActions && props.rightActions.length > 0) {
      return props.rightActions.filter(action => shouldShowAction(action))
    }
    return props.actions.filter(
      action => action.group === 'right' && shouldShowAction(action)
    )
  })

  const shouldShowAction = (action: ActionItem): boolean => {
    if (action.show === undefined) return true
    return resolveActionState(action.show) ?? true
  }

  interface ActionEntry {
    action: ActionItem
    taskKey: string
    renderKey: string
  }

  const createEntries = (
    actions: ActionItem[],
    group: string
  ): ActionEntry[] => {
    const occurrences = new Map<string, number>()
    return actions.map((action, index) => {
      const taskKey = JSON.stringify(
        action.key === undefined
          ? ['position', group, index]
          : ['key', action.key]
      )
      const occurrence = occurrences.get(taskKey) ?? 0
      occurrences.set(taskKey, occurrence + 1)
      return { action, taskKey, renderKey: `${taskKey}:${occurrence}` }
    })
  }

  const leftButtonList = computed(() =>
    createEntries(leftActions.value, 'left')
  )
  const rightButtonList = computed(() =>
    createEntries(rightActions.value, 'right')
  )
  const actionTasks = useActionTask<string>()

  const isActionDisabled = (action: ActionItem, taskKey: string): boolean =>
    !!(
      resolveActionState(action.disabled) ||
      action.buttonProps?.disabled ||
      actionTasks.isRunning(taskKey)
    )

  const isActionLoading = (action: ActionItem, taskKey: string): boolean =>
    !!(
      resolveActionState(action.loading) ||
      action.buttonProps?.loading ||
      (action.autoLoading !== false && actionTasks.isRunning(taskKey))
    )

  const handleActionClick = async ({ action, taskKey }: ActionEntry) => {
    if (action.dropdown && action.dropdown.length > 0) return
    try {
      await actionTasks.run(
        taskKey,
        async () => {
          emit('action-click', action)
          await action.onClick?.()
        },
        () =>
          !isActionDisabled(action, taskKey) &&
          !isActionLoading(action, taskKey)
      )
    } catch (error) {
      emit('action-error', error, action)
      throw error
    }
  }

  const handleDropdownClick = async (
    item: ActionDropdownItem,
    { action, taskKey }: ActionEntry
  ) => {
    try {
      await actionTasks.run(
        taskKey,
        async () => {
          emit('dropdown-click', item, action)
          await item.onClick?.()
        },
        () =>
          !isActionDisabled(action, taskKey) &&
          !isActionLoading(action, taskKey) &&
          resolveActionState(item.disabled) !== true &&
          resolveActionState(item.show) !== false
      )
    } catch (error) {
      emit('action-error', error, action, item)
      throw error
    }
  }

  const ActionButton = defineComponent({
    name: 'ActionButton',
    props: {
      action: {
        type: Object as PropType<ActionItem>,
        required: true,
      },
      taskKey: { type: String, required: true },
    },
    emits: ['click', 'dropdown-select'],
    setup(props, { emit }) {
      const action = computed(() => props.action)
      const resolvedAction = computed(() => resolveActionPreset(action.value))
      const buttonSize = computed(
        () => resolvedAction.value.size || finalConfig.value.size
      )
      const iconSize = computed(() => {
        const sizes: Record<ActionButtonSize, number> = {
          tiny: 14,
          small: 15,
          medium: 16,
          large: 18,
        }
        return sizes[buttonSize.value]
      })

      const dropdownOptions = computed(() => {
        if (!resolvedAction.value.dropdown) return []
        return resolvedAction.value.dropdown
          .filter(item => {
            if (item.show === undefined) return true
            return resolveActionState(item.show)
          })
          .map(item => {
            const { icon } = item
            return {
              key: item.key,
              label: item.label,
              icon: icon
                ? () => h(C_Icon, { name: icon, size: 14, 'aria-hidden': true })
                : undefined,
              disabled:
                isActionDisabled(action.value, props.taskKey) ||
                isActionLoading(action.value, props.taskKey) ||
                resolveActionState(item.disabled),
            }
          })
      })

      const handleDropdownSelect = (key: string) => {
        const item = resolvedAction.value.dropdown?.find(d => d.key === key)
        if (
          item &&
          !isActionDisabled(action.value, props.taskKey) &&
          !isActionLoading(action.value, props.taskKey) &&
          resolveActionState(item.disabled) !== true &&
          resolveActionState(item.show) !== false
        ) {
          emit('dropdown-select', item)
        }
      }

      const createButtonVNode = (onClick?: () => void) => {
        const { icon, buttonProps } = resolvedAction.value
        const notifyNativeClick = (event: MouseEvent) => {
          if (
            isActionDisabled(action.value, props.taskKey) ||
            isActionLoading(action.value, props.taskKey)
          )
            return
          onClick?.()
          const listeners = buttonProps?.onClick
          if (Array.isArray(listeners))
            listeners.forEach(listener => listener(event))
          else listeners?.(event)
        }
        const button = h(
          NButton,
          {
            type: resolvedAction.value.type || 'default',
            size: buttonSize.value,
            ...buttonProps,
            loading: isActionLoading(action.value, props.taskKey),
            disabled: isActionDisabled(action.value, props.taskKey),
            onClick: notifyNativeClick,
          },
          {
            default: () => resolvedAction.value.label,
            icon: icon
              ? () =>
                  h(C_Icon, {
                    name: icon,
                    size: iconSize.value,
                    'aria-hidden': true,
                  })
              : undefined,
          }
        )

        return resolvedAction.value.directives &&
          resolvedAction.value.directives.length > 0
          ? withDirectives(button, resolvedAction.value.directives as any)
          : button
      }

      const renderButton = () => {
        const vnode = createButtonVNode(() => emit('click'))
        if (resolvedAction.value.tooltip) {
          return h(
            NTooltip,
            { placement: 'top' },
            {
              trigger: () => vnode,
              default: () => resolvedAction.value.tooltip,
            }
          )
        }
        return vnode
      }

      const renderDropdownButton = () => {
        const vnode = createButtonVNode()
        return h(
          NDropdown,
          {
            disabled:
              isActionDisabled(action.value, props.taskKey) ||
              isActionLoading(action.value, props.taskKey),
            options: dropdownOptions.value,
            onSelect: handleDropdownSelect,
          },
          {
            default: () => vnode,
          }
        )
      }

      return () => {
        if (
          resolvedAction.value.dropdown &&
          resolvedAction.value.dropdown.length > 0
        ) {
          return renderDropdownButton()
        }
        return renderButton()
      }
    },
  })
</script>

<style scoped lang="scss">
  @use './index.scss';
</style>
