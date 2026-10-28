<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2025-06-10
 * @Description: 表单搜索组件（薄 UI 壳 — 逻辑由 composable 驱动）
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
-->
<template>
  <NCard
    class="form-search-card custom-card"
    :class="density && `form-search-card--${density}`"
    :style="densityStyle"
    :bordered="bordered"
  >
    <NForm
      class="form-search"
      :model="formParams"
      ref="formRef"
      :size="resolvedSize"
      @submit.prevent="searchFn"
    >
      <div
        class="form-search-item-box"
        v-for="(item, index) of availableFields"
        v-show="expanded || index < foldThreshold"
        :key="item.prop || index"
      >
        <NFormItem
          class="form-item-input"
          v-if="item.type !== 'spacer'"
          :path="item.prop"
          :rule="item.rules"
          :show-feedback="false"
          :show-label="false"
        >
          <NInput
            v-if="item.type === 'input'"
            clearable
            :size="resolvedSize"
            :value="inputValue(item.prop)"
            @update:value="value => setFieldValue(item.prop, value)"
            :placeholder="item.placeholder"
            v-bind="item.attrs"
            @focus="history.handleFocus(item.prop)"
            @blur="history.closeAllPanels"
          />

          <div
            class="input-history"
            v-if="item.isFocus"
            @mousedown.prevent
          >
            <div
              class="history-item"
              @click="history.selectHistoryItem(hisValue, item.prop)"
              v-for="(hisValue, hisIndex) of item.hisList"
              :key="hisValue"
            >
              <span class="history-text">{{ hisValue }}</span>
              <NIcon
                class="delete-icon"
                size="14"
                @click.stop="history.deleteHistoryItem(item.prop, hisIndex)"
              >
                <div class="i-mdi:close" />
              </NIcon>
            </div>
            <div
              class="history-footer"
              v-if="item.hisList && item.hisList.length > 0"
            >
              <span
                class="clear-all"
                @click.stop="history.clearAllHistory(item.prop)"
              >
                清空历史记录
              </span>
            </div>
          </div>

          <NSelect
            v-if="item.type === 'select'"
            :value="selectBindings.get(item.prop)?.value"
            @update:value="value => setSelectValue(item.prop, value)"
            :placeholder="item.placeholder || '请选择'"
            clearable
            :size="resolvedSize"
            :options="selectBindings.get(item.prop)?.options"
            v-bind="item.attrs"
          />

          <NDatePicker
            v-if="item.type === 'date-range'"
            type="datetimerange"
            :size="resolvedSize"
            v-bind="{ ...dateRangeBinding(item.prop), ...item.attrs }"
            format="yyyy-MM-dd HH:mm"
            value-format="yyyy-MM-dd HH:mm"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            clearable
          />
        </NFormItem>
      </div>

      <div class="form-search-item-box form-search-actions">
        <div class="form-item-input">
          <div class="button-label-placeholder"></div>
          <NSpace :size="density ? densityTokens.gap : 8">
            <NTooltip trigger="hover">
              <template #trigger>
                <NButton
                  type="primary"
                  :size="resolvedSize"
                  aria-label="搜索"
                  @click="searchFn"
                  :loading="loading || searching"
                >
                  <template #icon>
                    <div class="i-mdi:search w-4 h-4" />
                  </template>
                </NButton>
              </template>
              搜索
            </NTooltip>

            <NTooltip trigger="hover">
              <template #trigger>
                <NButton
                  :size="resolvedSize"
                  aria-label="重置"
                  @click="resetFn"
                >
                  <template #icon>
                    <div class="i-mdi:refresh w-4 h-4" />
                  </template>
                </NButton>
              </template>
              重置
            </NTooltip>

            <NTooltip
              v-if="hasExpandButton"
              trigger="hover"
            >
              <template #trigger>
                <NButton
                  :size="resolvedSize"
                  :aria-label="expanded ? '收起搜索条件' : '展开搜索条件'"
                  :aria-expanded="expanded"
                  @click="toggleFold"
                >
                  <template #icon>
                    <div
                      :class="
                        expanded
                          ? 'i-mdi:chevron-up w-4 h-4'
                          : 'i-mdi:chevron-down w-4 h-4'
                      "
                    />
                  </template>
                </NButton>
              </template>
              {{ expanded ? '收起' : '展开' }}
            </NTooltip>
          </NSpace>
        </div>
      </div>
    </NForm>
  </NCard>
</template>

<script setup lang="ts" generic="T extends object = SearchFormParams">
  import { computed, watch, type CSSProperties, type Ref } from 'vue'
  import { resolveComponentDensity } from '../../core/density'
  import { useFormGlobalConfig } from '../C_Form/composables/useFormConfig'
  import {
    NCard,
    NForm,
    NFormItem,
    NInput,
    NSelect,
    NDatePicker,
    NSpace,
    NButton,
    NTooltip,
    NIcon,
  } from 'naive-ui'
  import { useSearchState } from './composables/useSearchState'
  import { normalizeSearchFieldValue } from './fieldValue'
  import { resolveDateRangeInput } from './dateRange'
  import { createSearchSelectBinding } from './select'
  import type {
    FormSearchEmits,
    FormSearchExpose,
    FormSearchRuntimeProps,
    SearchFormParams,
  } from './types'

  defineOptions({ name: 'C_FormSearch' })

  const props = withDefaults(defineProps<FormSearchRuntimeProps<T>>(), {
    bordered: true,
    formItemList: () => [],
    formParams: () => ({}) as T,
    loading: false,
  })

  const emits = defineEmits<FormSearchEmits<T>>()
  const globalFormConfig = useFormGlobalConfig()
  // 搜索只继承密度，不继承业务表单的布局、尺寸、禁用或提交回调。
  const density = computed(
    () => props.config?.density ?? globalFormConfig.density
  )
  const densityTokens = computed(() => resolveComponentDensity(density.value))
  const resolvedSize = computed(() => props.size ?? densityTokens.value.size)
  const densityStyle = computed<CSSProperties | undefined>(() => {
    if (density.value === undefined) return undefined
    const { gap, rowGap, padding } = densityTokens.value
    return {
      '--c-search-gap': `${gap}px`,
      '--c-search-row-gap': `${rowGap}px`,
      '--c-search-padding': `${padding}px`,
      '--c-search-field-width':
        density.value === 'compact' ? '208px' : undefined,
    }
  })

  const {
    formRef,
    formParams,
    expanded,
    searching,
    availableFields,
    foldThreshold,
    hasExpandButton,
    history,
    searchFn,
    resetFn,
    toggleFold,
    syncFromProps,
  } = useSearchState(emits, {
    formItemList: props.formItemList,
    formParams: props.modelValue ?? props.formParams,
    config: () => props.config,
    loading: () => props.loading,
    historyOptions: () => ({
      storageKey: props.formSearchInputHistoryString,
      maxItems: props.config?.historyMaxItems,
    }),
  })

  const selectBindings = computed(
    () =>
      new Map<string, ReturnType<typeof createSearchSelectBinding>>(
        availableFields.value
          .filter(item => item.type === 'select')
          .map(item => [
            item.prop,
            createSearchSelectBinding(
              item.list,
              (formParams.value as Record<string, unknown>)[item.prop]
            ),
          ])
      )
  )

  const inputValue = (field: string): string | null => {
    const value = (formParams.value as Record<string, unknown>)[field]
    return typeof value === 'string' ? value : null
  }

  const setSelectValue = (
    field: string,
    value: string | number | Array<string | number> | null
  ): void => {
    setFieldValue(field, selectBindings.value.get(field)?.decode(value) ?? null)
  }

  const setFieldValue = (field: string, value: unknown): void => {
    const item = availableFields.value.find(item => item.prop === field)
    const values = formParams.value as Record<string, unknown>
    if (item)
      values[field] = normalizeSearchFieldValue(item, value, values[field])
  }

  const dateRangeBinding = (field: string) => {
    const range = resolveDateRangeInput(
      (formParams.value as Record<string, unknown>)[field]
    )
    return range.mode === 'formatted'
      ? {
          formattedValue: range.value,
          'onUpdate:formattedValue': (value: unknown) =>
            setFieldValue(field, value),
        }
      : {
          value: range.value,
          'onUpdate:value': (value: unknown) => setFieldValue(field, value),
        }
  }

  watch(
    () => [props.formItemList, props.modelValue, props.formParams] as const,
    ([newItems, modelValue, formParams]) =>
      syncFromProps(newItems, modelValue ?? formParams),
    { deep: true }
  )

  defineExpose({
    formRef,
    formParams,
    searchFn,
    cleanFn: resetFn,
    changeFoldState: toggleFold,
  } satisfies {
    [K in keyof FormSearchExpose<T>]:
      FormSearchExpose<T>[K] | Ref<FormSearchExpose<T>[K]>
  })
</script>

<style lang="scss" scoped>
  @use './index.scss';
</style>
