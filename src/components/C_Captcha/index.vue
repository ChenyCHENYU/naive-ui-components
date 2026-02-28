<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2025-07-23
 * @Description: 基于 vue3-puzzle-vcode 封装的验证器组件
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
-->
<template>
  <div class="c-captcha-modern">
    <div
      class="captcha-trigger"
      @click="showCaptcha"
      :class="{
        verified: isVerified,
        error: hasError,
        disabled: disabled,
      }"
    >
      <div class="captcha-content">
        <div class="captcha-icon">
          <span v-if="!isVerified && !hasError">🧩</span>
          <span v-if="isVerified" class="success-icon">✓</span>
          <span v-if="hasError" class="error-icon">⚠️</span>
        </div>
        <div class="captcha-text">
          <span v-if="!isVerified && !hasError">{{ triggerText }}</span>
          <span v-if="isVerified" class="success-text">验证成功</span>
          <span v-if="hasError" class="error-text">验证失败，请重试</span>
        </div>
      </div>
      <div
        v-if="isVerified || hasError"
        class="refresh-button"
        @click.stop="resetCaptcha"
        title="重新验证"
      >
        ⟲
      </div>
    </div>
    <PuzzleVcode
      :show="showModal"
      :imgs="captchaImages"
      @success="handleSuccess"
      @close="handleClose"
      @fail="handleFail"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from "vue";
import PuzzleVcode from "vue3-puzzle-vcode";

defineOptions({ name: "C_Captcha" });

interface CaptchaProps {
  triggerText?: string;
  images?: string[];
  disabled?: boolean;
  theme?: "light" | "dark";
}

interface CaptchaEmits {
  (e: "success", data: { token: string; timestamp: number }): void;
  (e: "fail", error: string): void;
  (e: "change", valid: boolean): void;
  (e: "reset"): void;
}

const props = withDefaults(defineProps<CaptchaProps>(), {
  triggerText: "点击进行人机验证",
  images: () => [],
  disabled: false,
  theme: "dark",
});

const emit = defineEmits<CaptchaEmits>();

const showModal = ref(false);
const isVerified = ref(false);
const hasError = ref(false);
const verificationToken = ref("");
let errorTimer: ReturnType<typeof setTimeout> | null = null;

const captchaImages = computed(() =>
  props.images.length > 0 ? props.images : undefined,
);

const showCaptcha = () => {
  if (props.disabled || isVerified.value) return;
  hasError.value = false;
  showModal.value = true;
};

const handleSuccess = () => {
  isVerified.value = true;
  hasError.value = false;
  showModal.value = false;
  const timestamp = Date.now();
  const token = `puzzle_${timestamp}_${Math.random().toString(36).substring(2, 9)}`;
  verificationToken.value = token;
  emit("success", { token, timestamp });
  emit("change", true);
};

const handleFail = () => {
  isVerified.value = false;
  hasError.value = true;
  showModal.value = false;
  if (errorTimer) clearTimeout(errorTimer);
  errorTimer = setTimeout(() => {
    hasError.value = false;
    errorTimer = null;
  }, 3000);
  emit("fail", "拼图验证失败");
  emit("change", false);
};

const handleClose = () => {
  showModal.value = false;
};

const resetCaptcha = () => {
  isVerified.value = false;
  hasError.value = false;
  showModal.value = false;
  verificationToken.value = "";
  if (errorTimer) {
    clearTimeout(errorTimer);
    errorTimer = null;
  }
  emit("reset");
  emit("change", false);
};

defineExpose({
  validate: () => isVerified.value,
  getToken: () => verificationToken.value,
  getVerificationData: () => {
    if (!isVerified.value) return null;
    return {
      token: verificationToken.value,
      timestamp: Date.now(),
      type: "puzzle-captcha",
    };
  },
  reset: resetCaptcha,
  show: showCaptcha,
});

onBeforeUnmount(() => {
  if (errorTimer) clearTimeout(errorTimer);
});
</script>

<style scoped lang="scss">
@use "./index.scss";
</style>
