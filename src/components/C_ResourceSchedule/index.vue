<template>
  <section
    class="c-resource-schedule"
    :aria-label="title ?? t('title')"
    :style="themeStyle"
  >
    <header class="c-resource-schedule__header">
      <h3>{{ title ?? t('title') }}</h3>
      <div
        v-if="navigation && ticks.length"
        class="c-resource-schedule__navigation"
      >
        <NButton
          :size="size"
          :disabled="!canMove(-1)"
          @click="move(-1)"
          >{{ t('previous') }}</NButton
        >
        <NButton
          :size="size"
          :disabled="!canMove(1)"
          @click="move(1)"
          >{{ t('next') }}</NButton
        >
      </div>
    </header>
    <p
      v-if="!ticks.length"
      role="status"
      >{{ t('invalidRange') }}</p
    >
    <p
      v-else-if="!lanes.length"
      role="status"
      >{{ t('noResources') }}</p
    >
    <template v-else>
      <div
        class="c-resource-schedule__viewport"
        role="region"
        tabindex="0"
        :aria-label="t('viewport', { range: formatRange(range[0], range[1]) })"
      >
        <div class="c-resource-schedule__row c-resource-schedule__axis">
          <span class="c-resource-schedule__label"
            >{{ t('resources') }} · {{ timeZoneLabel }}</span
          >
          <div
            class="c-resource-schedule__time"
            dir="ltr"
            aria-hidden="true"
          >
            <span
              v-for="tick in ticks"
              :key="tick.offset"
              :style="{ left: percentage(tick.offset) }"
            >
              {{ formatTime(tick.time) }}
            </span>
          </div>
        </div>
        <div
          v-for="lane in lanes"
          :key="lane.resource.key"
          class="c-resource-schedule__row"
          role="group"
          :aria-label="lane.resource.label"
        >
          <span class="c-resource-schedule__label">{{
            lane.resource.label
          }}</span>
          <div
            class="c-resource-schedule__track"
            dir="ltr"
            :style="{
              blockSize: `calc(var(--c-schedule-track-height) * ${lane.trackCount})`,
            }"
          >
            <span
              v-for="(window, index) in lane.workingWindows"
              :key="index"
              class="c-resource-schedule__working-window"
              :style="position(window)"
              aria-hidden="true"
            />
            <button
              v-for="item in lane.bookings"
              :key="item.booking.key"
              class="c-resource-schedule__booking"
              :class="{ 'is-conflict': item.conflict }"
              type="button"
              :style="{
                ...position(item),
                top: `calc(var(--c-schedule-track-height) * ${item.track} + 4px)`,
              }"
              :aria-pressed="selectedKey === item.booking.key"
              :aria-label="bookingLabel(item.booking, item.conflict)"
              :title="bookingLabel(item.booking, item.conflict)"
              @click="select(item.booking)"
            >
              <span
                v-if="item.conflict"
                aria-hidden="true"
                class="c-resource-schedule__conflict-marker"
                >!</span
              >
              <slot
                name="booking"
                :booking="item.booking"
                :resource="lane.resource"
                :conflict="item.conflict"
              >
                {{ item.booking.label }}
              </slot>
            </button>
          </div>
        </div>
      </div>
      <div
        v-if="selected"
        class="c-resource-schedule__detail"
      >
        <slot
          name="details"
          :booking="selected.item.booking"
          :resource="selected.resource"
          :conflict="selected.item.conflict"
        >
          <strong>{{ selected.item.booking.label }}</strong>
          <span>{{ selected.resource.label }}</span>
          <span>{{
            formatRange(selected.item.booking.start, selected.item.booking.end)
          }}</span>
          <span
            v-if="selected.item.conflict"
            class="c-resource-schedule__conflict-marker"
            >{{ t('conflict') }}</span
          >
        </slot>
      </div>
    </template>
  </section>
</template>

<script
  setup
  lang="ts"
  generic="
    R extends ResourceScheduleResource = ResourceScheduleResource,
    B extends ResourceScheduleBooking = ResourceScheduleBooking
  "
>
  import { computed, shallowRef } from 'vue'
  import { NButton } from 'naive-ui'
  import { useComponentDensity } from '../../composables/useComponentDensity'
  import { useComponentTheme } from '../../composables/useComponentTheme'
  import { resolveComponentDensity } from '../../core/density'
  import { useScopedComponentLocale } from '../_shared/useScopedComponentLocale'
  import {
    buildScheduleLanes,
    getScheduleTicks,
    isScheduleRange,
  } from './layout'
  import { CHINESE, ENGLISH } from './locale'
  import type {
    ResourceScheduleBooking,
    ResourceScheduleBookingSlot,
    ResourceScheduleProps,
    ResourceScheduleRange,
    ResourceScheduleResource,
  } from './types'

  defineOptions({ name: 'C_ResourceSchedule' })
  const props = defineProps<ResourceScheduleProps<R, B>>()
  const emit = defineEmits<{
    'update:range': [range: ResourceScheduleRange]
    'update:modelValue': [key: B['key']]
    select: [booking: B]
  }>()
  defineSlots<{
    booking?: (props: ResourceScheduleBookingSlot<R, B>) => unknown
    details?: (props: ResourceScheduleBookingSlot<R, B>) => unknown
  }>()
  const { t: translate, locale } = useScopedComponentLocale(
    CHINESE,
    ENGLISH,
    () => props.locale
  )
  const t = (key: string, params?: Record<string, string | number>) =>
    translate(`resourceSchedule.${key}`, params)
  const density = useComponentDensity(() => props.density)
  const size = computed(() => resolveComponentDensity(density.value).size)
  const theme = useComponentTheme()
  const timeFormatter = computed(() => {
    const options: Intl.DateTimeFormatOptions = {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZone: props.timeZone ?? 'UTC',
    }
    try {
      return new Intl.DateTimeFormat(locale.value, options)
    } catch {
      return new Intl.DateTimeFormat(locale.value, {
        ...options,
        timeZone: 'UTC',
      })
    }
  })
  const timeZoneLabel = computed(
    () => timeFormatter.value.resolvedOptions().timeZone
  )
  const formatTime = (time: number) => timeFormatter.value.format(time)
  const formatRange = (start: number, end: number) =>
    `${formatTime(start)} – ${formatTime(end)}`
  const localSelected = shallowRef<B['key']>()
  const selectedKey = computed(() =>
    props.modelValue === undefined ? localSelected.value : props.modelValue
  )
  const lanes = computed(() =>
    buildScheduleLanes(props.resources, props.bookings, props.range)
  )
  const ticks = computed(() => getScheduleTicks(props.range, props.tickCount))
  const selected = computed(() => {
    for (const lane of lanes.value) {
      const item = lane.bookings.find(
        item => item.booking.key === selectedKey.value
      )
      if (item) return { item, resource: lane.resource }
    }
    return undefined
  })
  const select = (booking: B) => {
    localSelected.value = booking.key
    emit('update:modelValue', booking.key)
    emit('select', booking)
  }
  const nextRange = (direction: -1 | 1): ResourceScheduleRange => {
    const [start, end] = props.range
    const shift = (end - start) * direction
    return [start + shift, end + shift]
  }
  const canMove = (direction: -1 | 1) => isScheduleRange(nextRange(direction))
  const move = (direction: -1 | 1) => {
    const range = nextRange(direction)
    if (isScheduleRange(range)) emit('update:range', range)
  }
  const bookingLabel = (booking: B, conflict: boolean) => {
    const label = `${booking.label}, ${formatRange(booking.start, booking.end)}`
    return conflict ? `${label}, ${t('conflict')}` : label
  }
  const percentage = (value: number) => `${value}%`
  const position = ({ offset, width }: { offset: number; width: number }) => ({
    left: percentage(offset),
    width: percentage(width),
  })
  const themeStyle = computed(() => ({
    ...theme.value,
    '--c-schedule-interval': percentage(
      100 / Math.max(1, ticks.value.length - 1)
    ),
    '--c-schedule-axis-min': `${Math.max(24, (ticks.value.length - 1) * 7)}rem`,
    '--c-schedule-track-height': {
      small: '30px',
      medium: '36px',
      large: '42px',
    }[size.value],
  }))
</script>

<style scoped lang="scss">
  @use './index.scss';
</style>
