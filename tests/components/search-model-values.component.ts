import { expect, test, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { NInput, NSelect, NDatePicker } from 'naive-ui'
import FormSearchComponent from '../../src/components/C_FormSearch/index.vue'
import type {
  SearchFormItem,
  SearchFormParams,
} from '../../src/components/C_FormSearch/types'
import type { SearchDateRangeValue } from '../../src/components/C_FormSearch/dateRange'

interface Query {
  keyword: string
  roles: string[]
  enabled: boolean | null
  period: SearchDateRangeValue
  tenantId: string
  pageNum: number
}
const Search = FormSearchComponent<Query>
const fields: SearchFormItem<Query>[] = [
  { type: 'input', prop: 'keyword' },
  {
    type: 'input',
    prop: 'tenantId',
    show: false,
    defaultValue: 'fallback-tenant',
  },
  {
    type: 'select',
    prop: 'roles',
    attrs: { multiple: true },
    list: [{ label: '管理员', value: 'admin' }],
  },
  { type: 'select', prop: 'enabled', list: [{ label: '可用', value: true }] },
  { type: 'date-range', prop: 'period' },
]

test('typed search reset retains string, array and nullable controls and preserves hidden context', async () => {
  const onReset = vi.fn((query: Query) => {
    query.keyword.trim()
    query.roles.map(role => role.toUpperCase())
  })
  const onSearch = vi.fn((query: Query) =>
    Promise.resolve(query.roles.map(role => role.toUpperCase()))
  )
  const wrapper = mount(Search, {
    props: {
      modelValue: {
        keyword: 'old',
        roles: ['admin'],
        enabled: true,
        period: [100, 200],
        tenantId: 'tenant-a',
        pageNum: 3,
      },
      formItemList: fields,
      config: { requireValue: false, onSearch },
      onReset,
    },
  })
  wrapper.vm.cleanFn()
  const expected: Query = {
    keyword: '',
    roles: [],
    enabled: null,
    period: null,
    tenantId: 'tenant-a',
    pageNum: 3,
  }
  expect(wrapper.vm.formParams).toEqual(expected)
  expect(onReset).toHaveBeenCalledExactlyOnceWith(expected)
  expect(await wrapper.vm.searchFn()).toBe(true)
  expect(onSearch).toHaveBeenCalledWith(expected)
  wrapper.unmount()
})

test('native clear events keep text and multiple selections in their declared model shapes', async () => {
  const wrapper = mount(Search, {
    props: {
      modelValue: {
        keyword: 'old',
        roles: ['admin'],
        enabled: true,
        period: [100, 200],
        tenantId: 'tenant-a',
        pageNum: 3,
      },
      formItemList: fields,
    },
  })
  wrapper.getComponent(NInput).vm.$emit('update:value', '')
  const [roles, enabled] = wrapper.findAllComponents(NSelect)
  roles.vm.$emit('update:value', null, null)
  enabled.vm.$emit('update:value', null, null)
  await vi.waitFor(() =>
    expect(wrapper.findComponent(NDatePicker).exists()).toBe(true)
  )
  wrapper.getComponent(NDatePicker).vm.$emit('update:value', null, null)
  await flushPromises()
  expect(wrapper.vm.formParams).toEqual({
    keyword: '',
    roles: [],
    enabled: null,
    period: null,
    tenantId: 'tenant-a',
    pageNum: 3,
  })
  wrapper.unmount()
})

test('nonnullable select uses its explicit default when reset or an unexpected native clear occurs', async () => {
  interface RequiredQuery {
    enabled: boolean
  }
  const RequiredSearch = FormSearchComponent<RequiredQuery>
  const wrapper = mount(RequiredSearch, {
    props: {
      modelValue: { enabled: true },
      formItemList: [
        {
          type: 'select',
          prop: 'enabled',
          attrs: { clearable: false },
          defaultValue: false,
          list: [{ label: '停用', value: false }],
        },
      ],
    },
  })
  wrapper.getComponent(NSelect).vm.$emit('update:value', null, null)
  expect(wrapper.vm.formParams.enabled).toBe(false)
  await wrapper.setProps({ modelValue: { enabled: true } })
  wrapper.vm.cleanFn()
  expect(wrapper.vm.formParams.enabled).toBe(false)
  wrapper.unmount()
})

test('legacy dynamic search still supports omitted initial models with control-specific defaults', async () => {
  const DynamicSearch = FormSearchComponent<SearchFormParams>
  const wrapper = mount(DynamicSearch, {
    props: {
      formItemList: [
        { type: 'input', prop: 'keyword' },
        { type: 'input', prop: 'hidden', show: false },
        { type: 'select', prop: 'roles', attrs: { multiple: true } },
        { type: 'select', prop: 'enabled' },
      ],
    },
  })
  expect(wrapper.vm.formParams).toEqual({
    keyword: '',
    roles: [],
    enabled: null,
  })
  wrapper.vm.cleanFn()
  expect(wrapper.vm.formParams).toEqual({
    keyword: '',
    roles: [],
    enabled: null,
  })
  wrapper.unmount()
})
