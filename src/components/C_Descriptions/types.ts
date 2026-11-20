import type { ComponentLocale } from '../../core/contracts'
import type { ComponentDensity } from '../../core/density'

export type DescriptionValue =
  string | number | boolean | bigint | null | undefined

export interface DescriptionField<T extends object> {
  key: Extract<keyof T, string>
  label: string
  group?: string
  show?: boolean | ((record: T) => boolean)
  format?: (record: T) => DescriptionValue
  copyable?: boolean
}

export interface DescriptionEntry<T extends object> {
  field: DescriptionField<T>
  record: T
  value: T[keyof T]
  text?: string
}

export interface DescriptionsProps<T extends object> {
  data: T | null | undefined
  fields: readonly DescriptionField<NoInfer<T>>[]
  title?: string
  /** Maximum columns. Columns wrap according to the available container width. */
  columns?: number
  emptyText?: string
  density?: ComponentDensity
  locale?: ComponentLocale
}
