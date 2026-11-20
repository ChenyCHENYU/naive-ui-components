export type TableExportScope = 'page' | 'selected' | 'matching'

export interface TableMatchingExportContext {
  columns: readonly { key: string; title: string }[]
  format: 'csv' | 'xlsx'
  filename?: string
}
