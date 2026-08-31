import {
  defineFormConfig,
  defineFormOptions,
  type FieldPath,
  type FormInstance,
} from '../src/components/C_Form'
import {
  defineTableColumns,
  defineTableConfig,
  type TableInstance,
} from '../src/components/C_Table'

interface UserModel {
  id: string
  profile: {
    name: string
    age: number
  }
  contacts: Array<{ email: string }>
}

const formOptions = defineFormOptions<UserModel>([
  { type: 'input', prop: 'profile.name' },
  { type: 'inputNumber', prop: 'profile.age' },
  { type: 'input', prop: 'contacts.0.email' },
])
const formConfig = defineFormConfig<UserModel>({
  onSubmit: payload => {
    payload.model.profile.name.toUpperCase()
  },
})
declare const form: FormInstance<UserModel>
void form.setFieldValue('profile.age', 18)
void form.setFieldValue('contacts.0.email', 'ada@example.com')
type UserField = FieldPath<UserModel>
const field: UserField = 'profile.name'

const columns = defineTableColumns<UserModel>([
  { key: 'id', title: 'ID' },
  { key: 'profile', title: 'Profile' },
])
const tableConfig = defineTableConfig<UserModel>({
  edit: {
    onSave: row => {
      row.profile.name.toUpperCase()
    },
  },
  batchActions: {
    actions: [
      {
        key: 'archive',
        label: 'Archive',
        onClick: (_keys, rows) => {
          rows.map(row => row.id)
        },
      },
    ],
  },
})
declare const table: TableInstance<UserModel>
table.getSelectedRows().map(row => row.profile.age)

// @ts-expect-error unknown form field must be rejected
defineFormOptions<UserModel>([{ type: 'input', prop: 'profile.missing' }])
// @ts-expect-error wrong nested field value must be rejected
void form.setFieldValue('profile.age', '18')
// @ts-expect-error misspelled table field must be rejected
defineTableColumns<UserModel>([{ key: 'displayName', title: 'Name' }])

void [formOptions, formConfig, field, columns, tableConfig, form, table]
