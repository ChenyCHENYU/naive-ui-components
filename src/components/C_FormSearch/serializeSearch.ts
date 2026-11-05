import { cloneData, parseDataPath } from '../../utils/data'
import { isSearchValueEmpty } from './fieldValue'
import type { SearchFormItem, SearchFormParams } from './types'

export interface SerializeSearchOptions {
  /** 仅清理查询载荷，不影响草稿；0/false/前导零均保留。默认 true。 */
  omitEmpty?: boolean
  /** active 只提交当前配置中可用的字段与固定条件，忽略未配置值和 show: false 的非固定条件。 */
  scope?: 'all' | 'active'
}

function validateTargets<T extends object>(
  fields: readonly SearchFormItem<T>[]
): void {
  const targets = new Set<string>()
  for (const { prop, query } of fields) {
    const names = query?.keys ?? [query?.name ?? prop]
    for (const name of names) {
      parseDataPath(name)
      if (targets.has(name))
        throw new TypeError(`Duplicate search query key: ${name}`)
      targets.add(name)
    }
  }
}

function cloneUnmapped<T extends object>(
  params: T,
  fields: readonly SearchFormItem<T>[]
): Record<string, unknown> {
  const output = cloneData(params) as Record<string, unknown>
  // Remove aliased source keys first, since another field can target one of them.
  for (const { prop, query } of fields) {
    if (query?.keys || (query?.name ?? prop) !== prop) delete output[prop]
  }
  return output
}

function encodeField<T extends object>(
  params: T,
  { prop, query }: SearchFormItem<T>,
  put: (name: string, value: unknown) => void
): void {
  const raw = Object.prototype.hasOwnProperty.call(params, prop)
    ? cloneData((params as Record<string, unknown>)[prop])
    : undefined
  const value = query?.serialize ? query.serialize(raw) : raw
  if (query?.keys) {
    const [start, end] = query.keys
    const endpoints = Array.isArray(value) ? value : [null, null]
    put(start, endpoints[0])
    put(end, endpoints[1])
  } else {
    put(query?.name ?? prop, value)
  }
}

/** 显式将搜索模型编码为请求载荷；onSearch/事件始终保留原始 T，不隐式调用此函数。 */
export function serializeSearch<T extends object = SearchFormParams>(
  params: T,
  fields: readonly SearchFormItem<T>[],
  options: SerializeSearchOptions = {}
): Record<string, unknown> {
  const activeOnly = options.scope === 'active'
  const included = fields.filter(
    field =>
      field.type !== 'spacer' &&
      (!activeOnly || field.show !== false || field.fixed)
  )
  validateTargets(included)
  const output: Record<string, unknown> = activeOnly
    ? {}
    : cloneUnmapped(params, included)
  const omitEmpty = options.omitEmpty ?? true
  const put = (name: string, value: unknown) => {
    parseDataPath(name)
    if (omitEmpty && isSearchValueEmpty(value)) delete output[name]
    else output[name] = cloneData(value)
  }
  for (const field of included) encodeField(params, field, put)
  return output
}
