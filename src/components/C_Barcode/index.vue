<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2025-12-02
 * @Description: 条形码组件
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
-->
<template>
  <div class="c-barcode">
    <div
      class="barcode-wrapper"
      :class="{ 'with-border': showBorder }"
    >
      <VueBarcode
        v-bind="barcodeProps"
        v-show="isValid"
      />
    </div>
    <div
      v-if="showLabel && label"
      class="barcode-label"
    >
      {{ label }}
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue'
  import VueBarcode from '@chenfengyuan/vue-barcode'

  defineOptions({ name: 'C_Barcode' })

  interface Props {
    value: string
    format?:
      | 'CODE128'
      | 'CODE39'
      | 'EAN13'
      | 'EAN8'
      | 'UPC'
      | 'ITF14'
      | 'MSI'
      | 'pharmacode'
    width?: number
    height?: number
    showText?: boolean
    fontSize?: number
    textPosition?: 'bottom' | 'top'
    lineColor?: string
    background?: string
    showBorder?: boolean
    label?: string
    showLabel?: boolean
  }

  const props = withDefaults(defineProps<Props>(), {
    format: 'CODE128',
    width: 2,
    height: 80,
    showText: true,
    fontSize: 20,
    textPosition: 'bottom',
    lineColor: '#000000',
    background: '#FFFFFF',
    showBorder: true,
    label: '',
    showLabel: false,
  })

  const emit = defineEmits<{
    error: [error: Error]
  }>()

  const isValid = ref(true)
  let previousInvalidValue: string | undefined
  const barcodeProps = computed(() => ({
    value: props.value,
    options: {
      format: props.format,
      width: props.width,
      height: props.height,
      displayValue: props.showText,
      fontSize: props.fontSize,
      textPosition: props.textPosition,
      lineColor: props.lineColor,
      background: props.background,
      valid: handleValidity,
    },
  }))

  /** 使用 JsBarcode 的校验回调，避免无效值抛出渲染异常或继续展示旧条码。 */
  function handleValidity(valid: boolean) {
    isValid.value = valid
    if (valid) {
      previousInvalidValue = undefined
      return
    }
    const invalidValue = `${props.format}\0${props.value}`
    if (previousInvalidValue === invalidValue) return
    previousInvalidValue = invalidValue
    emit('error', new Error(`条形码内容不符合 ${props.format} 格式`))
  }
</script>

<style lang="scss" scoped>
  @use './index.scss';
</style>
