import type { BatchOperationResult } from '../../core/batchPatch'
import type { ComponentLocale } from '../../core/contracts'
import type { ComponentDensity } from '../../core/density'

export interface ImportWizardField<K extends string = string> {
  key: K
  label: string
  required?: boolean
}

export interface ImportWizardColumn {
  key: string
  label: string
}

export interface ImportWizardSheet {
  key: string
  label: string
  columns: readonly ImportWizardColumn[]
}

export interface ImportColumnMapping<K extends string = string> {
  field: K
  column: string
}

export interface ImportWizardDraft<K extends string = string> {
  file: File
  sheetKey: string
  mapping: readonly ImportColumnMapping<K>[]
}

export interface ImportWizardIssue {
  level: 'warning' | 'error'
  message: string
  /** Row label or original row number reported by the adapter. */
  row?: string | number
  field?: string
}

export interface ImportWizardPreview<Plan = unknown> {
  plan: Plan
  rowCount: number
  issues?: readonly ImportWizardIssue[]
}

export interface ImportWizardAdapter<
  K extends string = string,
  Plan = unknown,
> {
  read(file: File, signal: AbortSignal): Promise<readonly ImportWizardSheet[]>
  preview(
    draft: ImportWizardDraft<K>,
    signal: AbortSignal
  ): Promise<ImportWizardPreview<Plan>>
  commit(
    plan: Plan,
    signal: AbortSignal
  ): Promise<readonly BatchOperationResult[]>
}

export type ImportWizardPhase = 'read' | 'preview' | 'commit'

export interface ImportWizardProps<K extends string = string, Plan = unknown> {
  fields: readonly ImportWizardField<K>[]
  adapter: ImportWizardAdapter<K, Plan>
  /** Change when the destination or permissions change to discard the previous session. */
  scope?: string | number
  accept?: string
  title?: string
  disabled?: boolean
  density?: ComponentDensity
  locale?: ComponentLocale
}
