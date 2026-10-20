/* eslint-disable @typescript-eslint/no-require-imports -- Exercise the published CommonJS types with TypeScript's require syntax. */
import Components = require('@robot-admin/naive-ui-components')
import Form = require('@robot-admin/naive-ui-components/C_Form')
import Search = require('@robot-admin/naive-ui-components/C_FormSearch')
import Menu = require('@robot-admin/naive-ui-components/C_Menu')
import Resolver = require('@robot-admin/naive-ui-components/resolver')
import Vue = require('vue')

interface Model {
  name: string
  enabled: boolean
}

const options = Form.defineFormOptions<Model>([
  { type: 'input', prop: 'name', label: 'Name' },
])
const form: Form.UseCFormReturn<Model> = Form.useCForm({
  initialValues: { name: '', enabled: true },
  options,
})
const { name }: Pick<Model, 'name'> = form.model.value
const field: Form.FieldPath<Model> = 'name'
// @ts-expect-error Fields must belong to the business model.
const invalidField: Form.FieldPath<Model> = 'missing'

declare const menu: Menu.MenuExpose
declare const search: ReturnType<typeof Search.useSearchState>
menu.menuRef?.showOption('settings')
search.formRef.value?.restoreValidation()
const highlight: Components.HighlightAPI = Components.createHighlight({
  autoDetect: true,
})
const renderers: Form.FormRendererRegistry = Form.createFormRendererRegistry()
const pluginOptions: Components.ComponentLibOptions = {
  formRenderers: renderers,
}
Vue.createApp({ render: () => null }).use(Components.default, pluginOptions)
void [
  Components.default.install,
  Form.C_Form,
  Resolver.RobotNaiveUiResolver,
  name,
  field,
  invalidField,
  highlight.getLoadedLanguages(),
]

// Publish-time contract: template-facing events and inferred instances preserve business models.
interface ChildModel {
  id: number
  title: string
}
type TablePublicProps = Parameters<
  typeof Components.C_Table<Model, ChildModel>
>[0]
type TablePublicExpose = Parameters<
  NonNullable<Parameters<typeof Components.C_Table<Model, ChildModel>>[2]>
>[0]
type IsAny<T> = 0 extends 1 & T ? true : false
type Assert<T extends true> = T
type SaveRowIsTyped = Assert<
  IsAny<Parameters<NonNullable<TablePublicProps['onSave']>>[0]> extends false
    ? true
    : false
>
const saveHandler: NonNullable<TablePublicProps['onSave']> = row =>
  row.name.toUpperCase()
// @ts-expect-error Wrong callback models must fail on the published component props.
const wrongSaveHandler: NonNullable<TablePublicProps['onSave']> = (_row: {
  name: number
}) => _row.name.toFixed()
declare const tableInstance: TablePublicExpose
const { name: selectedName }: { name: string } =
  tableInstance.getSelectedRows()[0]
const { title: childTitle }: { title: string } =
  tableInstance.getChildSelectedRows(1)[0]
const saveRowIsTyped: SaveRowIsTyped = true
void [saveHandler, wrongSaveHandler, selectedName, childTitle, saveRowIsTyped]

interface RecursiveFormModel {
  name: string
  count: number
  parent?: RecursiveFormModel
  children?: RecursiveFormModel[]
}
const deepField: Form.FieldPath<RecursiveFormModel> =
  'parent.parent.parent.parent.parent.name'
const arrayField: Form.FieldPath<RecursiveFormModel> =
  'children.0.children.0.name'
// @ts-expect-error Recursive paths retain the six-property depth limit.
const tooDeepField: Form.FieldPath<RecursiveFormModel> =
  'parent.parent.parent.parent.parent.parent.name'
const nestedValue: Form.FieldPathValue<RecursiveFormModel, 'children.0.count'> =
  1
// @ts-expect-error Nested array field values retain the declared number type.
const wrongNestedValue: Form.FieldPathValue<
  RecursiveFormModel,
  'children.0.count'
> = 'wrong'

// TypeScript 5.8 must compare Vue's unwrapped Form.FormOption union without recursion.
interface OptionalFormModel {
  employeeId?: string
  fullName?: string
  gender?: 'male' | 'female'
  birthDate?: number
  phone?: string
  email?: string
  address?: string
  department?: string
  position?: string
  joinDate?: number
  salary?: number
  skills?: string[]
  performance?: number
  isActive?: boolean
  remarks?: string
}
const optionalFields = Vue.ref<Form.FormOption<OptionalFormModel>[]>([])
const updateOptionalFields = (
  fields: Form.FormOption<OptionalFormModel>[]
): void => {
  optionalFields.value = fields
}
const optionalConfig = Vue.computed<Form.FormConfig<OptionalFormModel>>(() => ({
  onFieldsChange: updateOptionalFields,
}))
const fieldMetadata = optionalFields.value.map(field => ({
  prop: field.prop,
  label: field.label,
  type: field.type,
}))
const dynamicField: Form.FormOption<object> = {
  type: 'input',
  prop: 'applicationField',
  value: { arbitrary: true },
}
void [
  deepField,
  arrayField,
  tooDeepField,
  nestedValue,
  wrongNestedValue,
  optionalConfig,
  fieldMetadata,
  dynamicField,
]
