/** 真实业务契约的组合回归：验证公开组件入口，不导入或执行 WL 平台运行时。 */
import { afterEach, expect, test, vi } from 'vitest'
import { effectScope, defineComponent, h } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { NButton, NInput, NPagination } from 'naive-ui'
import {
  useProductionParity,
  useQualityParity,
  createMaterialSource,
  materialColumns,
  materialNavigation,
  operatorRows,
  operatorSource,
  operatorOrganization,
  type ProductionApi,
  type HeatRow,
  type SlabRow,
  type MaterialApi,
  type Material,
  type MaterialFilters,
  type Operator,
  type OperatorFilters,
  type MeasurementRow,
} from '../../dev/search-workflows/business-scenarios-data'
import C_DataPicker from '../../src/components/C_DataPicker/index.vue'
import C_UserPicker from '../../src/components/C_UserPicker/index.vue'
import C_Tree from '../../src/components/C_Tree/index.vue'
import C_Table from '../../src/components/C_Table/index.vue'
import C_FormSearch from '../../src/components/C_FormSearch/index.vue'
import type { TableInstance } from '../../src/components/C_Table/types'

function pending<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: Error) => void
  const promise = new Promise<T>((accept, decline) => {
    resolve = accept
    reject = decline
  })
  return { promise, resolve, reject }
}
afterEach(() => vi.useRealTimers())
const settle = async () => {
  await flushPromises()
  await flushPromises()
}
const button = (wrapper: ReturnType<typeof mount>, label: string) => {
  const found = wrapper
    .findAllComponents(NButton)
    .find(item => item.text() === label)
  if (!found) throw new Error(`Missing button ${label}`)
  return found
}

test('same order number with distinct line IDs owns independent children and ignores late responses after switching or clearing', async () => {
  const requests: Array<{
    key: string
    signal: AbortSignal
    bound: ReturnType<typeof pending<{ data: HeatRow[] }>>
    slabs: ReturnType<typeof pending<{ data: SlabRow[] }>>
  }> = []
  const api: ProductionApi = {
    bound(order, signal) {
      const request = {
        key: order.id,
        signal,
        bound: pending<{ data: HeatRow[] }>(),
        slabs: pending<{ data: SlabRow[] }>(),
      }
      requests.push(request)
      return request.bound.promise
    },
    candidates(order) {
      return requests.filter(item => item.key === order.id).at(-1)!.slabs
        .promise
    },
  }
  const scope = effectScope()
  const page = scope.run(() => useProductionParity(api))!
  page.selected = 'pool-1'
  page.selected = 'pool-2'
  expect(requests[0].signal.aborted).toBe(true)
  requests[1].bound.resolve({
    data: [{ id: 'second-lock', heatNo: 'H-02', billetQty: 3 }],
  })
  requests[1].slabs.resolve({
    data: [{ matNo: 'second-mat', heatNo: 'H-02', billetQty: 4 }],
  })
  requests[0].bound.resolve({
    data: [{ id: 'old-lock', heatNo: 'H-01', billetQty: 99 }],
  })
  requests[0].slabs.resolve({ data: [] })
  await settle()
  expect(page.bound.data?.[0].id).toBe('second-lock')
  expect(page.slabs.data?.[0].matNo).toBe('second-mat')
  page.selected = 'pool-1'
  page.selected = null
  requests[2].bound.resolve({
    data: [{ id: 'after-clear', heatNo: 'H-01', billetQty: 1 }],
  })
  requests[2].slabs.resolve({
    data: [{ matNo: 'after-clear', heatNo: 'H-01', billetQty: 1 }],
  })
  await settle()
  expect(page.bound.data).toBeUndefined()
  expect(page.slabs.data).toBeUndefined()
  expect(page.bound.status).toBe('idle')
  scope.stop()
})

test('one child failure can retry independently while the other child stays available', async () => {
  let fails = true
  const api: ProductionApi = {
    bound: vi.fn(async () => {
      if (fails) throw new Error('network')
      return { data: [{ id: 'lock', heatNo: 'H-01', billetQty: 3 }] }
    }),
    candidates: vi.fn(async () => ({
      data: [{ matNo: 'mat', heatNo: 'H-01', billetQty: 5 }],
    })),
  }
  const scope = effectScope()
  const page = scope.run(() => useProductionParity(api))!
  page.selected = 'pool-1'
  await settle()
  expect(page.bound.status).toBe('error')
  expect(page.slabs.status).toBe('ready')
  fails = false
  expect(await page.bound.reload()).toBe(true)
  expect(page.bound.data?.[0].id).toBe('lock')
  expect(api.candidates).toHaveBeenCalledTimes(1)
  scope.stop()
})

test('quality device columns retain sample drafts, stable row identities and exact string values in immutable submission snapshots', () => {
  const page = useQualityParity()
  const originalId = page.matrix['04'][0].id
  page.matrix['04'][0].S = ' 0 '
  page.matrix['04'][0].C = '0.01000'
  page.matrix['02'][0].Mn = '   '
  page.append('04')
  page.matrix['04'][1].C = 'ND'
  page.integrate()
  expect(
    page.results.map(({ parentId, deviceNo, elementCode, testRst }) => ({
      parentId,
      deviceNo,
      elementCode,
      testRst,
    }))
  ).toEqual([
    { parentId: 'sample-1', deviceNo: '04', elementCode: 'S', testRst: '0' },
    {
      parentId: 'sample-1',
      deviceNo: '04',
      elementCode: 'C',
      testRst: '0.01000',
    },
    { parentId: 'sample-1', deviceNo: '04', elementCode: 'C', testRst: 'ND' },
  ])
  page.matrix['04'][0].C = '0.02'
  expect(page.results[1].testRst).toBe('0.01000')
  page.selectSample('sample-2')
  expect(page.matrix['04'][0].C).toBe('')
  expect(page.results).toEqual([])
  page.matrix['06'][0].N = '0.003'
  page.selectSample('sample-1')
  expect(page.matrix['04'][0]).toMatchObject({ id: originalId, C: '0.02' })
  expect(page.matrix['06'][0].N).toBe('')
  page.remove('04')
  page.remove('04')
  expect(page.matrix['04']).toHaveLength(1)
  expect(page.matrix['04'][0].id).toBe(originalId)
})

test('continuous quality inputs retain both edits, the active sample and exact integrated values', async () => {
  const page = useQualityParity()
  const Host = defineComponent({
    setup: () => () =>
      h(C_Table<MeasurementRow>, {
        key: page.selected,
        data: page.matrix['04'],
        columns: page.columns['04'],
        config: { edit: 'inline', pagination: false, toolbar: { show: false } },
        'onUpdate:data': (rows: MeasurementRow[]) => {
          page.matrix['04'] = rows
        },
      }),
  })
  const wrapper = mount(Host)
  const inputs = wrapper.findAllComponents(NInput)
  expect(inputs).toHaveLength(2)
  inputs[0].vm.$emit('update:value', '0.00000')
  inputs[1].vm.$emit('update:value', '0.01000')
  await settle()
  page.integrate()
  expect(page.results).toMatchObject([
    {
      parentId: 'sample-1',
      deviceNo: '04',
      elementCode: 'S',
      testRst: '0.00000',
    },
    {
      parentId: 'sample-1',
      deviceNo: '04',
      elementCode: 'C',
      testRst: '0.01000',
    },
  ])
  page.selectSample('sample-2')
  await settle()
  expect(
    wrapper.findAllComponents(NInput).map(input => input.props('value'))
  ).toEqual(['', ''])
  page.selectSample('sample-1')
  await settle()
  expect(
    wrapper.findAllComponents(NInput).map(input => input.props('value'))
  ).toEqual(['0.00000', '0.01000'])
  wrapper.unmount()
})

test('material boundary maps only the documented current/size and data.records protocol', async () => {
  const api: MaterialApi = {
    list: vi.fn(async () => ({ data: { records: [], total: 0 } })),
    resolve: vi.fn(async () => []),
  }
  const source = createMaterialSource(api)
  const { signal } = new AbortController()
  expect(
    await source.request({
      search: '',
      page: 3,
      pageSize: 20,
      filters: {
        matlCategoryId: 'steel',
        matlNo: 'M-',
        specification: 'Φ20',
        status: '1',
      },
      signal,
    })
  ).toEqual({ rows: [], total: 0 })
  expect(api.list).toHaveBeenCalledWith(
    {
      current: 3,
      size: 20,
      matlCategoryId: 'steel',
      matlNo: 'M-',
      specification: 'Φ20',
      status: '1',
    },
    signal
  )
})

test('material category, paging, fixed status and cancel/confirm share the actual picker session', async () => {
  vi.useFakeTimers()
  const wrapper = mount(C_DataPicker<Material, MaterialFilters>, {
    props: {
      source: createMaterialSource(),
      columns: materialColumns,
      navigation: materialNavigation,
      modelValue: 'material-1',
      fixedFilters: { status: '1' },
      pageSize: 2,
      requireSelection: true,
    },
  })
  await wrapper.get('.c-data-picker__open').trigger('click')
  await vi.advanceTimersByTimeAsync(120)
  await settle()
  await wrapper
    .getComponent(C_Tree)
    .findAll('.n-tree-node-content')[1]
    .trigger('click')
  await vi.advanceTimersByTimeAsync(120)
  await settle()
  const table = wrapper.getComponent(C_Table)
    .vm as unknown as TableInstance<Material>
  expect(
    wrapper
      .getComponent({ name: 'C_Table' })
      .props('data')
      .map((row: Material) => row.id)
  ).toEqual(['material-5', 'material-6'])
  table.selectRow('material-5')
  await settle()
  await button(wrapper, '取消').trigger('click')
  expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  await wrapper.get('.c-data-picker__open').trigger('click')
  await vi.advanceTimersByTimeAsync(120)
  await settle()
  wrapper.getComponent(NPagination).vm.$emit('update:page', 2)
  await vi.advanceTimersByTimeAsync(120)
  await settle()
  const secondTable = wrapper.getComponent(C_Table)
    .vm as unknown as TableInstance<Material>
  secondTable.selectRow('material-3')
  await settle()
  const confirmation = wrapper.vm.confirm()
  await vi.advanceTimersByTimeAsync(120)
  expect(await confirmation).toBe(true)
  expect(wrapper.emitted('update:modelValue')).toEqual([['material-3']])
  wrapper.unmount()
})

test('material form search and reset retain the category; cancel/reopen resets both the form draft and the list', async () => {
  vi.useFakeTimers()
  const source = createMaterialSource()
  source.request = vi.fn(source.request)
  const initialValues: MaterialFilters = {
    matlNo: '',
    materialName: '',
    specification: '',
  }
  const wrapper = mount(C_DataPicker<Material, MaterialFilters>, {
    props: {
      source,
      columns: materialColumns,
      navigation: materialNavigation,
      initialValues,
      fixedFilters: { status: '1' },
      pageSize: 2,
    },
    slots: {
      query: ({
        initialValues: baseline,
        submit,
      }: {
        initialValues: MaterialFilters | undefined
        submit: (filters: MaterialFilters) => void
      }) =>
        h(C_FormSearch<MaterialFilters>, {
          modelValue: baseline ?? initialValues,
          formItemList: [{ type: 'input', prop: 'matlNo', label: '物料编码' }],
          config: { onSearch: submit, searchOnReset: true },
        }),
    },
  })
  await wrapper.get('.c-data-picker__open').trigger('click')
  await vi.advanceTimersByTimeAsync(120)
  await settle()
  await wrapper
    .getComponent(C_Tree)
    .findAll('.n-tree-node-content')[1]
    .trigger('click')
  await vi.advanceTimersByTimeAsync(120)
  await settle()
  const search = wrapper.getComponent(C_FormSearch)
  await search.get('input').setValue('M-5')
  await search.get('form').trigger('submit')
  await vi.advanceTimersByTimeAsync(120)
  await settle()
  expect(source.request).toHaveBeenLastCalledWith(
    expect.objectContaining({
      filters: {
        matlNo: 'M-5',
        materialName: '',
        specification: '',
        matlCategoryId: 'alloy',
        status: '1',
      },
    })
  )
  expect(
    wrapper
      .getComponent({ name: 'C_Table' })
      .props('data')
      .map((row: Material) => row.id)
  ).toEqual(['material-5'])
  await search.get('[aria-label="重置"]').trigger('click')
  await vi.advanceTimersByTimeAsync(120)
  await settle()
  expect(
    wrapper
      .getComponent({ name: 'C_Table' })
      .props('data')
      .map((row: Material) => row.id)
  ).toEqual(['material-5', 'material-6'])
  await search.get('input').setValue('M-6')
  await search.get('form').trigger('submit')
  await vi.advanceTimersByTimeAsync(120)
  await settle()
  await button(wrapper, '取消').trigger('click')
  await wrapper.get('.c-data-picker__open').trigger('click')
  await vi.advanceTimersByTimeAsync(120)
  await settle()
  expect(wrapper.getComponent(C_FormSearch).get('input').element.value).toBe('')
  expect(
    wrapper
      .getComponent({ name: 'C_Table' })
      .props('data')
      .map((row: Material) => row.id)
  ).toEqual(['material-1', 'material-2'])
  expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  wrapper.unmount()
})

test('organization selection filters candidates while duplicate names commit distinct business user numbers', async () => {
  vi.useFakeTimers()
  const wrapper = mount(
    C_UserPicker<
      Operator,
      OperatorFilters,
      { id: string; name: string },
      false,
      string
    >,
    {
      props: {
        source: operatorSource,
        organization: operatorOrganization,
        modelValue: 'U001',
        requireSelection: true,
        fields: { code: 'userNo', department: 'departmentName' },
        pageSize: 2,
      },
    }
  )
  await wrapper.get('.c-data-picker__open').trigger('click')
  await vi.advanceTimersByTimeAsync(120)
  await settle()
  wrapper
    .getComponent(C_Tree)
    .vm.$emit('node-select', { id: 'rolling', name: '轧钢班组' }, ['rolling'])
  await vi.advanceTimersByTimeAsync(120)
  await settle()
  expect(wrapper.getComponent({ name: 'C_Table' }).props('data')).toEqual([
    operatorRows[1],
  ])
  const table = wrapper.getComponent(C_Table)
    .vm as unknown as TableInstance<Operator>
  table.selectRow(1)
  await settle()
  const confirmation = wrapper.vm.confirm()
  await vi.advanceTimersByTimeAsync(120)
  expect(await confirmation).toBe(true)
  expect(wrapper.emitted('update:modelValue')).toEqual([['U002']])
  expect(wrapper.emitted('select')).toEqual([[[operatorRows[1]]]])
  wrapper.unmount()
})
