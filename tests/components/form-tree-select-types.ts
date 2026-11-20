import type { TreeSelectOption } from 'naive-ui'
import {
  C_Form,
  useCForm,
  type FormOption,
  type OptionItem,
} from '../../src/components/C_Form'
import type { SearchFormItem } from '../../src/components/C_FormSearch'

interface Model {
  department: number | null
  departments: number[]
  enabled: boolean | null
}

const tree: TreeSelectOption[] = [
  { key: 0, label: '总部', children: [{ key: 1, label: '研发' }] },
]
const legacy: OptionItem[] = [{ value: 0, label: '总部' }]
// 动态表单维持可扩展的对象契约，不要求旧页面改写 Partial 合并或接口继承。
interface DynamicField extends FormOption {
  id: string
}
const dynamic: DynamicField = {
  id: 'department',
  prop: 'department',
  type: 'treeSelect',
  children: tree,
}
const withDefaults = (extra: Partial<FormOption>): FormOption => ({
  prop: 'department',
  type: 'input',
  ...extra,
})
// 空对象推断仍是动态表单，与 FieldPath 的空模型 fallback 保持一致。
const emptyModelOptions: FormOption<Record<never, never>>[] = [dynamic]
const objectModelOptions: FormOption<object>[] = [
  { type: 'treeSelect', prop: 'department', children: tree },
]
C_Form({ modelValue: {}, options: [dynamic] })
const emptyForm = useCForm({ initialValues: {}, options: [dynamic] })
const readFlatValue = (field: FormOption<Model>) => {
  if (field.type === 'select' || field.type === 'cascader') {
    const value: OptionItem['value'] | undefined = field.children?.[0]?.value
    return value
  }
}
const fields: FormOption<Model>[] = [
  { type: 'treeSelect', prop: 'department', children: tree },
  {
    type: 'treeSelect',
    prop: 'department',
    asyncOptions: async (model, context) => {
      model.department?.toFixed()
      context?.signal.throwIfAborted()
      return tree
    },
  },
  {
    type: 'treeSelect',
    prop: 'department',
    attrs: { keyField: 'id', labelField: 'name', childrenField: 'nodes' },
    children: [{ id: 0, name: '总部', nodes: [{ id: 1, name: '研发' }] }],
  },
  {
    type: 'treeSelect',
    prop: 'department',
    attrs: { keyField: 'value' },
    children: legacy,
    asyncOptions: async () => legacy,
  },
  { type: 'cascader', prop: 'department', children: legacy },
  {
    type: 'select',
    prop: 'enabled',
    children: [{ value: false, label: '停用' }],
  },
]
const searches: SearchFormItem<Model>[] = [
  { type: 'treeSelect', prop: 'department', list: tree },
  {
    type: 'treeSelect',
    prop: 'departments',
    attrs: { multiple: true, cascade: true, checkStrategy: 'child' },
    list: tree,
  },
]

// @ts-expect-error 普通 select 仍需要 value，不放宽成树节点契约。
const invalidSelect: FormOption<Model> = {
  type: 'select',
  prop: 'department',
  children: tree,
}
// @ts-expect-error cascader 继续使用 value，不因 treeSelect 改成 key。
const invalidCascader: FormOption<Model> = {
  type: 'cascader',
  prop: 'department',
  children: tree,
}
// @ts-expect-error 普通 select 的异步结果仍需要 value。
const invalidAsyncSelect: FormOption<Model> = {
  type: 'select',
  prop: 'department',
  asyncOptions: async () => tree,
}
// @ts-expect-error 具名可选字段仍是业务模型，不能当空模型放宽普通 select。
const invalidOptionalSelect: FormOption<{ department?: number | null }> = {
  type: 'select',
  prop: 'department',
  children: tree,
}
// @ts-expect-error Search 的树多选仍须显式 multiple，不能把数组当单值。
const invalidMultiple: SearchFormItem<Model> = {
  type: 'treeSelect',
  prop: 'departments',
  list: tree,
}
// @ts-expect-error Search 的树选择不能绑定布尔模型。
const invalidBoolean: SearchFormItem<Model> = {
  type: 'treeSelect',
  prop: 'enabled',
  list: tree,
}
void [
  dynamic,
  withDefaults,
  emptyModelOptions,
  objectModelOptions,
  emptyForm,
  readFlatValue,
  fields,
  searches,
  invalidSelect,
  invalidCascader,
  invalidAsyncSelect,
  invalidOptionalSelect,
  invalidMultiple,
  invalidBoolean,
]
