/* eslint-disable @typescript-eslint/no-require-imports -- Verify real published CJS workspace contracts. */
import Data = require('@robot-admin/naive-ui-components/data')
import Workflows = require('@robot-admin/naive-ui-components/workflows')
import Picker = require('@robot-admin/naive-ui-components/C_DataPicker')
import Config = require('@robot-admin/naive-ui-components/config')

interface Item {
  id: string
  count: number
  note: string | null
}
const exact: string | null = Data.createNumberCodec({
  storage: 'decimal-string',
}).parse('9007199254740993.01')
const patch = Data.createBatchPatch<Item>([
  { field: 'note', operation: 'clear' },
])
Data.createBatchPatch<Item>([
  // @ts-expect-error Assignments preserve the actual field type.
  { field: 'count', operation: 'set', value: 'wrong' },
])
const source: Picker.DataPickerSource<Item> = {
  rowKey: 'id',
  value: row => row.id,
  label: row => row.id,
  request: async () => ({ rows: [], total: 0 }),
}
void [
  exact,
  patch,
  source,
  Workflows.useDataResource,
  Workflows.useValidationScope,
  Config.DICTIONARY_PROVIDER_KEY,
]
