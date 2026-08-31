import type { FormItemRule } from 'naive-ui/es/form'
import type { DataRecord } from '../types'

function getRuleMessage(rule: FormItemRule, fallback: string): string {
  const message =
    typeof rule.message === 'function' ? rule.message() : rule.message
  return message || fallback
}

function isEmptyValue(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  )
}

function getComparableLength(value: unknown): number | undefined {
  if (typeof value === 'number') return value
  if (typeof value === 'string' || Array.isArray(value)) return value.length
  return undefined
}

function normalizeValidationError(
  result: unknown,
  fallback: string
): string | null {
  if (result === false) return fallback
  if (result instanceof Error) return result.message || fallback
  if (typeof result === 'string') return result || fallback
  if (Array.isArray(result) && result.length > 0) {
    return normalizeValidationError(result[0], fallback)
  }
  return null
}

/** Execute the common async-validator rule subset used by editable table cells. */
// eslint-disable-next-line complexity -- One dispatcher mirrors the supported async-validator rule branches.
export async function validateTableRule(
  rule: FormItemRule,
  rawValue: unknown,
  label: string,
  source: DataRecord
): Promise<string | null> {
  const fallback = getRuleMessage(rule, `${label}校验失败`)
  const value = rule.transform ? rule.transform(rawValue) : rawValue

  if (rule.required && isEmptyValue(value)) {
    return getRuleMessage(rule, `${label}不能为空`)
  }
  if (!rule.required && isEmptyValue(value)) return null

  if (rule.enum && !rule.enum.includes(value as never)) return fallback
  if (rule.pattern && !new RegExp(rule.pattern).test(String(value))) {
    return fallback
  }

  const length = getComparableLength(value)
  if (rule.len !== undefined && length !== rule.len) return fallback
  if (rule.min !== undefined && length !== undefined && length < rule.min) {
    return fallback
  }
  if (rule.max !== undefined && length !== undefined && length > rule.max) {
    return fallback
  }

  let callbackError: string | Error | undefined
  const callback = (error?: string | Error) => {
    callbackError = error
  }

  try {
    if (rule.validator) {
      const result = await rule.validator(rule, value, callback, source, {})
      const error = normalizeValidationError(result, fallback)
      if (error) return error
    }
    if (callbackError) return normalizeValidationError(callbackError, fallback)

    if (rule.asyncValidator) {
      await rule.asyncValidator(rule, value, callback, source, {})
      if (callbackError)
        return normalizeValidationError(callbackError, fallback)
    }
  } catch (error) {
    return error instanceof Error && error.message ? error.message : fallback
  }

  return null
}
