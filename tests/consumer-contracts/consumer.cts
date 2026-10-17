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
menu.menuRef.value?.showOption('settings')
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
