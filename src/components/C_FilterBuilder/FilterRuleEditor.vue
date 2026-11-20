<template>
  <div class="c-filter-builder__rule">
    <div class="c-filter-builder__controls">
      <NSelect
        class="c-filter-builder__field"
        :value="rule.field"
        :options="settings.fieldOptions"
        :size="settings.size"
        :disabled="settings.disabled"
        :placeholder="t('field')"
        :aria-label="t('field')"
        @update:value="setField"
      />
      <NSelect
        class="c-filter-builder__operator"
        :value="rule.operator"
        :options="operatorOptions"
        :size="settings.size"
        :disabled="settings.disabled || !field"
        :placeholder="t('operator')"
        :aria-label="t('operator')"
        @update:value="setOperator"
      />
      <div
        v-if="field && operatorValid && hasFilterValue(rule.operator)"
        class="c-filter-builder__value"
      >
        <NInput
          v-if="field.type === 'text'"
          :value="textValue"
          :size="settings.size"
          :disabled="settings.disabled"
          :input-props="{ 'aria-label': t('value') }"
          :placeholder="t('value')"
          @update:value="value => setValue(value || null)"
        />
        <NInputNumber
          v-else-if="field.type === 'number'"
          :value="numberValue"
          :size="settings.size"
          :disabled="settings.disabled"
          :input-props="{ 'aria-label': t('value') }"
          :placeholder="t('value')"
          :show-button="false"
          @update:value="setValue"
        />
        <NDatePicker
          v-else-if="field.type === 'date'"
          :formatted-value="dateValue"
          value-format="yyyy-MM-dd"
          :size="settings.size"
          :disabled="settings.disabled"
          :placeholder="t('value')"
          :aria-label="t('value')"
          clearable
          @update:formatted-value="
            value => setValue(typeof value === 'string' ? value : null)
          "
        />
        <NSelect
          v-else
          :value="choiceValue"
          :options="valueOptions"
          :size="settings.size"
          :disabled="settings.disabled"
          :placeholder="t('value')"
          :aria-label="t('value')"
          clearable
          @update:value="setChoice"
        />
      </div>
      <NButton
        attr-type="button"
        quaternary
        :size="settings.size"
        :disabled="settings.disabled"
        :aria-label="t('removeRule')"
        @click="emit('remove')"
      >
        {{ t('remove') }}
      </NButton>
    </div>
    <small
      v-if="issue"
      class="c-filter-builder__issue"
      >{{ issue }}</small
    >
  </div>
</template>

<script setup lang="ts" generic="K extends string">
  import { computed } from 'vue'
  import {
    NButton,
    NDatePicker,
    NInput,
    NInputNumber,
    NSelect,
    type SelectOption,
  } from 'naive-ui'
  import type { FilterEditorSettings } from './editor'
  import { getFilterOperators, hasFilterValue, isFilterDate } from './model'
  import type { FilterOperator, FilterRule, FilterValue } from './types'

  const props = defineProps<{
    rule: FilterRule<K>
    settings: FilterEditorSettings<K>
    issue?: string
  }>()
  const emit = defineEmits<{
    update: [rule: FilterRule<K>]
    remove: []
  }>()
  const t = (key: string) => props.settings.t(key)
  const field = computed(() => props.settings.fields.get(props.rule.field))
  const operators = computed(() =>
    field.value ? getFilterOperators(field.value) : []
  )
  const operatorOptions = computed(() =>
    operators.value.map(value => ({ value, label: t(`operators.${value}`) }))
  )
  const operatorValid = computed(() =>
    operators.value.includes(props.rule.operator)
  )
  const textValue = computed(() =>
    typeof props.rule.value === 'string' ? props.rule.value : null
  )
  const dateValue = computed(() =>
    isFilterDate(props.rule.value) ? props.rule.value : null
  )
  const numberValue = computed(() =>
    typeof props.rule.value === 'number' && Number.isFinite(props.rule.value)
      ? props.rule.value
      : null
  )
  const choiceValue = computed(() =>
    typeof props.rule.value === 'boolean'
      ? String(props.rule.value)
      : (textValue.value ?? numberValue.value)
  )
  const valueOptions = computed<SelectOption[]>(() =>
    field.value?.type === 'select'
      ? field.value.options.map(({ value, label, disabled }) => ({
          value,
          label,
          disabled,
        }))
      : [
          { value: 'true', label: t('true') },
          { value: 'false', label: t('false') },
        ]
  )

  const setField = (key: K) => {
    const nextField = props.settings.fields.get(key)
    const operator = nextField && getFilterOperators(nextField)[0]
    if (!props.settings.disabled && operator && key !== props.rule.field) {
      emit('update', { ...props.rule, field: key, operator, value: null })
    }
  }
  const setOperator = (operator: FilterOperator) => {
    if (props.settings.disabled || !operators.value.includes(operator)) return
    emit('update', {
      ...props.rule,
      operator,
      value: hasFilterValue(operator) ? props.rule.value : null,
    })
  }
  const setValue = (value: FilterValue) => {
    if (
      !props.settings.disabled &&
      operatorValid.value &&
      hasFilterValue(props.rule.operator)
    ) {
      emit('update', { ...props.rule, value })
    }
  }
  const setChoice = (value: string | number | null) => {
    if (
      value !== null &&
      !valueOptions.value.some(
        option => option.value === value && !option.disabled
      )
    )
      return
    setValue(
      field.value?.type === 'boolean' && value !== null
        ? value === 'true'
        : value
    )
  }
</script>
