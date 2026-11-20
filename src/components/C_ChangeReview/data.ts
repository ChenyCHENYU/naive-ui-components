import type {
  ChangeReviewField,
  ChangeReviewKey,
  ChangeReviewSide,
  ChangeReviewStatus,
} from './types'

export interface ReviewRow<
  T extends object,
  K extends ChangeReviewKey<T> = ChangeReviewKey<T>,
> {
  field: ChangeReviewField<T, K>
  before: T[K] | undefined
  after: T[K] | undefined
  status: ChangeReviewStatus
  eligible: boolean
  format: (side: ChangeReviewSide) => string | number | undefined
}

/** 保留字段原值供业务比较，并将格式化延迟到该行展示时。 */
export function createReviewRow<T extends object, K extends ChangeReviewKey<T>>(
  field: ChangeReviewField<T, K>,
  baseline: Readonly<Partial<T>>,
  proposal: Readonly<Partial<T>>
): ReviewRow<T, K> {
  const before = baseline[field.key]
  const after = proposal[field.key]
  const equal = field.equal ?? Object.is
  let status: ChangeReviewStatus = 'changed'
  if (equal(before, after)) status = 'unchanged'
  else if (before == null && after != null) status = 'added'
  else if (before != null && after == null) status = 'removed'

  return {
    field,
    before,
    after,
    status,
    // null 是显式清空，undefined 表示提案没有提供可采纳的值。
    eligible: status !== 'unchanged' && !field.disabled && after !== undefined,
    format: side => field.format?.(side === 'before' ? before : after, side),
  }
}
