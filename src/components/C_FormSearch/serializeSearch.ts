import { cloneData, parseDataPath } from '../../utils/data'
import { isSearchValueEmpty } from './fieldValue'
import type { SearchFormItem, SearchFormParams } from './types'

export interface SerializeSearchOptions {
  /** 仅清理查询载荷，不影响草稿；0/false/前导零均保留。默认 true。 */
  omitEmpty?: boolean
}

/** 显式将搜索模型编码为请求载荷；onSearch/事件始终保留原始 T，不隐式调用此函数。 */
export function serializeSearch<T extends object = SearchFormParams>(
  params: T,
  fields: readonly SearchFormItem<T>[],
  options: SerializeSearchOptions = {}
): Record<string, unknown> {
  const targets = new Set<string>()
  fields.forEach(field => {
    if (field.type === 'spacer') return
    const names = field.query?.keys ?? [field.query?.name ?? field.prop]
    names.forEach(name => {
      parseDataPath(name)
      if (targets.has(name))
        throw new TypeError(`Duplicate search query key: ${name}`)
      targets.add(name)
    })
  })
  const output = cloneData(params) as Record<string, unknown>
  const omitEmpty = options.omitEmpty ?? true
  const put = (name: string, value: unknown) => {
    parseDataPath(name)
    if (omitEmpty && isSearchValueEmpty(value)) delete output[name]
    else output[name] = cloneData(value)
  }
  fields.forEach(field => {
    if (field.type === 'spacer') return
    const encoding = field.query
    const raw = cloneData((params as Record<string, unknown>)[field.prop])
    const value = encoding?.serialize ? encoding.serialize(raw) : raw
    if (encoding?.keys) {
      delete output[field.prop]
      const [start, end] = encoding.keys
      const endpoints = Array.isArray(value) ? value : [null, null]
      put(start, endpoints[0])
      put(end, endpoints[1])
      return
    }
    const name = encoding?.name ?? field.prop
    if (name !== field.prop) delete output[field.prop]
    put(name, value)
  })
  return output
}
