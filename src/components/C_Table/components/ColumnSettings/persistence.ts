import type { TableColumn } from '../../types'

type ColumnKey = string | number

interface ColumnPreference {
  key: ColumnKey
  order: number
  visible?: boolean
  width?: number | string
  fixed?: 'left' | 'right'
}

const isColumnKey = (key: unknown): key is ColumnKey =>
  typeof key === 'string' || (typeof key === 'number' && Number.isFinite(key))

const isWidth = (width: unknown): width is number | string =>
  (typeof width === 'number' && Number.isFinite(width) && width >= 0) ||
  (typeof width === 'string' && width.trim().length > 0 && width.length <= 128)

/** Settings mutate column fields locally, never the caller's column objects. */
export const cloneTableColumns = (columns: TableColumn[]): TableColumn[] =>
  columns.map(column => ({ ...column }))

/** Treat browser storage as untrusted input; only restore recognized column fields. */
export const parseColumnPreferences = (raw: string): ColumnPreference[] => {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []

  return parsed.flatMap((entry: unknown, order): ColumnPreference[] => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return []
    const value = entry as Record<string, unknown>
    if (!isColumnKey(value.key)) return []
    return [
      {
        key: value.key,
        order,
        ...(typeof value.visible === 'boolean' && { visible: value.visible }),
        ...(isWidth(value.width) && { width: value.width }),
        ...((value.fixed === 'left' || value.fixed === 'right') && {
          fixed: value.fixed,
        }),
      },
    ]
  })
}

export const mergeColumnPreferences = (
  columns: TableColumn[],
  raw: string
): TableColumn[] => {
  const preferences = new Map(
    parseColumnPreferences(raw).map(preference => [preference.key, preference])
  )
  return cloneTableColumns(columns)
    .map(column => {
      const preference = isColumnKey(column.key)
        ? preferences.get(column.key)
        : undefined
      return preference
        ? {
            ...column,
            visible: preference.visible ?? column.visible,
            width: preference.width ?? column.width,
            fixed: preference.fixed ?? column.fixed,
          }
        : column
    })
    .sort((left, right) => {
      const leftOrder = isColumnKey(left.key)
        ? preferences.get(left.key)?.order
        : undefined
      const rightOrder = isColumnKey(right.key)
        ? preferences.get(right.key)?.order
        : undefined
      return (leftOrder ?? Infinity) - (rightOrder ?? Infinity)
    })
}

export const serializeColumnPreferences = (columns: TableColumn[]): string =>
  JSON.stringify(
    columns
      .filter(column => isColumnKey(column.key))
      .map(column => ({
        key: column.key,
        visible: column.visible,
        width: column.width,
        fixed: column.fixed,
      }))
  )
