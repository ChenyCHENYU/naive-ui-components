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
          @dropdown-select="(item) => handleDropdownClick(item, action)"
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

    <div v-if="$slots.center" class="actions-center">
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
          @dropdown-select="(item) => handleDropdownClick(item, action)"
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
import { computed, unref, h, withDirectives, defineComponent } from "vue";
import type { PropType } from "vue";
import { NButton, NTooltip, NDropdown, NDivider } from "naive-ui";
import C_Icon from "../C_Icon/index.vue";
import type {
  ActionItem,
  ActionDropdownItem,
  ActionBarConfig,
  TableActionsProps,
  TableActionsEmits,
} from "./types";

defineOptions({ name: "C_ActionBar" });

const props = withDefaults(defineProps<TableActionsProps>(), {
  actions: () => [],
  leftActions: () => [],
  rightActions: () => [],
  config: () => ({}),
});

const emit = defineEmits<TableActionsEmits>();

const defaultConfig: Required<ActionBarConfig> = {
  align: "left",
  size: "medium",
  gap: 8,
  wrap: false,
  showDivider: false,
  dividerType: "vertical",
  compact: false,
  inline: true,
};

const finalConfig = computed<Required<ActionBarConfig>>(() => ({
  ...defaultConfig,
  ...props.config,
}));

const leftButtonList = computed<ActionItem[]>(() => {
  if (props.leftActions && props.leftActions.length > 0) {
    return props.leftActions.filter((action) => shouldShowAction(action));
  }
  if (props.actions.length > 0) {
    const hasRightActions = props.rightActions && props.rightActions.length > 0;
    const hasRightGroup = props.actions.some(
      (action) => action.group === "right",
    );
    if (!hasRightActions && !hasRightGroup) {
      return props.actions.filter((action) => shouldShowAction(action));
    }
    return props.actions.filter(
      (action) => action.group === "left" && shouldShowAction(action),
    );
  }
  return [];
});

const rightButtonList = computed<ActionItem[]>(() => {
  if (props.rightActions && props.rightActions.length > 0) {
    return props.rightActions.filter((action) => shouldShowAction(action));
  }
  return props.actions.filter(
    (action) => action.group === "right" && shouldShowAction(action),
  );
});

const shouldShowAction = (action: ActionItem): boolean => {
  if (action.show === undefined) return true;
  return unref(action.show);
};

const isActionDisabled = (action: ActionItem): boolean => {
  return unref(action.disabled) || false;
};

const isActionLoading = (action: ActionItem): boolean => {
  return unref(action.loading) || false;
};

const handleActionClick = async (action: ActionItem) => {
  if (action.dropdown && action.dropdown.length > 0) return;
  emit("action-click", action);
  if (action.onClick) {
    await action.onClick();
  }
};

const handleDropdownClick = async (
  item: ActionDropdownItem,
  action: ActionItem,
) => {
  emit("dropdown-click", item, action);
  if (item.onClick) {
    await item.onClick();
  }
};

const ActionButton = defineComponent({
  name: "ActionButton",
  props: {
    action: {
      type: Object as PropType<ActionItem>,
      required: true,
    },
  },
  emits: ["click", "dropdown-select"],
  setup(props, { emit }) {
    const action = computed(() => props.action);

    const dropdownOptions = computed(() => {
      if (!action.value.dropdown) return [];
      return action.value.dropdown
        .filter((item) => {
          if (item.show === undefined) return true;
          return unref(item.show);
        })
        .map((item) => ({
          key: item.key,
          label: item.label,
          icon: item.icon
            ? () => h(C_Icon, { name: item.icon, size: 14 })
            : undefined,
          disabled: unref(item.disabled),
        }));
    });

    const handleDropdownSelect = (key: string) => {
      const item = action.value.dropdown?.find((d) => d.key === key);
      if (item) {
        emit("dropdown-select", item);
      }
    };

    const createButtonVNode = (extraProps?: Record<string, any>) => {
      const button = h(
        NButton,
        {
          type: action.value.type || "default",
          size: action.value.size || finalConfig.value.size,
          loading: isActionLoading(action.value),
          disabled: isActionDisabled(action.value),
          ...extraProps,
          ...action.value.buttonProps,
        },
        {
          default: () => action.value.label,
          icon: action.value.icon
            ? () => h(C_Icon, { name: action.value.icon, size: 16 })
            : undefined,
        },
      );

      return action.value.directives && action.value.directives.length > 0
        ? withDirectives(button, action.value.directives as any)
        : button;
    };

    const renderButton = () => {
      const vnode = createButtonVNode({ onClick: () => emit("click") });
      if (action.value.tooltip) {
        return h(
          NTooltip,
          { placement: "top" },
          {
            trigger: () => vnode,
            default: () => action.value.tooltip,
          },
        );
      }
      return vnode;
    };

    const renderDropdownButton = () => {
      const vnode = createButtonVNode();
      return h(
        NDropdown,
        {
          options: dropdownOptions.value,
          onSelect: handleDropdownSelect,
        },
        {
          default: () => vnode,
        },
      );
    };

    return () => {
      if (action.value.dropdown && action.value.dropdown.length > 0) {
        return renderDropdownButton();
      }
      return renderButton();
    };
  },
});
</script>

<style scoped lang="scss">
@use "./index.scss";
</style>
