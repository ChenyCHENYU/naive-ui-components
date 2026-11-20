import type {
  ResourceScheduleBooking,
  ResourceScheduleKey,
  ResourceScheduleRange,
  ResourceScheduleResource,
} from './types'

const DATE_LIMIT = 8_640_000_000_000_000

/** Checks that both boundaries are real, ordered dates. */
export function isScheduleRange(range: ResourceScheduleRange) {
  const [start, end] = range
  return (
    Number.isFinite(start) &&
    Number.isFinite(end) &&
    start < end &&
    start >= -DATE_LIMIT &&
    end <= DATE_LIMIT
  )
}

interface TimePosition {
  start: number
  end: number
  offset: number
  width: number
}

interface PlacedBooking<B> extends TimePosition {
  booking: B
  track: number
  conflict: boolean
}

interface ResourceScheduleLane<R, B> {
  resource: R
  workingWindows: TimePosition[]
  bookings: PlacedBooking<B>[]
  trackCount: number
}

function clip(
  start: number,
  end: number,
  range: ResourceScheduleRange
): TimePosition | undefined {
  const clippedStart = Math.max(start, range[0])
  const clippedEnd = Math.min(end, range[1])
  if (!isScheduleRange([start, end]) || clippedStart >= clippedEnd) return
  const duration = range[1] - range[0]
  return {
    start: clippedStart,
    end: clippedEnd,
    offset: ((clippedStart - range[0]) / duration) * 100,
    width: ((clippedEnd - clippedStart) / duration) * 100,
  }
}

function layoutBookings<B extends ResourceScheduleBooking>(
  bookings: readonly B[],
  range: ResourceScheduleRange
): { bookings: PlacedBooking<B>[]; trackCount: number } {
  const items = bookings.flatMap(booking => {
    const position = clip(booking.start, booking.end, range)
    return position ? [{ booking, ...position }] : []
  })
  items.sort((left, right) => left.start - right.start || right.end - left.end)

  const tracks: number[] = []
  let furthestEnd = -Infinity
  const output = items.map((item, index) => {
    let track = tracks.findIndex(end => end <= item.start)
    if (track === -1) track = tracks.length
    tracks[track] = item.end

    // The prefix maximum detects overlap with earlier rows. The next start detects
    // overlap with any later row because the array is already ordered by start.
    const conflict =
      item.start < furthestEnd ||
      (items[index + 1]?.start ?? Infinity) < item.end
    furthestEnd = Math.max(furthestEnd, item.end)
    return { ...item, track, conflict }
  })
  return { bookings: output, trackCount: Math.max(1, tracks.length) }
}

/** Group only visible bookings, preserving resource order and caller-owned records. */
export function buildScheduleLanes<
  R extends ResourceScheduleResource,
  B extends ResourceScheduleBooking,
>(
  resources: readonly R[],
  bookings: readonly B[],
  range: ResourceScheduleRange
): ResourceScheduleLane<R, B>[] {
  if (!isScheduleRange(range)) return []
  const groups = new Map<ResourceScheduleKey, B[]>()
  const bookingKeys = new Set<ResourceScheduleKey>()
  for (const booking of bookings) {
    if (bookingKeys.has(booking.key)) continue
    bookingKeys.add(booking.key)
    const group = groups.get(booking.resourceKey)
    if (group) group.push(booking)
    else groups.set(booking.resourceKey, [booking])
  }
  const resourcesSeen = new Set<ResourceScheduleKey>()
  const lanes: ResourceScheduleLane<R, B>[] = []
  for (const resource of resources) {
    if (resourcesSeen.has(resource.key)) continue
    resourcesSeen.add(resource.key)
    const workingWindows = (resource.workingWindows ?? []).flatMap(
      ([start, end]) => {
        const position = clip(start, end, range)
        return position ? [position] : []
      }
    )
    lanes.push({
      resource,
      workingWindows,
      ...layoutBookings(groups.get(resource.key) ?? [], range),
    })
  }
  return lanes
}

/** Space labels evenly across the controlled viewport. */
export function getScheduleTicks(range: ResourceScheduleRange, requested = 7) {
  if (!isScheduleRange(range)) return []
  const count = Number.isFinite(requested)
    ? Math.max(2, Math.min(24, Math.trunc(requested)))
    : 7
  const span = range[1] - range[0]
  return Array.from({ length: count }, (_, index) => {
    const fraction = index / (count - 1)
    return { time: range[0] + span * fraction, offset: fraction * 100 }
  })
}
