import { computed, createApp, h, ref } from 'vue'
import { NInput } from 'naive-ui'
import Components, {
  C_Form,
  C_Table,
  createHighlight,
  createFormRendererRegistry,
  type ComponentLibOptions,
  type HighlightAPI,
} from '@robot-admin/naive-ui-components'
import {
  defineFormOptions,
  useCForm,
  type FieldPath,
  type FieldPathValue,
  type FormConfig,
  type FormOption,
  type UseCFormReturn,
} from '@robot-admin/naive-ui-components/C_Form'
import { useSearchState } from '@robot-admin/naive-ui-components/C_FormSearch'
import type { MenuExpose } from '@robot-admin/naive-ui-components/C_Menu'
import { RobotNaiveUiResolver } from '@robot-admin/naive-ui-components/resolver'

interface Model {
  name: string
  enabled: boolean
}

const options = defineFormOptions<Model>([
  { type: 'input', prop: 'name', label: 'Name' },
])
const form: UseCFormReturn<Model> = useCForm({
  initialValues: { name: '', enabled: true },
  options,
})
const { name }: Pick<Model, 'name'> = form.model.value
const field: FieldPath<Model> = 'name'
// @ts-expect-error Fields must belong to the business model.
const invalidField: FieldPath<Model> = 'missing'

declare const menu: MenuExpose
declare const search: ReturnType<typeof useSearchState>
menu.menuRef?.showOption('settings')
search.formRef.value?.restoreValidation()
const highlight: HighlightAPI = createHighlight({ autoDetect: true })
const renderers = createFormRendererRegistry({
  input: props => h(NInput, { ...props, clearable: true }),
})
const pluginOptions: ComponentLibOptions = { formRenderers: renderers }
createApp({ render: () => null }).use(Components, pluginOptions)
void [
  Components.install,
  C_Form,
  C_Table,
  RobotNaiveUiResolver,
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
type TablePublicProps = Parameters<typeof C_Table<Model, ChildModel>>[0]
type TablePublicExpose = Parameters<
  NonNullable<Parameters<typeof C_Table<Model, ChildModel>>[2]>
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
const deepField: FieldPath<RecursiveFormModel> =
  'parent.parent.parent.parent.parent.name'
const arrayField: FieldPath<RecursiveFormModel> = 'children.0.children.0.name'
// @ts-expect-error Recursive paths retain the six-property depth limit.
const tooDeepField: FieldPath<RecursiveFormModel> =
  'parent.parent.parent.parent.parent.parent.name'
const nestedValue: FieldPathValue<RecursiveFormModel, 'children.0.count'> = 1
// @ts-expect-error Nested array field values retain the declared number type.
const wrongNestedValue: FieldPathValue<RecursiveFormModel, 'children.0.count'> =
  'wrong'

// TypeScript 5.8 must compare Vue's unwrapped FormOption union without recursion.
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
const optionalFields = ref<FormOption<OptionalFormModel>[]>([])
const updateOptionalFields = (
  fields: FormOption<OptionalFormModel>[]
): void => {
  optionalFields.value = fields
}
const optionalConfig = computed<FormConfig<OptionalFormModel>>(() => ({
  onFieldsChange: updateOptionalFields,
}))
const fieldMetadata = optionalFields.value.map(field => ({
  prop: field.prop,
  label: field.label,
  type: field.type,
}))
const dynamicField: FormOption<object> = {
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
