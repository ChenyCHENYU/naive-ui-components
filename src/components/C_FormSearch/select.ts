import type { SelectOption } from 'naive-ui'
import type { SearchOptionItem } from './types'

type NativeValue = string | number
type SearchValue = NativeValue | boolean

/** 仅在控件边界编码布尔值；业务模型始终保留原始类型。 */
export function createSearchSelectBinding(
  list: SearchOptionItem[] | undefined,
  modelValue: unknown
) {
  const optionValues = list?.map(option =>
    option.value !== undefined
      ? option.value
      : (option.label ?? option.labelDefault)
  )
  const modelValues = Array.isArray(modelValue) ? modelValue : [modelValue]
  const occupied = new Set([...(optionValues ?? []), ...modelValues])
  const booleanValues = new Map<boolean, string>()
  for (const value of [false, true]) {
    let token = `__c_form_search_boolean_${value}__`
    while (occupied.has(token)) token += '_'
    booleanValues.set(value, token)
    occupied.add(token)
  }
  const encode = (value: unknown): NativeValue | null => {
    if (typeof value === 'boolean') return booleanValues.get(value)!
    return typeof value === 'string' || typeof value === 'number' ? value : null
  }
  const decode = (value: NativeValue): SearchValue => {
    if (value === booleanValues.get(false)) return false
    if (value === booleanValues.get(true)) return true
    return value
  }
  return {
    options: list?.map((option, index): SelectOption => ({
      ...option,
      label: option.label ?? option.labelDefault ?? '',
      value: encode(optionValues![index]) ?? undefined,
    })),
    value: Array.isArray(modelValue)
      ? modelValue
          .map(encode)
          .filter((value): value is NativeValue => value !== null)
      : encode(modelValue),
    decode: (value: NativeValue | NativeValue[] | null) =>
      Array.isArray(value)
        ? value.map(decode)
        : value === null
          ? null
          : decode(value),
  }
}
