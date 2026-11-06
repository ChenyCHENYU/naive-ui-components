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
      :class="{ 'form-search--grid': gridLayout }"
      :model="formParams"
      ref="formRef"
      :size="resolvedSize"
      :label-placement="config?.labelPlacement || 'top'"
      :label-width="config?.labelWidth"
      @submit.prevent="searchFn"
    >
      <div
        ref="layoutRoot"
        class="form-search-layout"
        :style="layoutStyle"
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
              v-bind="selectTagPresentation(item)"
              :value="selectBinding(item).value"
              @update:value="
                (value, selected) => setSelectValue(item, value, selected)
              "
              :placeholder="item.placeholder || '请选择'"
              :clearable="item.attrs?.clearable !== false"
              :size="fieldSize(item)"
              :options="selectBinding(item).options"
              :fallback-option="selectFallback(item)"
              :loading="
                item.optionsState?.loading === true ||
                item.attrs?.loading === true
              "
              :disabled="fieldDisabled(item) || fieldReadonly(item)"
              :status="selectStatus(item)"
            >
              <template #empty>
                <div
                  v-if="item.optionsState?.error != null"
                  role="alert"
                  class="form-search-option-error"
                >
                  选项加载失败
                  <NButton
                    v-if="item.optionsState?.retry"
                    text
                    size="small"
                    @click="retryOptions(item)"
                    >重试</NButton
                  >
                </div>
              </template>
              <template #action>
                <div
                  v-if="
                    item.optionsState?.error != null &&
                    selectBinding(item).options?.length
                  "
                  role="alert"
                  class="form-search-option-error"
                >
                  选项加载失败，保留已有选项
                  <NButton
                    v-if="item.optionsState?.retry"
                    text
                    size="small"
                    @click="retryOptions(item)"
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
            <NTimePicker
              v-if="item.type === 'time'"
              :size="resolvedSize"
              v-bind="timeBinding(item)"
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
      </div>

      <div class="form-search-item-box form-search-actions">
        <NFormItem
          class="form-item-input"
          :show-feedback="false"
          :show-label="hasTopLabels"
          label=" "
        >
          <NSpace
            class="form-search-action-buttons"
            justify="end"
            :size="density ? densityTokens.gap : 8"
          >
            <NTooltip trigger="hover">
              <template #trigger>
                <NButton
                  class="form-search-icon-button"
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
                  class="form-search-icon-button"
                  :size="resolvedSize"
                  aria-label="重置"
                  :disabled="resetBlocked"
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
                  class="form-search-icon-button"
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
            <slot
              v-if="!actionsSlotIsField"
              name="actions"
            />
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
  </NCard>
</template>

<script setup lang="ts" generic="T extends object = SearchFormParams">
  import {
    computed,
    defineAsyncComponent,
    mergeProps,
    watch,
    readonly,
    type ComputedRef,
    type CSSProperties,
    type Ref,
    type VNodeChild,
  } from 'vue'
  import { resolveComponentDensity } from '../../core/density'
  import { shouldSummarizeSelectTags } from '../../core/selectPresentation'
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
  import {
    bindTemporalField,
    resolveSingleTemporalInput,
  } from '../../core/temporalField'
  import { createOptionValueBinder } from '../../core/options'
  import { useSearchLayout } from './composables/useSearchLayout'
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
  const NTimePicker = defineAsyncComponent(
    () => import('../../internal/naive-fields/time-picker')
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
    resetBlocked,
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
  // Existing custom fields can already claim their own slot by prop or name.
  const actionsSlotIsField = computed(() =>
    props.formItemList.some(
      item => item.type === 'custom' && (item.slot || item.prop) === 'actions'
    )
  )
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
  const fieldOptions = (
    item: SearchFormItem<T>
  ): SearchOptionItem[] | undefined => {
    if (Array.isArray(item.attrs?.options))
      return item.attrs.options as SearchOptionItem[]
    if (item.list !== undefined) return item.list
    return undefined
  }
  const selectTagPresentation = (item: SearchFormItem<T>) =>
    shouldSummarizeSelectTags(item.attrs?.multiple, item.attrs?.maxTagCount)
      ? mergeProps(item.attrs ?? {}, {
          class: 'c-select--bounded',
          maxTagCount: 1,
        })
      : item.attrs

  type SelectBinding = ReturnType<ReturnType<typeof createOptionValueBinder>>
  const selectBindings = new WeakMap<
    SearchFormItem<T>,
    ComputedRef<SelectBinding>
  >()
  const selectBinding = (item: SearchFormItem<T>): SelectBinding => {
    let binding = selectBindings.get(item)
    if (!binding) {
      // 分别订阅选项来源和当前值，选中项变化时复用同一份原生选项。
      const bindOptions = computed(() =>
        createOptionValueBinder(fieldOptions(item))
      )
      binding = computed(() =>
        bindOptions.value(
          (formParams.value as Record<string, unknown>)[item.prop]
        )
      )
      selectBindings.set(item, binding)
    }
    return binding.value
  }

  const selectFallback = (
    item: SearchFormItem<T>
  ): import('naive-ui').SelectProps['fallbackOption'] => {
    const supplied = item.attrs?.fallbackOption
    return typeof supplied === 'function' || typeof supplied === 'boolean'
      ? (supplied as import('naive-ui').SelectProps['fallbackOption'])
      : selectBinding(item).fallbackOption
  }

  const inputValue = (field: string): string | null => {
    const value = (formParams.value as Record<string, unknown>)[field]
    return typeof value === 'string' ? value : null
  }

  const setSelectValue = (
    item: SearchFormItem<T>,
    value: string | number | Array<string | number> | null,
    selected?: unknown
  ): void => {
    setFieldValue(item.prop, selectBinding(item).decode(value, selected))
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
    if (item.optionsState?.error != null) return 'error'
    const status = item.attrs?.status
    return status === 'error' || status === 'warning' ? status : undefined
  }
  const retryOptions = (item: SearchFormItem<T>): void => {
    void Promise.resolve()
      .then(() => item.optionsState?.retry?.())
      .catch(() => undefined)
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
    return {
      type: date.type,
      startPlaceholder: '开始时间',
      endPlaceholder: '结束时间',
      format: date.format,
      valueFormat: date.format,
      clearable: true,
      ...item.attrs,
      ...bindTemporalField(date, value => setFieldValue(field, value)),
      disabled: fieldDisabled(item),
      readonly: fieldReadonly(item),
    }
  }
  const timeBinding = (item: SearchFormItem<T>) => {
    const field = item.prop
    const input = resolveSingleTemporalInput(
      (formParams.value as Record<string, unknown>)[field],
      item.valueMode
    )
    return {
      placeholder: item.placeholder,
      format: 'HH:mm',
      valueFormat: 'HH:mm',
      clearable: true,
      ...item.attrs,
      ...bindTemporalField<string | null, number | null>(input, value =>
        setFieldValue(field, value)
      ),
      disabled: fieldDisabled(item) || fieldReadonly(item),
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
