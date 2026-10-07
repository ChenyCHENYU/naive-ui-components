<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-07
 * @Description: 分区公式键盘，数字、运算与配置函数共享原生光标插入流程
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
-->
<template>
  <div
    class="virtual-keyboard"
    role="group"
    aria-label="公式键盘"
  >
    <div
      v-if="functions.length"
      class="virtual-keyboard__functions"
    >
      <span class="virtual-keyboard__label">函数快捷输入</span>
      <div class="virtual-keyboard__function-grid">
        <button
          v-for="fn in functions"
          :key="fn.name"
          type="button"
          class="virtual-keyboard__function"
          :disabled="disabled"
          :title="`${fn.signature} · ${fn.description}`"
          :aria-label="`插入函数 ${fn.name}`"
          @click="$emit('insert-function', fn)"
          >{{ fn.name }}<span>( )</span></button
        >
      </div>
    </div>
    <div class="virtual-keyboard__body">
      <div class="virtual-keyboard__operators">
        <section
          v-for="group in operatorGroups"
          :key="group.label"
          class="virtual-keyboard__group"
        >
          <h3 class="virtual-keyboard__label">{{ group.label }}</h3>
          <div
            class="virtual-keyboard__keys"
            :class="`virtual-keyboard__keys--${group.name}`"
          >
            <button
              v-for="key in group.keys"
              :key="key.value"
              type="button"
              class="virtual-keyboard__key"
              :class="key.color && `virtual-keyboard__key--${key.color}`"
              :disabled="disabled"
              :aria-label="`插入 ${key.label}`"
              @click="$emit('key-press', key)"
              >{{ key.label }}</button
            >
          </div>
        </section>
      </div>
      <section class="virtual-keyboard__numbers">
        <h3 class="virtual-keyboard__label">数字输入</h3>
        <div class="virtual-keyboard__keys virtual-keyboard__keys--numbers">
          <button
            v-for="key in numberKeys"
            :key="key.value"
            type="button"
            class="virtual-keyboard__key"
            :class="{ 'virtual-keyboard__key--zero': key.value === '0' }"
            :disabled="disabled"
            :aria-label="`输入 ${key.label}`"
            @click="$emit('key-press', key)"
            >{{ key.label }}</button
          >
        </div>
      </section>
    </div>
    <footer class="virtual-keyboard__footer">
      <span>按键会插入到光标处，选中文字可直接替换。</span>
      <div class="virtual-keyboard__actions">
        <button
          v-for="key in actionKeys"
          :key="key.value"
          type="button"
          class="virtual-keyboard__action"
          :class="{ 'virtual-keyboard__action--clear': key.value === 'CLEAR' }"
          :disabled="disabled"
          :aria-label="key.label"
          @click="$emit('action', key.value)"
        >
          <C_Icon
            type="svg"
            :svg-path="key.icon"
            :size="16"
          />{{ key.label }}
        </button>
      </div>
    </footer>
  </div>
</template>
<script setup lang="ts">
  import type { FormulaFunction, FormulaKeyboardKey } from '../types'
  import { OPERATOR_KEYS, NUMBER_KEYS, ACTION_KEYS } from '../constants'
  import C_Icon from '../../C_Icon/index.vue'

  defineOptions({ name: 'VirtualKeyboard' })
  withDefaults(
    defineProps<{ disabled?: boolean; functions?: FormulaFunction[] }>(),
    {
      disabled: false,
      functions: () => [],
    }
  )
  defineEmits<{
    'key-press': [key: FormulaKeyboardKey]
    'insert-function': [fn: FormulaFunction]
    action: [action: string]
  }>()
  const numberKeys = NUMBER_KEYS.filter(key => key.type === 'number')
  const actionKeys = ACTION_KEYS.map(key => ({
    ...key,
    label: key.value === 'BACKSPACE' ? '退格' : key.label,
    icon:
      key.value === 'BACKSPACE'
        ? 'M9 4h12v16H9L2 12zM9.9 6 4.6 12l5.3 6H19V6zM11 8l6 6-1.4 1.4-6-6zM15.6 8 17 9.4l-6 6-1.4-1.4z'
        : 'M5 5h14v2H5zM9 2h6v2H9zM7 8h2v11h6V8h2v13H7zM10 8h1v9h-1zM13 8h1v9h-1z',
  }))
  const operatorGroups = [
    {
      name: 'arithmetic',
      label: '四则与取余',
      keys: [...NUMBER_KEYS, ...OPERATOR_KEYS].filter(
        key => key.type === 'operator'
      ),
    },
    {
      name: 'compare',
      label: '比较判断',
      keys: OPERATOR_KEYS.filter(key => key.type === 'compare'),
    },
    {
      name: 'logic',
      label: '括号与条件',
      keys: OPERATOR_KEYS.filter(
        key => key.type === 'paren' || key.type === 'logic'
      ),
    },
  ]
</script>
<style lang="scss" scoped>
  @use './VirtualKeyboard.scss';
</style>
