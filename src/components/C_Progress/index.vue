<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2025-06-01
 * @Description: 进度条组件
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
-->
<template>
  <NProgress
    v-bind="progressProps"
    :percentage="processedPercentage"
    :processing="isAnimation"
  >
    <template v-if="showIndicator && hasIndicatorSlot" #default>
      <slot name="indicator" />
    </template>
  </NProgress>
</template>

<script lang="ts" setup>
import { ref, computed, watch, useSlots, onMounted } from "vue";
import { NProgress } from "naive-ui";
import type { CSSProperties } from "vue";

defineOptions({ name: "C_Progress" });

type CSS = CSSProperties | string;

interface Props {
  percentage: number | number[];
  isAnimation?: boolean;
  time?: number;
  type?: "line" | "circle" | "multiple-circle" | "dashboard";
  borderRadius?: number | string;
  circleGap?: number;
  color?: string | string[] | { stops: string[] } | Array<{ stops: string[] }>;
  fillBorderRadius?: number | string;
  gapDegree?: number;
  gapOffsetDegree?: number;
  height?: number;
  indicatorPlacement?: "inside" | "outside";
  indicatorTextColor?: string;
  offsetDegree?: number;
  railColor?: string | string[];
  railStyle?: string | CSS | Array<string | CSS>;
  showIndicator?: boolean;
  status?: "default" | "success" | "error" | "warning" | "info";
  strokeWidth?: number;
  unit?: string;
}

const props = withDefaults(defineProps<Props>(), {
  percentage: 0,
  isAnimation: false,
  time: 3000,
  indicatorPlacement: "outside",
  showIndicator: true,
  status: "default",
  strokeWidth: 7,
  unit: "%",
});

const slots = useSlots();
const p = ref<number | number[]>(
  Array.isArray(props.percentage) ? [...props.percentage] : 0,
);

const hasIndicatorSlot = computed(() => !!slots.indicator);

const processedPercentage = computed(() => {
  return props.type === "multiple-circle"
    ? Array.isArray(p.value)
      ? p.value
      : [p.value]
    : Array.isArray(p.value)
      ? p.value[0]
      : p.value;
});

const progressProps = computed(() => ({
  type: props.type,
  borderRadius: props.borderRadius,
  circleGap: props.circleGap,
  color: props.color,
  fillBorderRadius: props.fillBorderRadius,
  gapDegree: props.gapDegree,
  gapOffsetDegree: props.gapOffsetDegree,
  height: props.height,
  indicatorPlacement: props.indicatorPlacement,
  indicatorTextColor: props.indicatorTextColor,
  offsetDegree: props.offsetDegree,
  railColor: props.railColor,
  railStyle: props.railStyle,
  status: props.status,
  strokeWidth: props.strokeWidth,
  unit: props.unit,
}));

watch(
  () => props.percentage,
  (newVal) => {
    if (!props.isAnimation) {
      p.value = newVal;
    } else if (props.type === "multiple-circle" && Array.isArray(newVal)) {
      p.value = [...newVal];
    }
  },
  { immediate: true, deep: true },
);

onMounted(() => {
  if (props.isAnimation && props.type !== "multiple-circle") {
    const targetValue = Array.isArray(props.percentage)
      ? props.percentage[0]
      : props.percentage;

    if (targetValue > 0) {
      const startTime = performance.now();

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / props.time, 1);
        p.value = Math.round(progress * targetValue);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    }
  }
});
</script>
