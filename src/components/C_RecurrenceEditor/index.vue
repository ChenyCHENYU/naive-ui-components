<template>
  <fieldset
    class="c-recurrence"
    :class="{ 'is-compact': density === 'compact' }"
    :style="theme"
    :disabled="disabled"
  >
    <legend>{{ t('recurrence.title') }}</legend>
    <div class="c-recurrence__row">
      <label>
        <span>{{ t('recurrence.frequency') }}</span>
        <select v-model="frequency">
          <option value="none">{{ t('recurrence.none') }}</option>
          <option
            v-for="item in FREQUENCIES"
            :key="item"
            :value="item"
            >{{ t(`recurrence.${item}`) }}</option
          >
        </select>
      </label>
      <label v-if="modelValue">
        <span>{{ t('recurrence.interval') }}</span>
        <input
          v-model.lazy.number="interval"
          type="number"
          min="1"
          step="1"
        />
      </label>
    </div>

    <fieldset
      v-if="frequency === 'weekly'"
      class="c-recurrence__weekdays"
    >
      <legend>{{ t('recurrence.weekdays') }}</legend>
      <label
        v-for="day in WEEKDAYS"
        :key="day"
        class="c-recurrence__day"
      >
        <input
          type="checkbox"
          :checked="modelValue?.weekdays?.includes(day)"
          @change="toggleWeekday(day)"
        />
        {{ t(`recurrence.day.${day}`) }}
      </label>
    </fieldset>

    <div
      v-if="frequency === 'monthly'"
      class="c-recurrence__row"
    >
      <label>
        <span>{{ t('recurrence.monthPattern') }}</span>
        <select v-model="monthMode">
          <option value="start">{{ t('recurrence.startDate') }}</option>
          <option value="date">{{ t('recurrence.monthDay') }}</option>
          <option value="weekday">{{ t('recurrence.ordinalWeekday') }}</option>
        </select>
      </label>
      <label v-if="monthMode === 'date'">
        <span>{{ t('recurrence.monthDay') }}</span>
        <input
          v-model.lazy.number="monthDate"
          type="number"
          min="1"
          max="31"
          step="1"
        />
      </label>
      <template v-if="monthMode === 'weekday'">
        <label>
          <span>{{ t('recurrence.ordinal') }}</span>
          <select v-model="ordinal">
            <option
              v-for="item in ORDINALS"
              :key="item"
              :value="item"
              >{{ item === -1 ? t('recurrence.last') : item }}</option
            >
          </select>
        </label>
        <label>
          <span>{{ t('recurrence.weekday') }}</span>
          <select v-model="monthWeekday">
            <option
              v-for="day in WEEKDAYS"
              :key="day"
              :value="day"
              >{{ t(`recurrence.day.${day}`) }}</option
            >
          </select>
        </label>
      </template>
    </div>

    <div
      v-if="modelValue"
      class="c-recurrence__row"
    >
      <label>
        <span>{{ t('recurrence.end') }}</span>
        <select v-model="endMode">
          <option value="none">{{ t('recurrence.unlimited') }}</option>
          <option value="count">{{ t('recurrence.count') }}</option>
          <option value="until">{{ t('recurrence.until') }}</option>
        </select>
      </label>
      <label v-if="endMode === 'count'">
        <span>{{ t('recurrence.count') }}</span>
        <input
          v-model.lazy.number="count"
          type="number"
          min="1"
          step="1"
        />
      </label>
      <label v-if="endMode === 'until'">
        <span>{{ t('recurrence.until') }}</span>
        <input
          v-model="until"
          type="date"
          :aria-invalid="!isDateOnly(until)"
          required
        />
      </label>
    </div>
    <p
      v-if="endMode === 'until' && !isDateOnly(until)"
      role="status"
      >{{ t('recurrence.invalidDate') }}</p
    >
  </fieldset>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { useComponentDensity } from '../../composables/useComponentDensity'
  import { useComponentTheme } from '../../composables/useComponentTheme'
  import { useScopedComponentLocale } from '../_shared/useScopedComponentLocale'
  import { FREQUENCIES, isDateOnly, ORDINALS, WEEKDAYS } from './rule'
  import { CHINESE, ENGLISH } from './locale'
  import type {
    RecurrenceEditorProps,
    RecurrenceFrequency,
    RecurrenceRule,
    RecurrenceWeekday,
  } from './types'

  defineOptions({ name: 'C_RecurrenceEditor' })
  const props = defineProps<RecurrenceEditorProps>()
  const emit = defineEmits<{
    'update:modelValue': [value: RecurrenceRule | null]
  }>()
  const { t } = useScopedComponentLocale(CHINESE, ENGLISH, () => props.locale)
  const theme = useComponentTheme()
  const density = useComponentDensity(() => props.density)

  function edit(patch: Partial<RecurrenceRule>) {
    if (props.modelValue && !props.disabled)
      emit('update:modelValue', { ...props.modelValue, ...patch })
  }

  const positiveInteger = (value: number, limit = Number.MAX_SAFE_INTEGER) =>
    Number.isSafeInteger(value) ? Math.min(limit, Math.max(1, value)) : 1

  const frequency = computed<RecurrenceFrequency | 'none'>({
    get: () => props.modelValue?.frequency ?? 'none',
    set: value => {
      if (props.disabled) return
      const { interval, end } = props.modelValue ?? {}
      emit(
        'update:modelValue',
        value === 'none' ? null : { frequency: value, interval, end }
      )
    },
  })
  const interval = computed({
    get: () => props.modelValue?.interval ?? 1,
    set: value => edit({ interval: positiveInteger(value) }),
  })
  const month = computed(() => props.modelValue?.monthPattern)
  const monthMode = computed<'start' | 'date' | 'weekday'>({
    get: () => month.value?.type ?? 'start',
    set: type =>
      edit({
        monthPattern:
          type === 'start'
            ? undefined
            : type === 'date'
              ? { type, day: 1 }
              : { type, ordinal: 1, day: 'MO' },
      }),
  })
  const monthDate = computed({
    get: () => (month.value?.type === 'date' ? month.value.day : 1),
    set: value =>
      edit({ monthPattern: { type: 'date', day: positiveInteger(value, 31) } }),
  })
  const ordinal = computed({
    get: () => (month.value?.type === 'weekday' ? month.value.ordinal : 1),
    set: value =>
      edit({
        monthPattern: {
          type: 'weekday',
          ordinal: value,
          day: monthWeekday.value,
        },
      }),
  })
  const monthWeekday = computed<RecurrenceWeekday>({
    get: () => (month.value?.type === 'weekday' ? month.value.day : 'MO'),
    set: day =>
      edit({ monthPattern: { type: 'weekday', ordinal: ordinal.value, day } }),
  })
  const end = computed(() => props.modelValue?.end)
  const endMode = computed<'none' | 'count' | 'until'>({
    get: () => end.value?.type ?? 'none',
    set: type =>
      edit({
        end:
          type === 'none'
            ? undefined
            : type === 'count'
              ? { type, count: 10 }
              : { type, date: '' },
      }),
  })
  const count = computed({
    get: () => (end.value?.type === 'count' ? end.value.count : 10),
    set: value =>
      edit({ end: { type: 'count', count: positiveInteger(value) } }),
  })
  const until = computed({
    get: () => (end.value?.type === 'until' ? end.value.date : ''),
    set: date => edit({ end: { type: 'until', date } }),
  })

  function toggleWeekday(day: RecurrenceWeekday) {
    const selected = new Set(props.modelValue?.weekdays)
    if (selected.has(day)) selected.delete(day)
    else selected.add(day)
    edit({ weekdays: WEEKDAYS.filter(item => selected.has(item)) })
  }
</script>

<style scoped lang="scss">
  @use './index.scss';
</style>
