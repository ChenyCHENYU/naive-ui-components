import type { ComponentLocale } from '../../core/contracts'
import type { ComponentDensity } from '../../core/density'

export type ChangeReviewKey<T extends object> = Extract<keyof T, string>
export type ChangeReviewStatus = 'unchanged' | 'added' | 'removed' | 'changed'
export type ChangeReviewSide = 'before' | 'after'

export type ChangeReviewField<
  T extends object,
  K extends ChangeReviewKey<T> = ChangeReviewKey<T>,
> = {
  [P in K]: {
    key: P
    label: string
    group?: string
    /** 使用字段原值比较。默认以 Object.is 判定相等。 */
    equal?: (before: T[P] | undefined, after: T[P] | undefined) => boolean
    /** 可返回 undefined，使用内置的字段值文本。 */
    format?: (
      value: T[P] | undefined,
      side: ChangeReviewSide
    ) => string | number | undefined
    /** 仍显示差异，但此字段不可采纳。 */
    disabled?: boolean
  }
}[K]

export interface ChangeReviewProps<T extends object> {
  before: Readonly<Partial<T>>
  after: Readonly<Partial<T>>
  fields: readonly ChangeReviewField<NoInfer<T>>[]
  title?: string
  beforeLabel?: string
  afterLabel?: string
  selectable?: boolean
  disabled?: boolean
  density?: ComponentDensity
  locale?: ComponentLocale
}

export interface ChangeReviewEmits<T extends object> {
  apply: [keys: ChangeReviewKey<T>[]]
}
