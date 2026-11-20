import {
  createNumberCodec,
  createBatchPatch,
} from '@robot-admin/naive-ui-components/data'
import {
  useDataResource,
  useTabbedQuery,
  useValidationScope,
  useFormArray,
} from '@robot-admin/naive-ui-components/workflows'
import { COMPONENT_LOCALE_KEY } from '@robot-admin/naive-ui-components/config'
import type {
  DataPickerProps,
  DataPickerSource,
  DataPickerSourceInput,
} from '@robot-admin/naive-ui-components/C_DataPicker'
import type {
  FormInstance,
  FormOption,
} from '@robot-admin/naive-ui-components/C_Form'
import type { SearchFormItem } from '@robot-admin/naive-ui-components/C_FormSearch'
import type { TableColumn } from '@robot-admin/naive-ui-components/C_Table'

interface Item {
  id: string
  count: number
  note: string | null
}
const exact: string | null = createNumberCodec({
  storage: 'decimal-string',
}).parse('9007199254740993.01')
const patch = createBatchPatch<Item>([
  { field: 'note', operation: 'clear' },
  { field: 'count', operation: 'set', value: 0 },
])
createBatchPatch<Item>([
  // @ts-expect-error A non-nullable field cannot be cleared.
  { field: 'count', operation: 'clear' },
])
const source: DataPickerSource<Item> = {
  rowKey: 'id',
  value: row => row.id,
  label: row => row.id,
  request: async () => ({ rows: [], total: 0 }),
}
const identitySource: DataPickerSourceInput<Item> = {
  rowKey: 'id',
  label: source.label,
  request: source.request,
}
const pickerProps: DataPickerProps<Item> = {
  source: identitySource,
  columns: [],
}
const businessValue = source.value({ id: 'one', count: 0, note: null })
declare const form: FormInstance<Item>
form.revealField('server.returned.path')
const plainForm: FormOption<Item> = {
  type: 'select',
  prop: 'id',
  children: [],
  optionsState: { loading: false, error: null, retry: async () => undefined },
  // @ts-expect-error Data plugins are composed by the host, not registered in components.
  dictionary: 'item-kind',
}
const plainSearch: SearchFormItem<Item> = {
  type: 'select',
  prop: 'id',
  list: [],
  // @ts-expect-error Search consumes ordinary options rather than plugin identifiers.
  dictionary: 'item-kind',
}
const plainColumn: TableColumn<Item> = {
  key: 'id',
  title: 'ID',
  // @ts-expect-error Tables do not resolve external data plugins.
  dictionary: 'item-kind',
}
const resource = useDataResource<string, Item[]>
const tabbed = useTabbedQuery({
  activeTab: 'sample',
  initialQuery: { count: 0 },
  request: async ({ query }) => ({
    data: [{ id: 'row', count: query.count }],
    total: 1,
  }),
})
const inferredTabRow: { id: string; count: number } | undefined =
  tabbed.data.value[0]
// @ts-expect-error The shared criteria keep their inferred field types.
void tabbed.setQuery({ count: 'wrong' })
const scope = useValidationScope
const rows = useFormArray<Item>
void [
  exact,
  patch,
  source,
  pickerProps,
  businessValue,
  resource,
  inferredTabRow,
  scope,
  rows,
  COMPONENT_LOCALE_KEY,
  plainForm,
  plainSearch,
  plainColumn,
]
