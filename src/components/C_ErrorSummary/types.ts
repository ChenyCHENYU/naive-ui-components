import type { ValidationIssue } from '../../core/validation'
import type { ComponentLocale } from '../../core/contracts'

export interface ErrorSummaryProps {
  issues: readonly ValidationIssue[]
  title?: string
  /** 每页挂载的问题数，默认 8，最大 100，避免大批失败创建大量 DOM。 */
  limit?: number
  locale?: ComponentLocale
}
