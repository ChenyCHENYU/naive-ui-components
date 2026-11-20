import type { NotificationMessage } from '../C_NotificationCenter/types'
import type { ComponentLocale } from '../../core/contracts'

export interface NotificationInboxView<K extends string = string> {
  key: K
  label: string
  /** Use an application-wide count. Omit it when the total is unknown. */
  count?: number
  disabled?: boolean
}

export interface NotificationInboxAction<K extends string = string> {
  key: K
  label: string
  disabled?: boolean
  type?: 'default' | 'primary' | 'success' | 'warning' | 'error'
}

export interface NotificationInboxBadge {
  label: string
  type?: 'default' | 'info' | 'success' | 'warning' | 'error'
}

export interface NotificationInboxProps<
  T extends NotificationMessage = NotificationMessage,
  V extends string = string,
  A extends string = string,
> {
  views: readonly NotificationInboxView<V>[]
  activeView: NoInfer<V>
  items: readonly T[]
  selectedId?: string
  /** Zero-based index of the current page's first record. */
  startIndex?: number
  loading?: boolean
  pendingIds?: readonly string[]
  error?: string
  emptyText?: string
  locale?: ComponentLocale
  actions?: (item: NoInfer<T>) => readonly NotificationInboxAction<A>[]
  badges?: (item: NoInfer<T>) => readonly NotificationInboxBadge[]
}

export interface NotificationInboxEmits<
  T extends NotificationMessage = NotificationMessage,
  V extends string = string,
  A extends string = string,
> {
  'update:activeView': [value: V]
  select: [item: T]
  action: [key: A, item: T]
  retry: []
}
