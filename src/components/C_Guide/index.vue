<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2025-06-01
 * @Description: 用户引导组件（基于 driver.js）
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
-->
<template>
  <NTooltip placement="bottom" trigger="hover">
    <template #trigger>
      <NButton text @click="startGuide">
        <div class="i-mdi:sign-routes" />
      </NButton>
    </template>
    <span>功能引导</span>
  </NTooltip>
</template>

<script setup lang="ts">
import { NTooltip, NButton } from "naive-ui";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

defineOptions({ name: "C_Guide" });

export interface GuideStep {
  element: string;
  popover: {
    title: string;
    description: string;
    side?: "top" | "right" | "bottom" | "left";
  };
}

const props = withDefaults(
  defineProps<{
    steps?: GuideStep[];
    doneBtnText?: string;
    nextBtnText?: string;
    prevBtnText?: string;
  }>(),
  {
    steps: () => [],
    doneBtnText: "完成",
    nextBtnText: "下一步",
    prevBtnText: "上一步",
  },
);

const startGuide = () => {
  const driverObj = driver({
    popoverClass: "driverjs-theme",
    animate: true,
    showProgress: true,
    doneBtnText: props.doneBtnText,
    nextBtnText: props.nextBtnText,
    prevBtnText: props.prevBtnText,
  });

  if (props.steps.length > 0) {
    driverObj.setSteps(props.steps);
  }
  driverObj.drive();
};

defineExpose({ startGuide });
</script>
