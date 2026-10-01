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
        v-for="(action, index) in leftButtonList"
        :key="action.key || `left-${index}`"
      >
        <ActionButton
          :action="action"
          @click="handleActionClick(action)"
          @dropdown-select="item => handleDropdownClick(item, action)"
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
        v-for="(action, index) in rightButtonList"
        :key="action.key || `right-${index}`"
      >
        <ActionButton
          :action="action"
          @click="handleActionClick(action)"
          @dropdown-select="item => handleDropdownClick(item, action)"
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
    shallowReactive,
    h,
    withDirectives,
    defineComponent,
    type PropType,
  } from 'vue'
  import { NButton, NTooltip, NDropdown, NDivider } from 'naive-ui'
  import C_Icon from '../C_Icon/index.vue'
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

  const leftButtonList = computed<ActionItem[]>(() => {
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

  const rightButtonList = computed<ActionItem[]>(() => {
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

  const runningActions = shallowReactive(new Set<ActionItem>())

  const isActionDisabled = (action: ActionItem): boolean => {
    return resolveActionState(action.disabled) || runningActions.has(action)
  }

  const isActionLoading = (action: ActionItem): boolean => {
    return resolveActionState(action.loading) || runningActions.has(action)
  }

  const handleActionClick = async (action: ActionItem) => {
    if (action.dropdown && action.dropdown.length > 0) return
    if (isActionDisabled(action) || isActionLoading(action)) return
    emit('action-click', action)
    if (!action.onClick) return

    if (action.autoLoading !== false) runningActions.add(action)
    try {
      await action.onClick()
    } finally {
      runningActions.delete(action)
    }
  }

  const handleDropdownClick = async (
    item: ActionDropdownItem,
    action: ActionItem
  ) => {
    emit('dropdown-click', item, action)
    if (item.onClick) {
      await item.onClick()
    }
  }

  const ActionButton = defineComponent({
    name: 'ActionButton',
    props: {
      action: {
        type: Object as PropType<ActionItem>,
        required: true,
      },
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
              disabled: resolveActionState(item.disabled),
            }
          })
      })

      const handleDropdownSelect = (key: string) => {
        const item = resolvedAction.value.dropdown?.find(d => d.key === key)
        if (item) {
          emit('dropdown-select', item)
        }
      }

      const createButtonVNode = (extraProps?: Record<string, any>) => {
        const { icon } = resolvedAction.value
        const button = h(
          NButton,
          {
            type: resolvedAction.value.type || 'default',
            size: buttonSize.value,
            loading: isActionLoading(action.value),
            disabled: isActionDisabled(action.value),
            ...extraProps,
            ...resolvedAction.value.buttonProps,
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
        const vnode = createButtonVNode({ onClick: () => emit('click') })
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
