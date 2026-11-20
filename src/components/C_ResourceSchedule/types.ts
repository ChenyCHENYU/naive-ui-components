import type { ComponentLocale } from '../../core/contracts'
import type { ComponentDensity } from '../../core/density'

export type ResourceScheduleKey = string | number
/** Millisecond timestamps. Start is inclusive and end is exclusive. */
export type ResourceScheduleRange = readonly [start: number, end: number]

export interface ResourceScheduleResource {
  key: ResourceScheduleKey
  label: string
  workingWindows?: readonly ResourceScheduleRange[]
}

export interface ResourceScheduleBooking {
  key: ResourceScheduleKey
  resourceKey: ResourceScheduleKey
  label: string
  start: number
  end: number
}

export interface ResourceScheduleBookingSlot<
  R extends ResourceScheduleResource = ResourceScheduleResource,
  B extends ResourceScheduleBooking = ResourceScheduleBooking,
> {
  booking: B
  resource: R
  conflict: boolean
}

export interface ResourceScheduleProps<
  R extends ResourceScheduleResource = ResourceScheduleResource,
  B extends ResourceScheduleBooking = ResourceScheduleBooking,
> {
  range: ResourceScheduleRange
  resources: readonly R[]
  bookings: readonly B[]
  modelValue?: B['key'] | null
  title?: string
  timeZone?: string
  /** Including the two range boundaries. Defaults to 7, bounded between 2 and 24. */
  tickCount?: number
  navigation?: boolean
  density?: ComponentDensity
  locale?: ComponentLocale
}
