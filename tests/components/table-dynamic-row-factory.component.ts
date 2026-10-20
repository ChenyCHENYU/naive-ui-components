import { expect, test } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import C_Table from '../../src/components/C_Table/index.vue'
import type { TableInstance } from '../../src/components/C_Table/types'

interface Employee {
  id: number
  name: string
}
const quiet = {
  success: () => undefined,
  warning: () => undefined,
  error: () => undefined,
}

test('typed table creation events preserve numeric factory identities and copy business values', async () => {
  let id = 0
  const source: Employee[] = [{ id: 1, name: 'Original' }]
  const wrapper = mount(C_Table<Employee>, {
    props: {
      data: source,
      columns: [{ key: 'name', title: 'Name' }],
      config: {
        toolbar: { show: false },
        pagination: false,
        feedback: quiet,
        dynamicRows: {
          defaultRowData: () => ({ id: id++ === 0 ? 0 : 2, name: 'New' }),
        },
      },
    },
  })
  const api = wrapper.vm as unknown as TableInstance<Employee>
  api.addRow()
  expect(wrapper.emitted('row-add')).toEqual([[{ id: 0, name: 'New' }]])
  await wrapper.get('input[type="radio"]').setValue(true)
  api.copyRow()
  expect(wrapper.emitted('row-copy')).toEqual([
    [source[0], { id: 2, name: 'Original' }],
  ])
  expect(source).toEqual([{ id: 1, name: 'Original' }])
  wrapper.unmount()
})

test('disabled dynamic configuration never invokes the factory or emits creation changes', async () => {
  let calls = 0
  const wrapper = mount(C_Table<Employee>, {
    props: {
      data: [{ id: 1, name: 'Original' }],
      columns: [{ key: 'name', title: 'Name' }],
      config: {
        toolbar: { show: false },
        pagination: false,
        feedback: quiet,
        dynamicRows: {
          enabled: false,
          defaultRowData: () => {
            calls++
            return { id: 2, name: 'New' }
          },
        },
      },
    },
  })
  const api = wrapper.vm as unknown as TableInstance<Employee>
  api.addRow()
  api.insertRow()
  api.copyRow()
  await flushPromises()
  expect(calls).toBe(0)
  expect(wrapper.emitted('row-add')).toBeUndefined()
  expect(wrapper.emitted('row-copy')).toBeUndefined()
  expect(wrapper.emitted('update:data')).toBeUndefined()
  wrapper.unmount()
})
