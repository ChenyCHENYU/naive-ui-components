<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-14
 * @Description: 通用操作按钮组件 - 配置化管理任何场景的按钮组
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
-->
<template>
  <div
    ref="bar"
    class="c-action-bar"
    :style="themeStyle"
    :class="{
      'is-compact': finalConfig.compact,
      'is-inline': finalConfig.inline,
      'is-wrap': finalConfig.wrap,
      'has-overflow': buttonGroups.overflow.length > 0,
      [`is-align-${finalConfig.align}`]: true,
      'has-only-left':
        buttonGroups.left.length > 0 &&
        buttonGroups.right.length === 0 &&
        !buttonGroups.overflow.length &&
        !$slots.center,
      'has-only-right':
        buttonGroups.right.length > 0 &&
        buttonGroups.left.length === 0 &&
        !buttonGroups.overflow.length &&
        !$slots.center,
    }"
  >
    <template
      v-for="group in groupOrder"
      :key="group"
    >
      <template v-if="group === 'center'">
        <div
          v-if="$slots.center"
          class="actions-center"
        >
          <slot name="center" />
        </div>
      </template>
      <div
        v-else-if="buttonGroups[group].length > 0"
        class="actions-group"
        :class="`actions-${group}`"
        :style="{ gap: `${finalConfig.gap}px` }"
      >
        <template
          v-for="(entry, index) in buttonGroups[group]"
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
              finalConfig.showDivider && index < buttonGroups[group].length - 1
            "
            :vertical="finalConfig.dividerType === 'vertical'"
            class="action-divider"
            :class="{
              'action-divider--horizontal':
                finalConfig.dividerType === 'horizontal',
            }"
          />
        </template>
      </div>
    </template>
    <ActionOverflow
      v-if="overflowAt"
      :anchor="bar"
      :threshold="overflowAt"
      :entries="buttonGroups.overflow"
      :size="finalConfig.size"
      :resolve="resolveOverflowEntry"
      @narrow="narrow = $event"
      @select="handleActionClick"
    />
  </div>
</template>

<script setup lang="ts">
  import { useComponentDensity } from '../../composables/useComponentDensity'
  import { resolveComponentDensity } from '../../core/density'
  import { useComponentTheme } from '../../composables/useComponentTheme'
  import { useComponentLocale } from '../../composables/useComponentLocale'
  import {
    computed,
    h,
    withDirectives,
    defineAsyncComponent,
    defineComponent,
    ref,
    type PropType,
  } from 'vue'
  import { NButton, NTooltip, NDropdown, NDivider } from 'naive-ui'
  import { renderActionIcon } from './actionIcon'
  import { useActionGroups } from './useActionGroups'
  import { useActionTask } from '../../composables/useActionTask'
  import type {
    ActionItem,
    ActionEntry,
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
  const themeStyle = useComponentTheme()
  const scopedDensity = useComponentDensity()
  const { t } = useComponentLocale()
  // 仅翻译组件的默认文案；公开预设及独立解析函数保留原中文契约。
  const actionLabelKeys: Readonly<Record<string, string>> = {
    add: 'common.add',
    create: 'common.add',
    save: 'common.save',
    confirm: 'action.confirm',
    cancel: 'common.cancel',
    close: 'common.close',
    view: 'common.view',
    edit: 'common.edit',
    delete: 'common.delete',
    remove: 'common.delete',
    refresh: 'common.refresh',
    import: 'common.import',
    export: 'common.export',
    print: 'common.print',
    reset: 'common.reset',
    columns: 'table.columnSettings',
    fullscreen: 'common.fullscreen',
    settings: 'common.settings',
    more: 'common.more',
  }

  const resolveLabeledAction = (action: ActionItem) => {
    const resolved = resolveActionPreset(action)
    if (action.label) return resolved
    const { key } = action
    const messageKey =
      key && Object.prototype.hasOwnProperty.call(actionLabelKeys, key)
        ? actionLabelKeys[key]
        : undefined
    return {
      ...resolved,
      label: messageKey ? t(messageKey) : key || t('common.action'),
    }
  }

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
    size:
      props.config.size ??
      (scopedDensity.value
        ? resolveComponentDensity(scopedDensity.value).size
        : ACTION_BAR_DEFAULT_CONFIG.size),
    // 行内模式也通过按钮间距体现紧凑程度；显式 gap 始终优先。
    gap:
      props.config.gap ??
      (props.config.compact === false ? 12 : ACTION_BAR_DEFAULT_CONFIG.gap),
  }))

  const ActionOverflow = defineAsyncComponent({
    loader: () => import('./ActionOverflow.vue'),
    suspensible: false,
  })
  const bar = ref<HTMLElement>()
  const { buttonGroups, narrow, overflowAt } = useActionGroups(
    props,
    () => finalConfig.value.overflowAt
  )
  const groupOrder = ['left', 'center', 'right'] as const
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

  const resolveOverflowEntry = ({ action, taskKey }: ActionEntry) => {
    const { label, icon } = resolveLabeledAction(action)
    return {
      label,
      icon,
      disabled:
        isActionDisabled(action, taskKey) || isActionLoading(action, taskKey),
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
      const resolvedAction = computed(() => resolveLabeledAction(action.value))
      const buttonSize = computed(
        () =>
          resolvedAction.value.buttonProps?.size ||
          resolvedAction.value.size ||
          finalConfig.value.size
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
              icon: icon ? () => renderActionIcon(icon, 14) : undefined,
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
            icon:
              icon && !buttonProps?.renderIcon
                ? () => renderActionIcon(icon, iconSize.value)
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
