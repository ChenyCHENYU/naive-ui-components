<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2025-06-01
 * @Description: 表单组件 - 网格表单组件
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
-->

<template>
  <div class="c-grid-layout">
    <!-- 配置面板 -->
    <NCard
      v-if="showConfigPanel"
      size="small"
      :bordered="false"
      class="config-panel"
    >
      <template #header>
        <div class="config-header">
          <C_Icon :name="'mdi:view-grid'" :size="18" />
          <span>网格配置</span>
        </div>
      </template>

      <div class="config-controls">
        <div
          v-for="control in configControls"
          :key="control.key"
          class="config-item"
        >
          <span class="config-label">{{ control.label }}:</span>
          <component
            :is="control.component"
            v-model:value="control.value"
            v-bind="control.props"
            @update:value="emitConfigChange"
          />
        </div>
      </div>
    </NCard>

    <!-- 网格容器 -->
    <NGrid v-bind="gridProps" class="grid-container">
      <NGridItem
        v-for="(item, index) in formItems"
        :key="getItemKey(item, index)"
        v-bind="getItemProps(index)"
        class="grid-item"
      >
        <div class="item-wrapper">
          <component :is="item" />
        </div>
      </NGridItem>
    </NGrid>

    <!-- 统计信息 -->
    <NAlert
      v-if="showStats && isDev"
      type="info"
      :show-icon="false"
      size="small"
      class="grid-stats"
    >
      <template #header>
        <C_Icon :name="'mdi:information-outline'" :size="16" />
        网格信息
      </template>
      {{ statsText }}
    </NAlert>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, watchEffect, toRaw } from "vue";
import type { VNode } from "vue";
import C_Icon from "../../../C_Icon/index.vue";

/* ================= 类型定义 ================= */

interface GridConfig {
  cols?: number;
  gutter?: number;
  responsive?: boolean;
  showConfigPanel?: boolean;
  showStats?: boolean;
}

interface FormOption {
  type: string;
  prop: string;
  label?: string;
  layout?: {
    span?: number;
    offset?: number;
    suffix?: boolean;
    grid?: {
      span?: number;
      offset?: number;
      suffix?: boolean;
    };
  };
}

interface Props {
  formItems: VNode[];
  layoutConfig?: { grid?: GridConfig };
  options?: FormOption[];
}

/* ================= 组件属性 ================= */

const props = withDefaults(defineProps<Props>(), {
  layoutConfig: () => ({}),
  options: () => [],
});

/* ================= 响应式状态 ================= */

const isDev = ref(typeof import.meta !== "undefined" && !!import.meta.env?.DEV);
const internalConfig = reactive({
  cols: 24,
  gutter: 16,
  responsive: true,
});

/* ================= 计算属性 ================= */

const gridConfig = computed(() => props.layoutConfig?.grid || {});
const showConfigPanel = computed(() => gridConfig.value.showConfigPanel);
const showStats = computed(() => gridConfig.value.showStats);

/* 生效的配置（内部配置优先） */
const effectiveConfig = computed(() => ({
  cols: showConfigPanel.value
    ? internalConfig.cols
    : (gridConfig.value.cols ?? 24),
  gutter: showConfigPanel.value
    ? internalConfig.gutter
    : (gridConfig.value.gutter ?? 16),
  responsive: showConfigPanel.value
    ? internalConfig.responsive
    : (gridConfig.value.responsive ?? true),
}));

/* 网格属性 */
const gridProps = computed(() => ({
  cols: effectiveConfig.value.cols,
  xGap: effectiveConfig.value.gutter,
  yGap: effectiveConfig.value.gutter,
  responsive: effectiveConfig.value.responsive ? "screen" : "self",
}));

/* 配置控件定义 */
const configControls = computed(() => [
  {
    key: "cols",
    label: "列数",
    component: "NInputNumber",
    value: computed({
      get: () => internalConfig.cols,
      set: (val: number) => (internalConfig.cols = val),
    }),
    props: { min: 1, max: 48, size: "small" },
  },
  {
    key: "gutter",
    label: "间距",
    component: "NInputNumber",
    value: computed({
      get: () => internalConfig.gutter,
      set: (val: number) => (internalConfig.gutter = val),
    }),
    props: { min: 0, max: 48, size: "small" },
  },
  {
    key: "responsive",
    label: "响应式",
    component: "NSwitch",
    value: computed({
      get: () => internalConfig.responsive,
      set: (val: boolean) => (internalConfig.responsive = val),
    }),
    props: { size: "small" },
  },
]);

/* 统计文本 */
const statsText = computed(
  () =>
    `列数: ${effectiveConfig.value.cols} | 间距: ${effectiveConfig.value.gutter}px | 项目: ${props.formItems.length}个`,
);

/* ================= 核心方法 ================= */

/**
 * 获取表单项key
 */
const getItemKey = (item: VNode, index: number): string =>
  String(item.key) || (item.props as any)?.path || `grid-item-${index}`;

/**
 * 获取布局属性值
 */
const getLayoutValue = (index: number, key: "span" | "offset" | "suffix") => {
  const option = props.options?.[index]?.layout;
  return option?.[key] ?? option?.grid?.[key];
};

/**
 * 获取默认span值
 */
const getDefaultSpan = (): number => {
  const { cols } = effectiveConfig.value;
  return cols <= 12 ? cols : cols <= 24 ? 12 : 8;
};

/**
 * 获取网格项属性
 */
const getItemProps = (index: number) => {
  const span = getLayoutValue(index, "span");
  const offset = getLayoutValue(index, "offset");
  const suffix = getLayoutValue(index, "suffix");

  return {
    span:
      typeof span === "number" && span > 0 && span <= effectiveConfig.value.cols
        ? span
        : getDefaultSpan(),
    offset:
      typeof offset === "number" &&
      offset >= 0 &&
      offset < effectiveConfig.value.cols
        ? offset
        : 0,
    suffix: Boolean(suffix),
  };
};

/**
 * 配置变更事件
 */
const emitConfigChange = () => {
  if (isDev.value) {
    console.log("Grid config updated:", toRaw(internalConfig));
  }
};

/* ================= 监听器 ================= */

/* 同步外部配置 */
watch(
  gridConfig,
  (config) => {
    if (config.cols !== undefined) internalConfig.cols = config.cols;
    if (config.gutter !== undefined) internalConfig.gutter = config.gutter;
    if (config.responsive !== undefined)
      internalConfig.responsive = config.responsive;
  },
  { immediate: true },
);

/* 开发环境验证 */
if (isDev.value) {
  watchEffect(() => {
    const optionsCount = props.options.length;
    const itemsCount = props.formItems.length;

    if (optionsCount > 0 && optionsCount !== itemsCount) {
      console.warn(
        `[GridLayout] 配置数量(${optionsCount})与表单项数量(${itemsCount})不匹配`,
      );
    }
  });
}

/* ================= 暴露接口 ================= */

defineExpose({
  updateGridConfig: (config: Partial<GridConfig>) =>
    Object.assign(internalConfig, config),
  getCurrentConfig: () => ({ ...effectiveConfig.value }),
  getGridInfo: () => ({
    ...effectiveConfig.value,
    itemCount: props.formItems.length,
  }),
});
</script>

<style lang="scss" scoped>
@use "./index.scss";
</style>
