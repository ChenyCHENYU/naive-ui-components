import type { TableColumn } from '../../types'

type ColumnKey = string | number

interface ColumnPreference {
  key: ColumnKey
  visible?: boolean
  width?: number | string
  fixed?: 'left' | 'right' | null
  resizable?: boolean
}

export interface ColumnPreferences {
  order?: ColumnKey[]
  columns: ColumnPreference[]
}

const isColumnKey = (key: unknown): key is ColumnKey =>
  typeof key === 'string' || (typeof key === 'number' && Number.isFinite(key))

const isWidth = (width: unknown): width is number | string =>
  (typeof width === 'number' && Number.isFinite(width) && width >= 0) ||
  (typeof width === 'string' && width.trim().length > 0 && width.length <= 128)

const isFixed = (fixed: unknown): fixed is ColumnPreference['fixed'] =>
  fixed === 'left' || fixed === 'right' || fixed === null

/** Settings mutate column fields locally, never the caller's column objects. */
export const cloneTableColumns = (columns: TableColumn[]): TableColumn[] =>
  columns.map(column => ({ ...column }))

/** Treat browser storage as untrusted input; only restore recognized column fields. */
export const parseColumnPreferences = (raw: string): ColumnPreferences => {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { columns: [] }
  }
  const legacy = Array.isArray(parsed)
  const stored = legacy
    ? { columns: parsed }
    : (parsed as { order?: unknown; columns?: unknown } | null)
  if (!Array.isArray(stored?.columns)) return { columns: [] }

  const columns = stored.columns.flatMap(
    (entry: unknown): ColumnPreference[] => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return []
      const value = entry as Record<string, unknown>
      if (!isColumnKey(value.key)) return []
      return [
        {
          key: value.key,
          ...(typeof value.visible === 'boolean' && { visible: value.visible }),
          ...(isWidth(value.width) && { width: value.width }),
          ...(isFixed(value.fixed) && { fixed: value.fixed }),
          ...(typeof value.resizable === 'boolean' && {
            resizable: value.resizable,
          }),
        },
      ]
    }
  )
  const order = legacy
    ? columns.map(column => column.key)
    : Array.isArray(stored.order)
      ? stored.order.filter(isColumnKey)
      : undefined
  return { columns, order }
}

/** Apply only user settings. New and auxiliary columns keep their declared slots. */
export const mergeColumnPreferences = (
  columns: TableColumn[],
  { columns: settings, order }: ColumnPreferences
): TableColumn[] => {
  if (!settings.length && !order?.length) return columns
  const preferences = new Map(settings.map(setting => [setting.key, setting]))
  const merged = columns.map(column => {
    if (!isColumnKey(column.key)) return column
    const preference = preferences.get(column.key)
    if (!preference) return column
    return {
      ...column,
      visible: preference.visible ?? column.visible,
      width: preference.width ?? column.width,
      fixed:
        preference.fixed === null
          ? undefined
          : (preference.fixed ?? column.fixed),
      resizable: preference.resizable ?? column.resizable,
    }
  })
  if (!order?.length) return merged
  const positions = new Map(order.map((key, index) => [key, index]))
  const known = (column: TableColumn) =>
    isColumnKey(column.key) && positions.has(column.key)
  const ordered = merged
    .filter(known)
    .sort((a, b) => positions.get(a.key!)! - positions.get(b.key!)!)
  let index = 0
  return merged.map(column => (known(column) ? ordered[index++] : column))
}

/** Store only the properties the user changed from the current table defaults. */
export const getColumnPreferences = (
  defaults: TableColumn[],
  columns: TableColumn[]
): ColumnPreferences => {
  const keyedDefaults = new Map(defaults.map(column => [column.key, column]))
  const order = columns.map(column => column.key).filter(isColumnKey)
  const originalOrder = defaults.map(column => column.key).filter(isColumnKey)
  return {
    order: order.some((key, index) => key !== originalOrder[index])
      ? order
      : undefined,
    columns: columns.flatMap((column): ColumnPreference[] => {
      if (!isColumnKey(column.key)) return []
      const base = keyedDefaults.get(column.key)
      if (!base) return []
      const visible =
        (column.visible !== false) === (base.visible !== false)
          ? undefined
          : column.visible !== false
      const width = column.width !== base.width ? column.width : undefined
      const fixed =
        column.fixed !== base.fixed ? (column.fixed ?? null) : undefined
      const resizable =
        (column.resizable === true) === (base.resizable === true)
          ? undefined
          : column.resizable === true
      const changes = { visible, width, fixed, resizable }
      return Object.values(changes).every(value => value === undefined)
        ? []
        : [{ key: column.key, ...changes }]
    }),
  }
}
