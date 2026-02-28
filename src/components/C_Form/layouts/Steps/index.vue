<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2025-06-01
 * @Description: 表单组件 - 步骤表单组件
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
-->

<template>
  <div class="c-form-steps">
    <!-- 无步骤配置时的单一面板模式 -->
    <div v-if="!hasSteps" class="single-panel">
      <component
        v-for="(item, index) in formItems"
        :key="getItemKey(item, index)"
        :is="item"
      />
    </div>

    <!-- 有步骤配置时的分步骤模式 -->
    <div v-else class="steps-container">
      <!-- 步骤指示器 -->
      <NSteps
        :current="currentStep + 1"
        :status="stepStatus"
        :size="stepsConfig.size"
        :vertical="stepsConfig.vertical"
        class="steps-indicator"
      >
        <NStep
          v-for="step in stepsWithItems"
          :key="step.config.key"
          :title="step.config.title"
          :description="step.config.description"
          :disabled="step.config.disabled"
        />
      </NSteps>

      <!-- 步骤内容区域 -->
      <NCard class="steps-content" :bordered="false">
        <div
          v-for="(step, index) in stepsWithItems"
          v-show="currentStep === index"
          :key="step.config.key"
          class="step-panel"
        >
          <!-- 步骤标题和描述 -->
          <div v-if="stepsConfig.showStepHeader" class="step-header">
            <h3 class="step-title">{{ step.config.title }}</h3>
            <p v-if="step.config.description" class="step-description">
              {{ step.config.description }}
            </p>
          </div>

          <!-- 步骤内的表单项 -->
          <div class="step-form-items">
            <component
              v-for="(item, itemIndex) in step.items"
              :key="getItemKey(item, itemIndex)"
              :is="item"
            />
          </div>
        </div>
      </NCard>

      <!-- 步骤操作按钮 -->
      <div class="steps-actions">
        <NSpace justify="space-between">
          <NButton
            v-if="currentStep > 0"
            :disabled="loading"
            @click="handlePreviousStep"
          >
            <C_Icon
              :name="'mdi:chevron-left-first'"
              :size="16"
              style="margin-right: 4px"
            />
            {{ stepsConfig.prevButtonText }}
          </NButton>

          <div></div>

          <NSpace>
            <NButton
              v-if="currentStep < stepsWithItems.length - 1"
              type="primary"
              :loading="loading"
              @click="handleNextStep"
            >
              {{ stepsConfig.nextButtonText }}
              <C_Icon
                :name="'mdi:chevron-right-last'"
                :size="16"
                style="margin-left: 4px"
              />
            </NButton>

            <slot
              name="step-actions"
              :current-step="currentStep"
              :total-steps="stepsWithItems.length"
              :is-first-step="isFirstStep"
              :is-last-step="isLastStep"
              :next-step="handleNextStep"
              :previous-step="handlePreviousStep"
              :go-to-step="goToStep"
            />
          </NSpace>
        </NSpace>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, readonly } from "vue";
import type { VNode } from "vue";
import type { StepConfig, StepsLayoutConfig } from "../../types";
import C_Icon from "../../../C_Icon/index.vue";

/* ================= 类型定义 ================= */
interface StepWithItems {
  config: StepConfig;
  items: VNode[];
}

interface Props {
  formItems: VNode[];
  layoutConfig?: {
    steps?: StepsLayoutConfig;
  };
  options?: Array<{
    layout?: {
      step?: string;
    };
  }>;
}

/* ================= 组件属性和事件 ================= */
const props = withDefaults(defineProps<Props>(), {
  layoutConfig: () => ({}),
  options: () => [],
});

const emit = defineEmits<{
  "step-change": [stepIndex: number, stepKey: string];
  "step-before-change": [currentStep: number, targetStep: number];
  "step-validate": [stepIndex: number];
}>();

/* ================= 响应式状态 ================= */
const currentStep = ref<number>(0);
const loading = ref<boolean>(false);
const stepValidationStatus = reactive<Record<number, boolean>>({});

/* ================= 计算属性 ================= */
const stepsConfig = computed(() => {
  const config = props.layoutConfig?.steps || {};
  return {
    steps: config.steps || [],
    vertical: config.vertical || false,
    size: config.size || "medium",
    showStepHeader: config.showStepHeader !== false,
    validateBeforeNext: config.validateBeforeNext || false,
    prevButtonText: config.prevButtonText || "上一步",
    nextButtonText: config.nextButtonText || "下一步",
    defaultStep: config.defaultStep || 0,
  };
});

const hasSteps = computed((): boolean => {
  return stepsConfig.value.steps.length > 0;
});

const stepsWithItems = computed((): StepWithItems[] => {
  if (!hasSteps.value) return [];

  const stepMap = new Map<string, VNode[]>();

  /* 初始化步骤映射 */
  stepsConfig.value.steps.forEach((step) => {
    stepMap.set(step.key, []);
  });

  /* 分配表单项到对应步骤 */
  props.formItems.forEach((item, index) => {
    const option = props.options?.[index];
    const stepKey =
      option?.layout?.step || stepsConfig.value.steps[0]?.key || "default";

    if (!stepMap.has(stepKey)) {
      stepMap.set(stepKey, []);
    }
    stepMap.get(stepKey)!.push(item);
  });

  /* 只返回有表单项的步骤 */
  return stepsConfig.value.steps
    .map((stepConfig) => ({
      config: stepConfig,
      items: stepMap.get(stepConfig.key) || [],
    }))
    .filter((step) => step.items.length > 0);
});

const stepStatus = computed(() => {
  for (let i = 0; i <= currentStep.value; i++) {
    if (stepValidationStatus[i] === false) {
      return "error";
    }
  }
  return "process";
});

const isFirstStep = computed((): boolean => {
  return currentStep.value === 0;
});

const isLastStep = computed((): boolean => {
  return currentStep.value === stepsWithItems.value.length - 1;
});

/* ================= 工具方法 ================= */
const getItemKey = (item: VNode, index: number): string => {
  if (item.key != null) {
    return String(item.key);
  }

  const itemProps = item.props as Record<string, any> | null;
  if (itemProps?.path) {
    return itemProps.path;
  }

  return `step-item-${index}`;
};

const validateCurrentStep = async (): Promise<boolean> => {
  try {
    const result = await Promise.resolve(
      emit("step-validate", currentStep.value) as unknown as
        | boolean
        | Promise<boolean>,
    );
    const valid = result !== false;
    stepValidationStatus[currentStep.value] = valid;
    return valid;
  } catch (error) {
    console.error("[Steps Layout] 步骤验证失败:", error);
    stepValidationStatus[currentStep.value] = false;
    return false;
  }
};

const switchToStep = async (
  targetStep: number,
  needValidation = false,
): Promise<boolean> => {
  if (targetStep < 0 || targetStep >= stepsWithItems.value.length) {
    return false;
  }

  if (targetStep === currentStep.value) {
    return true;
  }

  try {
    loading.value = true;

    /* 验证步骤（如果需要） */
    if (needValidation && stepsConfig.value.validateBeforeNext) {
      const isValid = await validateCurrentStep();
      if (!isValid) {
        return false;
      }
    }

    /* 触发步骤切换前事件 */
    await emit("step-before-change", currentStep.value, targetStep);

    currentStep.value = targetStep;
    emit(
      "step-change",
      currentStep.value,
      stepsWithItems.value[currentStep.value].config.key,
    );
    return true;
  } catch (error) {
    console.error("[Steps Layout] 步骤切换失败:", error);
    return false;
  } finally {
    loading.value = false;
  }
};

/* ================= 事件处理方法 ================= */
const handleNextStep = async (): Promise<void> => {
  await switchToStep(currentStep.value + 1, true);
};

const handlePreviousStep = (): void => {
  switchToStep(currentStep.value - 1);
};

const goToStep = async (stepIndex: number): Promise<void> => {
  if (stepsWithItems.value[stepIndex]?.config.disabled) {
    return;
  }

  const needValidation = stepIndex > currentStep.value;
  await switchToStep(stepIndex, needValidation);
};

const initializeCurrentStep = (): void => {
  if (!hasSteps.value || stepsWithItems.value.length === 0) {
    return;
  }

  const { defaultStep } = stepsConfig.value;
  const isValidDefaultStep =
    defaultStep >= 0 &&
    defaultStep < stepsWithItems.value.length &&
    !stepsWithItems.value[defaultStep]?.config.disabled;

  currentStep.value = isValidDefaultStep ? defaultStep : 0;
};

/* ================= 生命周期 ================= */

/* 只监听步骤结构变化（key / 数量），不监听表单项内容变化 */
const stepStructureKey = computed(() =>
  stepsConfig.value.steps.map((s) => s.key).join(","),
);

watch(stepStructureKey, () => {
  initializeCurrentStep();
});

onMounted(() => {
  initializeCurrentStep();
});

/* ================= 对外暴露 ================= */
defineExpose({
  nextStep: handleNextStep,
  previousStep: handlePreviousStep,
  goToStep,
  validateCurrentStep,
  currentStep: readonly(currentStep),
  totalSteps: computed(() => stepsWithItems.value.length),
});
</script>

<style scoped lang="scss">
@use "./index.scss";
</style>
