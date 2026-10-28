import type { BatchOperationResult } from '../../core/batchPatch'
import type { ComponentLocale } from '../../core/contracts'

export interface BatchResultProps {
  results: readonly BatchOperationResult[]
  title?: string
  pageSize?: number
  locale?: ComponentLocale
}

export interface BatchResultEmits {
  retry: [keys: (string | number)[]]
}
