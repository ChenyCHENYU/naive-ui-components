/** 少量重复表单行的稳定身份与模型；大规模同构录入继续使用虚拟表格。 */
import { reactive, shallowRef, type UnwrapNestedRefs } from 'vue'
import { cloneData } from '../utils/data'

export interface FormArrayEntry<T extends object> {
  readonly key: string
  value: UnwrapNestedRefs<T>
}

/** 所有 key 仅属于此实例，增删移动不会把另一行的校验/草稿借给当前行。 */
export function useFormArray<T extends object>(
  initial: readonly T[] = [],
  options: { maxRows?: number } = {}
) {
  const maxRows = options.maxRows ?? 1000
  if (!Number.isInteger(maxRows) || maxRows < 1)
    throw new RangeError('maxRows 必须是正整数')
  let nextKey = 0
  const baseline = cloneData(initial)
  const items = shallowRef<readonly FormArrayEntry<T>[]>([])
  const entry = (value: T): FormArrayEntry<T> => ({
    key: `row-${nextKey++}`,
    value: reactive(cloneData(value)),
  })
  const reset = (values: readonly T[] = baseline) => {
    if (values.length > maxRows) throw new RangeError('重复表单超出 maxRows')
    // 先构造成功再替换，异常不会留下半份列表。
    const next = values.map(entry)
    items.value = next
  }
  const append = (value: T): string => {
    if (items.value.length >= maxRows)
      throw new RangeError('重复表单超出 maxRows')
    const row = entry(value)
    items.value = [...items.value, row]
    return row.key
  }
  const remove = (key: string): boolean => {
    const next = items.value.filter(row => row.key !== key)
    if (next.length === items.value.length) return false
    items.value = next
    return true
  }
  const move = (key: string, before: string | null): boolean => {
    const row = items.value.find(item => item.key === key)
    if (
      !row ||
      key === before ||
      (before !== null && !items.value.some(item => item.key === before))
    )
      return false
    const next = items.value.filter(item => item !== row)
    const index =
      before === null
        ? next.length
        : next.findIndex(item => item.key === before)
    next.splice(index, 0, row)
    items.value = next
    return true
  }
  const getValues = (): T[] => items.value.map(row => cloneData(row.value) as T)
  reset()
  return { items, append, remove, move, reset, getValues }
}
