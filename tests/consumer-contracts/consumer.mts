import { createApp, h } from 'vue'
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
