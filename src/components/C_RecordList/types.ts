import type { ComponentLocale } from '../../core/contracts'
import type { ComponentDensity } from '../../core/density'

export type RecordListKey = string | number
export type RecordListStatusType =
  'default' | 'info' | 'success' | 'warning' | 'error'

export interface RecordListItemView {
  title: string
  description?: string
  status?: string | { label: string; type?: RecordListStatusType }
  disabled?: boolean
}

export interface RecordListProps<T extends object, K extends RecordListKey> {
  items: readonly T[]
  itemKey: (record: NoInfer<T>) => K
  itemView: (record: NoInfer<T>) => RecordListItemView
  modelValue?: NoInfer<K> | null
  selectable?: boolean
  layout?: 'list' | 'cards'
  loading?: boolean
  emptyText?: string
  ariaLabel?: string
  density?: ComponentDensity
  locale?: ComponentLocale
}

export interface RecordListItemContext<
  T extends object,
  K extends RecordListKey,
> {
  item: T
  itemKey: K
  view: RecordListItemView
  selected: boolean
}

export interface RecordListEmits<T extends object, K extends RecordListKey> {
  'update:modelValue': [key: K]
  select: [item: T, key: K]
}
