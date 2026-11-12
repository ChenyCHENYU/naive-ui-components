import { createApp, h } from 'vue'
import { C_Select } from '@robot-admin/naive-ui-components/C_Select'
import { C_AutoComplete } from '@robot-admin/naive-ui-components/C_AutoComplete'
import { C_DataPicker } from '@robot-admin/naive-ui-components/C_DataPicker'
import { C_Form } from '@robot-admin/naive-ui-components/C_Form'
import { C_FormSearch } from '@robot-admin/naive-ui-components/C_FormSearch'
import { C_Tree } from '@robot-admin/naive-ui-components/C_Tree'
import { C_Table } from '@robot-admin/naive-ui-components/C_Table'
import '@robot-admin/naive-ui-components/C_Select/style.css'
import '@robot-admin/naive-ui-components/C_AutoComplete/style.css'
import '@robot-admin/naive-ui-components/C_DataPicker/style.css'
import '@robot-admin/naive-ui-components/C_Form/style.css'
import '@robot-admin/naive-ui-components/C_FormSearch/style.css'
import '@robot-admin/naive-ui-components/C_Tree/style.css'
import '@robot-admin/naive-ui-components/C_Table/style.css'

const rows = [{ id: 0, name: 'Consumer', code: '001' }]
const source = {
  value: row => row.id,
  label: row => row.name,
  request: async () => ({ rows, total: rows.length }),
  resolve: async values => rows.filter(row => values.includes(row.id)),
}
createApp({
  render: () =>
    h('main', [
      h(C_Tree, {
        data: [{ key: 0, label: 'Root', isLeaf: false }],
        checkable: true,
        searchSource: {
          request: async () => [
            [
              { key: 0, label: 'Root', isLeaf: false },
              { key: 1, label: 'Leaf', isLeaf: true },
            ],
          ],
        },
      }),
      h(C_Table, {
        data: rows,
        columns: [
          {
            type: 'group',
            title: 'Details',
            children: [{ key: 'name', title: 'Name' }],
          },
        ],
        config: { pagination: false },
      }),
      h(C_Select, { source, modelValue: 0 }),
      h(C_AutoComplete, {
        source,
        modelValue: '',
        renderLabel: row => h('span', [row.name, h('small', row.code)]),
      }),
      h(C_DataPicker, {
        source: { ...source, rowKey: 'id' },
        columns: [{ key: 'name', title: 'Name' }],
        presentation: 'popover',
      }),
      h(C_Form, {
        modelValue: { customer: null, note: '' },
        options: [
          { type: 'select', prop: 'customer', source },
          { type: 'autocomplete', prop: 'note', source },
        ],
      }),
      h(C_FormSearch, {
        modelValue: { customer: null, note: '' },
        formItemList: [
          { type: 'select', prop: 'customer', source },
          { type: 'autocomplete', prop: 'note', source },
        ],
      }),
    ]),
}).mount('#app')
