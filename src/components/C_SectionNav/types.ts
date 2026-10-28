import type { ComponentLocale } from '../../core/contracts'

export interface SectionNavItem {
  key: string
  label: string
  errorCount?: number
  disabled?: boolean
}

export interface SectionNavProps {
  items: readonly SectionNavItem[]
  modelValue?: string
  ariaLabel?: string
  locale?: ComponentLocale
}
