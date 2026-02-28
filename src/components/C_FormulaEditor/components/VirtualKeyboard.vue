<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-25
 * @Description: 虚拟键盘（运算符 + 数字 + 动作键）
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
-->

<template>
  <div class="vk">
    <!-- ═══════ 标题行 ═══════ -->
    <div class="vk__title">计算公式</div>

    <!-- ═══════ 键盘主体：运算符 | 数字 ═══════ -->
    <div class="vk__body">
      <!-- 运算符区 5 列 -->
      <div class="vk__half vk__half--ops">
        <button
          v-for="key in operatorKeys"
          :key="key.value"
          class="vk__key"
          :class="[key.color ? `vk__key--${key.color}` : '']"
          :disabled="disabled"
          @click="$emit('key-press', key)"
        >
          {{ key.label }}
        </button>
      </div>

      <!-- 数字区 5 列 -->
      <div class="vk__half vk__half--nums">
        <button
          v-for="key in numberKeys"
          :key="key.label + key.value"
          class="vk__key"
          :class="[key.color ? `vk__key--${key.color}` : '']"
          :disabled="disabled"
          @click="$emit('key-press', key)"
        >
          {{ key.label }}
        </button>
      </div>
    </div>

    <!-- ═══════ 动作行：⌫ + 清空 ═══════ -->
    <div class="vk__actions">
      <button
        v-for="key in actionKeys"
        :key="key.value"
        class="vk__key vk__key--action"
        :disabled="disabled"
        @click="$emit('action', key.value)"
      >
        {{ key.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FormulaKeyboardKey } from "../types";
import { OPERATOR_KEYS, NUMBER_KEYS, ACTION_KEYS } from "../constants";

interface Props {
  disabled?: boolean;
}

interface Emits {
  (e: "key-press", key: FormulaKeyboardKey): void;
  (e: "action", action: string): void;
}

withDefaults(defineProps<Props>(), {
  disabled: false,
});

defineEmits<Emits>();

const operatorKeys = OPERATOR_KEYS;
const numberKeys = NUMBER_KEYS;
const actionKeys = ACTION_KEYS;
</script>

<style lang="scss" scoped>
@use "./VirtualKeyboard.scss";
</style>
