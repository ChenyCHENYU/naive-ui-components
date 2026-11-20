import type { FilterField } from './types'

export interface FilterEditorSettings<K extends string> {
  fields: ReadonlyMap<K, FilterField<K>>
  fieldOptions: { value: K; label: string }[]
  maxDepth: number
  disabled: boolean
  size: 'small' | 'medium' | 'large'
  t: (key: string) => string
  issueAt: (path: string) => string | undefined
  createId: () => string
}
