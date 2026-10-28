import {
  createNumberCodec,
  createBatchPatch,
  type DictionarySource,
} from '@robot-admin/naive-ui-components/data'
import {
  useDataResource,
  useValidationScope,
  useFormArray,
} from '@robot-admin/naive-ui-components/workflows'
import { DICTIONARY_PROVIDER_KEY } from '@robot-admin/naive-ui-components/config'
import type { DataPickerSource } from '@robot-admin/naive-ui-components/C_DataPicker'
import type { FormInstance } from '@robot-admin/naive-ui-components/C_Form'

interface Item {
  id: string
  count: number
  note: string | null
}
const exact: string | null = createNumberCodec({
  storage: 'decimal-string',
}).parse('9007199254740993.01')
const dictionary: DictionarySource = {
  getOptions: () => [{ value: false, label: 'No' }],
}
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
declare const form: FormInstance<Item>
form.revealField('server.returned.path')
const resource = useDataResource<string, Item[]>
const scope = useValidationScope
const rows = useFormArray<Item>
void [
  exact,
  dictionary,
  patch,
  source,
  resource,
  scope,
  rows,
  DICTIONARY_PROVIDER_KEY,
]
