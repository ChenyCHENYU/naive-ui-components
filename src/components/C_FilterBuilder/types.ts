import type { ComponentLocale } from '../../core/contracts'
import type { ComponentDensity } from '../../core/density'

type EqualityOperator = 'eq' | 'ne'
type EmptyOperator = 'isEmpty' | 'isNotEmpty'
type TextOperator = 'contains' | 'startsWith' | 'endsWith'
type OrderedOperator = 'gt' | 'gte' | 'lt' | 'lte'

export type FilterOperator =
  EqualityOperator | EmptyOperator | TextOperator | OrderedOperator
export type FilterLogic = 'and' | 'or'
export type FilterValue = string | number | boolean | null

interface FilterFieldBase<K extends string, Operator extends FilterOperator> {
  key: K
  label: string
  operators?: readonly (Operator | EqualityOperator | EmptyOperator)[]
}

export interface FilterOption {
  label: string
  value: string | number
  disabled?: boolean
}

export type FilterField<K extends string = string> =
  | (FilterFieldBase<K, TextOperator> & { type: 'text' })
  | (FilterFieldBase<K, OrderedOperator> & { type: 'number' | 'date' })
  | (FilterFieldBase<K, never> & {
      type: 'select'
      options: readonly FilterOption[]
    })
  | (FilterFieldBase<K, never> & { type: 'boolean' })

export interface FilterRule<K extends string = string> {
  type: 'rule'
  id: string
  field: K
  operator: FilterOperator
  value: FilterValue
}

export interface FilterGroup<K extends string = string> {
  type: 'group'
  id: string
  operator: FilterLogic
  children: readonly FilterNode<K>[]
}

export type FilterNode<K extends string = string> =
  FilterGroup<K> | FilterRule<K>

export type FilterIssueCode =
  | 'invalidNode'
  | 'duplicateId'
  | 'emptyGroup'
  | 'maxDepth'
  | 'unknownField'
  | 'invalidOperator'
  | 'invalidValue'

export interface FilterIssue {
  /** Root is an empty path. Each number is a child index within its group. */
  path: readonly number[]
  code: FilterIssueCode
}

export interface FilterValidationOptions {
  /** Maximum groups below the root, from 0 to 8. Defaults to 4. */
  maxDepth?: number
}

export interface FilterBuilderProps<
  K extends string = string,
> extends FilterValidationOptions {
  modelValue?: FilterGroup<K> | null
  fields: readonly FilterField<K>[]
  title?: string
  density?: ComponentDensity
  locale?: ComponentLocale
  disabled?: boolean
}
