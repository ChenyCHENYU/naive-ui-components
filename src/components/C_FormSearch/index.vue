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
    <div
      ref="layoutRoot"
      class="form-search-layout"
    >
      <NForm
        class="form-search"
        :class="{ 'form-search--grid': gridLayout }"
        :style="layoutStyle"
        :model="formParams"
        ref="formRef"
        :size="resolvedSize"
        :label-placement="config?.labelPlacement || 'top'"
        :label-width="config?.labelWidth"
        @submit.prevent="searchFn"
      >
        <div
          class="form-search-item-box"
          v-for="(item, index) of availableFields"
          v-show="expanded || index < foldThreshold"
          :key="item.prop || index"
          :style="fieldStyle(item)"
        >
          <NFormItem
            class="form-item-input"
            v-if="item.type !== 'spacer'"
            :path="item.prop"
            :rule="item.rules"
            :show-feedback="false"
            :label="item.label"
            :show-label="!!item.label"
          >
            <div
              v-if="item.type === 'input'"
              class="form-search-input-control"
            >
              <NInput
                v-bind="item.attrs"
                :clearable="item.attrs?.clearable !== false"
                :size="fieldSize(item)"
                :value="inputValue(item.prop)"
                @update:value="value => setFieldValue(item.prop, value)"
                :placeholder="item.placeholder"
                :disabled="fieldDisabled(item)"
                :readonly="fieldReadonly(item)"
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
            </div>

            <NSelect
              v-if="item.type === 'select'"
              v-bind="item.attrs"
              :value="selectBindings.get(item.prop)?.value"
              @update:value="value => setSelectValue(item.prop, value)"
              :placeholder="item.placeholder || '请选择'"
              :clearable="item.attrs?.clearable !== false"
              :size="fieldSize(item)"
              :options="selectBindings.get(item.prop)?.options"
              :loading="
                dictionary.isLoading(item.prop) || item.attrs?.loading === true
              "
              :disabled="fieldDisabled(item) || fieldReadonly(item)"
              :status="selectStatus(item)"
            >
              <template
                v-if="dictionary.getError(item.prop)"
                #empty
              >
                <div
                  role="alert"
                  class="form-search-option-error"
                >
                  选项加载失败
                  <NButton
                    text
                    size="small"
                    @click="dictionary.reload(item.prop)"
                    >重试</NButton
                  >
                </div>
              </template>
            </NSelect>

            <NInputNumber
              v-if="item.type === 'number'"
              v-bind="item.attrs"
              :value="numberValue(item.prop)"
              @update:value="value => setFieldValue(item.prop, value)"
              :size="fieldSize(item)"
              :placeholder="item.placeholder"
              :show-button="
                item.attrs?.showButton === undefined
                  ? density !== 'compact'
                  : item.attrs.showButton === true
              "
              :disabled="fieldDisabled(item)"
              :readonly="fieldReadonly(item)"
            />

            <div
              v-if="item.type === 'number-range'"
              class="form-search-number-range"
            >
              <NInputNumber
                v-for="endpoint in [0, 1] as const"
                :key="endpoint"
                v-bind="item.attrs"
                :value="numberRangeValue(item.prop, endpoint)"
                @update:value="
                  value => setNumberRangeValue(item.prop, endpoint, value)
                "
                :size="fieldSize(item)"
                :placeholder="item.placeholder"
                :show-button="false"
                :disabled="fieldDisabled(item)"
                :readonly="fieldReadonly(item)"
                :input-props="rangeInputProps(item, endpoint)"
              />
            </div>

            <NDatePicker
              v-if="
                item.type === 'date-range' ||
                item.type === 'date' ||
                item.type === 'month'
              "
              :size="resolvedSize"
              v-bind="dateBinding(item)"
            />

            <slot
              v-if="item.type === 'custom'"
              :name="item.slot || item.prop"
              v-bind="fieldContext(item)"
            >
              <SearchCustomField
                v-if="item.render"
                :render="customRender(item)"
                :context="fieldContext(item)"
              />
            </slot>
          </NFormItem>
        </div>

        <div class="form-search-item-box form-search-actions">
          <NFormItem
            class="form-item-input"
            :show-feedback="false"
            :show-label="hasTopLabels"
            label=" "
          >
            <NSpace :size="density ? densityTokens.gap : 8">
              <NTooltip trigger="hover">
                <template #trigger>
                  <NButton
                    type="primary"
                    :size="resolvedSize"
                    aria-label="搜索"
                    attr-type="submit"
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
            <span
              v-if="hiddenActiveCount"
              class="form-search-hidden-count"
              role="status"
            >
              {{ hiddenActiveCount }} 项隐藏条件生效
            </span>
          </NFormItem>
        </div>
      </NForm>
    </div>
  </NCard>
</template>

<script setup lang="ts" generic="T extends object = SearchFormParams">
  import {
    computed,
    defineAsyncComponent,
    watch,
    readonly,
    type CSSProperties,
    type Ref,
    type VNodeChild,
  } from 'vue'
  import { resolveComponentDensity } from '../../core/density'
  import { useFormGlobalConfig } from '../C_Form/composables/useFormConfig'
  import {
    NCard,
    NForm,
    NFormItem,
    NInput,
    NInputNumber,
    NSelect,
    NSpace,
    NButton,
    NTooltip,
    NIcon,
  } from 'naive-ui'
  import { useSearchState } from './composables/useSearchState'
  import { normalizeSearchFieldValue, isSearchFieldLocked } from './fieldValue'
  import { resolveSearchDateInput } from './dateRange'
  import { createSearchSelectBinding } from './select'
  import { useSearchLayout } from './composables/useSearchLayout'
  import { useDictionaryOptions } from '../../composables/useDictionary'
  import SearchCustomField, {
    type SearchControlContext,
  } from './SearchCustomField'
  import type {
    FormSearchEmits,
    FormSearchExpose,
    FormSearchRuntimeProps,
    SearchFormParams,
    SearchFormItem,
    SearchOptionItem,
  } from './types'

  const NDatePicker = defineAsyncComponent(
    () => import('../../internal/naive-fields/date-picker')
  )

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
    appliedParams,
    hasUnappliedChanges,
    hiddenActiveCount,
    expanded,
    searching,
    availableFields,
    foldThreshold,
    hasExpandButton,
    history,
    searchFn,
    resetFn,
    applyPreset,
    toggleFold,
    syncFields,
    syncModel,
  } = useSearchState(emits, {
    formItemList: props.formItemList,
    formParams: props.modelValue ?? props.formParams,
    config: () => props.config,
    loading: () => props.loading,
    onApplied: params => emits('applied', params),
    historyOptions: () => ({
      storageKey: props.formSearchInputHistoryString,
      maxItems: props.config?.historyMaxItems,
    }),
  })

  const gridLayout = computed(() => props.config?.layout === 'grid')
  const hasTopLabels = computed(
    () =>
      props.config?.labelPlacement !== 'left' &&
      availableFields.value.some(item => !!item.label)
  )
  const {
    root: layoutRoot,
    style: layoutStyle,
    fieldStyle,
  } = useSearchLayout(() => ({
    enabled: gridLayout.value,
    minWidth:
      props.config?.fieldMinWidth ?? (density.value === 'compact' ? 208 : 260),
    gap: density.value ? densityTokens.value.gap : 32,
    columns: props.config?.columns,
  }))
  const dictionary = useDictionaryOptions(
    () =>
      new Map(
        props.formItemList
          .filter(
            item =>
              item.type === 'select' &&
              item.show !== false &&
              item.list === undefined &&
              !Array.isArray(item.attrs?.options)
          )
          .map(item => [item.prop, item.dictionary])
      )
  )
  const fieldOptions = (
    item: SearchFormItem<T>
  ): SearchOptionItem[] | undefined => {
    if (Array.isArray(item.attrs?.options))
      return item.attrs.options as SearchOptionItem[]
    if (item.list !== undefined) return item.list
    return item.dictionary
      ? dictionary
          .getOptions(item.prop)
          .map((option): SearchOptionItem => ({ ...option }))
      : undefined
  }

  const selectBindings = computed(
    () =>
      new Map<string, ReturnType<typeof createSearchSelectBinding>>(
        availableFields.value
          .filter(item => item.type === 'select')
          .map(item => [
            item.prop,
            createSearchSelectBinding(
              fieldOptions(item),
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
    if (item && !isSearchFieldLocked(item))
      values[field] = normalizeSearchFieldValue(item, value, values[field])
  }

  const numberValue = (field: string): number | null => {
    const value = (formParams.value as Record<string, unknown>)[field]
    return typeof value === 'number' && Number.isFinite(value) ? value : null
  }
  const numberRangeValue = (field: string, endpoint: 0 | 1): number | null => {
    const range = (formParams.value as Record<string, unknown>)[field]
    const value = Array.isArray(range) ? range[endpoint] : null
    return typeof value === 'number' && Number.isFinite(value) ? value : null
  }
  const setNumberRangeValue = (
    field: string,
    endpoint: 0 | 1,
    value: number | null
  ) => {
    const range: [number | null, number | null] = [
      numberRangeValue(field, 0),
      numberRangeValue(field, 1),
    ]
    range[endpoint] = value
    setFieldValue(field, range.every(part => part === null) ? null : range)
  }
  const fieldDisabled = (item: SearchFormItem<T>): boolean =>
    !!(item.fixed || item.disabled || item.attrs?.disabled === true)
  const fieldReadonly = (item: SearchFormItem<T>): boolean =>
    !!(item.readonly || item.attrs?.readonly === true)
  const selectStatus = (
    item: SearchFormItem<T>
  ): 'error' | 'warning' | undefined => {
    if (dictionary.getError(item.prop)) return 'error'
    const status = item.attrs?.status
    return status === 'error' || status === 'warning' ? status : undefined
  }
  const rangeInputProps = (item: SearchFormItem<T>, endpoint: 0 | 1) => {
    const native = item.attrs?.inputProps
    const supplied = native && typeof native === 'object' ? native : {}
    return {
      'aria-label': `${item.label || item.prop}${endpoint === 0 ? '起始值' : '结束值'}`,
      ...supplied,
    }
  }
  const fieldSize = (item: SearchFormItem<T>): 'small' | 'medium' | 'large' => {
    const size = item.attrs?.size
    return size === 'small' || size === 'medium' || size === 'large'
      ? size
      : resolvedSize.value
  }
  const fieldContext = (item: SearchFormItem<T>): SearchControlContext => ({
    value: (readonly(formParams.value) as Record<string, unknown>)[item.prop],
    model: readonly(formParams.value),
    prop: item.prop,
    disabled: fieldDisabled(item),
    readonly: fieldReadonly(item),
    size: fieldSize(item),
    updateValue: value => setFieldValue(item.prop, value),
  })
  // 泛型业务模型在声明层保留；运行时出口只依赖统一受控字段协议。
  const customRender = (item: SearchFormItem<T>) =>
    item.render as unknown as (context: SearchControlContext) => VNodeChild
  const dateBinding = (item: SearchFormItem<T>) => {
    const field = item.prop
    const date = resolveSearchDateInput(
      item,
      (formParams.value as Record<string, unknown>)[field]
    )
    const controlled =
      date.mode === 'formatted'
        ? {
            formattedValue: date.value,
            'onUpdate:formattedValue': (value: unknown) =>
              setFieldValue(field, value),
          }
        : {
            value: date.value,
            'onUpdate:value': (value: unknown) => setFieldValue(field, value),
          }
    return {
      type: date.type,
      format: date.format,
      valueFormat: date.format,
      startPlaceholder: '开始时间',
      endPlaceholder: '结束时间',
      clearable: true,
      ...item.attrs,
      ...controlled,
      disabled: fieldDisabled(item),
      readonly: fieldReadonly(item),
    }
  }

  watch(() => props.formItemList, syncFields, { deep: true })
  watch(() => props.modelValue ?? props.formParams, syncModel, { deep: true })

  defineExpose({
    formRef,
    formParams,
    appliedParams,
    hasUnappliedChanges,
    hiddenActiveCount,
    searchFn,
    cleanFn: resetFn,
    applyPreset,
    changeFoldState: toggleFold,
  } satisfies {
    [K in keyof FormSearchExpose<T>]:
      FormSearchExpose<T>[K] | Ref<FormSearchExpose<T>[K]>
  })
</script>

<style lang="scss" scoped>
  @use './index.scss';
</style>
