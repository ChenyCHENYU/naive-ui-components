import {
  C_FormSearch,
  serializeSearch,
  type SearchFormItem,
  type SearchConfig,
  type SearchNumberRangeValue,
} from '../../src/components/C_FormSearch'
interface Query {
  tenant: string
  keyword: string
  quantity: number | null
  range: SearchNumberRangeValue
  date: string | null
  month: number | null
  enabled: boolean | null
  customer: { id: string; name: string } | null
}
const initial: Query = {
  tenant: '001',
  keyword: '',
  quantity: null,
  range: null,
  date: null,
  month: null,
  enabled: false,
  customer: null,
}
const fields: SearchFormItem<Query>[] = [
  { type: 'input', prop: 'tenant', fixed: true },
  { type: 'input', prop: 'keyword', label: '关键词', minWidth: 200 },
  { type: 'number', prop: 'quantity', defaultValue: 0 },
  {
    type: 'number-range',
    prop: 'range',
    query: { keys: ['minimum', 'maximum'] },
  },
  { type: 'date', prop: 'date', valueMode: 'formatted' },
  { type: 'month', prop: 'month', valueMode: 'timestamp' },
  { type: 'select', prop: 'enabled', list: [{ label: '停用', value: false }] },
  {
    type: 'custom',
    prop: 'customer',
    defaultValue: null,
    render: context => {
      context.model.keyword.trim()
      // @ts-expect-error 自定义控件不能通过暴露的查询模型绕过 fixed/readonly。
      context.model.tenant = 'other'
      context.updateValue({ id: '001', name: 'customer' })
      return null
    },
  },
]
const config: SearchConfig<Query> = {
  layout: 'grid',
  labelPlacement: 'left',
  labelWidth: 90,
  onSearch: params => {
    params.quantity?.toFixed(2)
    return Promise.resolve(serializeSearch(params, fields))
  },
}
C_FormSearch<Query>({
  modelValue: initial,
  formItemList: fields,
  config,
  onApplied: params => params.keyword.trim(),
})
const invalidNumber: SearchFormItem<{ amount: string }> = {
  // @ts-expect-error 数字控件不能绑定字符串模型。
  type: 'number',
  prop: 'amount',
}
// @ts-expect-error 可清空数字控件不能绑定非空数字且没有显式默认值。
const invalidRequiredNumber: SearchFormItem<{ amount: number }> = {
  type: 'number',
  prop: 'amount',
}
const requiredNumber: SearchFormItem<{ amount: number }> = {
  type: 'number',
  prop: 'amount',
  attrs: { clearable: false },
  defaultValue: 0,
}
const invalidDate: SearchFormItem<{ enabled: boolean | null }> = {
  // @ts-expect-error 日期控件不可绑定布尔模型。
  type: 'date',
  prop: 'enabled',
}
// @ts-expect-error 自定义控件必须声明类型正确的重置值。
const invalidCustom: SearchFormItem<{ value: string }> = {
  type: 'custom',
  prop: 'value',
}
void [
  invalidNumber,
  invalidRequiredNumber,
  requiredNumber,
  invalidDate,
  invalidCustom,
]

// @ts-expect-error 字符串日期的 null 初值必须显式声明 formatted 回写通道。
const ambiguousFormattedDate: SearchFormItem<{ date: string | null }> = {
  type: 'date',
  prop: 'date',
}
void ambiguousFormattedDate
