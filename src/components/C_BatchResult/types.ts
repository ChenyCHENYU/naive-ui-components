import type { BatchOperationResult } from '../../core/batchPatch'
import type { ComponentLocale } from '../../core/contracts'

export interface BatchResultProps {
  results: readonly BatchOperationResult[]
  title?: string
  pageSize?: number
  /** Hide the retry action when displaying a read-only result. */
  showRetry?: boolean
  locale?: ComponentLocale
}

export interface BatchResultEmits {
  retry: [keys: (string | number)[]]
}
