import { describe, expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, shallowRef } from 'vue'
import { NSelect } from 'naive-ui'
import { DICTIONARY_PROVIDER_KEY } from '../../src/context'
import { useDictionaryOptions } from '../../src/composables/useDictionary'
import {
  encodeDictionaryControlValue,
  type DictionaryBinding,
  type DictionaryOption,
  type DictionarySource,
} from '../../src/core/dictionary'
import C_Form from '../../src/components/C_Form/index.vue'
import C_Table from '../../src/components/C_Table/index.vue'
import type {
  TableColumn,
  TableInstance,
} from '../../src/components/C_Table/types'

const exporter = vi.hoisted(() => ({ run: vi.fn() }))
vi.mock('../../src/components/C_Table/composables/useTableExport', () => ({
  exportTableData: exporter.run,
}))

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((ok, fail) => {
    resolve = ok
    reject = fail
  })
  return { promise, resolve, reject }
}

describe('字典视图生命周期', () => {
  test('替换绑定与卸载立即取消请求，迟到结果不能写回', async () => {
    const first = deferred<readonly DictionaryOption[]>()
    const second = deferred<readonly DictionaryOption[]>()
    const retry = deferred<readonly DictionaryOption[]>()
    let nextLoads = 0
    let firstSignal!: AbortSignal
    let secondSignal!: AbortSignal
    const oldSource: DictionarySource = {
      getOptions: () => [],
      load: ({ signal }) => {
        firstSignal = signal
        return first.promise
      },
    }
    const nextSource: DictionarySource = {
      getOptions: () => [],
      load: ({ signal }) => {
        secondSignal = signal
        return nextLoads++ === 0 ? second.promise : retry.promise
      },
    }
    const bindings = shallowRef(
      new Map<string, DictionaryBinding>([['status', oldSource]])
    )
    let view!: ReturnType<typeof useDictionaryOptions>
    const Host = defineComponent({
      setup() {
        view = useDictionaryOptions(bindings)
        return () => h('div', view.getLabel('status', 'A'))
      },
    })
    const wrapper = mount(Host)
    expect(firstSignal.aborted).toBe(false)
    bindings.value = new Map([['status', nextSource]])
    await flushPromises()
    expect(firstSignal.aborted).toBe(true)
    second.resolve([{ value: 'A', label: '新' }])
    await flushPromises()
    first.resolve([{ value: 'A', label: '旧' }])
    await flushPromises()
    expect(wrapper.text()).toBe('新')
    expect(view.isLoading('status')).toBe(false)
    const retrying = view.reload('status')
    wrapper.unmount()
    expect(secondSignal.aborted).toBe(true)
    retry.resolve([{ value: 'A', label: '卸载后到达' }])
    await retrying
    expect(view.getOptions('status')).toEqual([])
  })

  test('订阅发布的新版本优先于旧load结果，替换与销毁均释放订阅', async () => {
    let current: readonly DictionaryOption[] = [{ value: 0, label: '初始' }]
    const pending = deferred<readonly DictionaryOption[]>()
    let listener!: () => void
    const cleanup = vi.fn()
    const source: DictionarySource = {
      getOptions: () => current,
      load: () => pending.promise,
      subscribe: callback => {
        listener = callback
        return cleanup
      },
    }
    const bindings = shallowRef(
      new Map<string, DictionaryBinding>([['status', source]])
    )
    let view!: ReturnType<typeof useDictionaryOptions>
    const wrapper = mount(
      defineComponent({
        setup() {
          view = useDictionaryOptions(bindings)
          return () => h('div', view.getLabel('status', 0))
        },
      })
    )
    expect(wrapper.text()).toBe('初始')
    current = [{ value: 0, label: '推送新值' }]
    listener()
    pending.resolve([{ value: 0, label: '迟到旧值' }])
    await flushPromises()
    expect(wrapper.text()).toBe('推送新值')
    bindings.value = new Map()
    await flushPromises()
    expect(cleanup).toHaveBeenCalledTimes(1)
    listener()
    expect(view.getOptions('status')).toEqual([])
    wrapper.unmount()
    expect(cleanup).toHaveBeenCalledTimes(1)
  })

  test('失败保留已知快照，显式重试恢复，不创建第二份源缓存', async () => {
    const problem = new Error('offline')
    const report = vi.fn()
    const load = vi
      .fn()
      .mockRejectedValueOnce(problem)
      .mockResolvedValueOnce([{ value: false, label: '可用' }])
    let view!: ReturnType<typeof useDictionaryOptions>
    const source: DictionarySource = {
      getOptions: () => [{ value: false, label: '已有' }],
      load,
    }
    const wrapper = mount(
      defineComponent({
        setup() {
          view = useDictionaryOptions(() => new Map([['flag', source]]), {
            onError: report,
          })
          return () => h('div', view.getLabel('flag', false))
        },
      })
    )
    await flushPromises()
    expect(wrapper.text()).toBe('已有')
    expect(view.getError('flag')).toBe(problem)
    expect(report).toHaveBeenCalledWith(problem, 'flag')
    await view.reload('flag')
    await flushPromises()
    expect(wrapper.text()).toBe('可用')
    expect(view.getError('flag')).toBeUndefined()
    expect(load).toHaveBeenCalledTimes(2)
    wrapper.unmount()
  })
})

describe('Form / Table 共享应用字典', () => {
  const source: DictionarySource = {
    getOptions: () => [
      { value: false, label: '未启用' },
      { value: 0, label: '零状态' },
      { value: '001', label: '首状态' },
    ],
  }
  const provide = {
    [DICTIONARY_PROVIDER_KEY as symbol]: {
      getDictionary: (name: string) => (name === 'status' ? source : undefined),
    },
  }

  test('表单字典选项展示标签但模型保持0/false/001，未配置字段不改行为', async () => {
    const wrapper = mount(C_Form, {
      global: { provide },
      props: {
        options: [{ type: 'select', prop: 'status', dictionary: 'status' }],
        modelValue: { status: false },
        config: { showActions: false },
      },
    })
    await flushPromises()
    const select = wrapper.findComponent(NSelect)
    expect(
      select
        .props('options')!
        .map(option => ('label' in option ? option.label : undefined))
    ).toEqual(['未启用', '零状态', '首状态'])
    expect(wrapper.text()).toContain('未启用')
    select.vm.$emit('update:value', encodeDictionaryControlValue(0))
    await flushPromises()
    expect(wrapper.emitted('update:modelValue')!.at(-1)![0]).toEqual({
      status: 0,
    })
    select.vm.$emit('update:value', encodeDictionaryControlValue('001'))
    await flushPromises()
    expect(wrapper.emitted('update:modelValue')!.at(-1)![0]).toEqual({
      status: '001',
    })
    wrapper.unmount()
  })

  test('显式children含空数组优先，覆盖时不加载字典；asyncOptions维持原优先级', async () => {
    const load = vi.fn(async () => [{ value: 'server', label: '远程' }])
    const dictionary: DictionarySource = { getOptions: () => [], load }
    const wrapper = mount(C_Form, {
      props: {
        options: [{ type: 'select', prop: 'status', children: [], dictionary }],
        config: { showActions: false },
      },
    })
    await flushPromises()
    expect(load).not.toHaveBeenCalled()
    expect(wrapper.findComponent(NSelect).props('options')).toEqual([])
    await wrapper.setProps({
      options: [
        {
          type: 'select',
          prop: 'status',
          dictionary,
          asyncOptions: async () => [{ value: 'async', label: '显式异步' }],
        },
      ],
    })
    await flushPromises()
    expect(wrapper.findComponent(NSelect).props('options')).toEqual([
      { value: 'async', label: '显式异步' },
    ])
    expect(load).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  test('表格显示和编辑使用同一源，显式render/formatter保留优先级', async () => {
    const wrapper = mount(C_Table, {
      global: { provide },
      props: {
        data: [{ id: 1, status: false, formatted: false, custom: false }],
        columns: [
          {
            key: 'status',
            title: '状态',
            dictionary: 'status',
            editable: true,
          },
          {
            key: 'formatted',
            title: '格式',
            dictionary: 'status',
            formatter: { type: 'enum', fn: () => '显式格式' },
          },
          {
            key: 'custom',
            title: '自定义',
            dictionary: 'status',
            render: () => h('strong', '显式渲染'),
          },
        ],
        config: {
          pagination: false,
          edit: { mode: 'cell' },
          toolbar: { show: false },
        },
      },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('未启用')
    expect(wrapper.text()).toContain('显式格式')
    expect(wrapper.text()).toContain('显式渲染')
    await wrapper.find('.cell-edit-icon').trigger('click')
    await flushPromises()
    const select = wrapper.findComponent(NSelect)
    expect(select.exists()).toBe(true)
    expect(select.props('value')).toBe(encodeDictionaryControlValue(false))
    select.vm.$emit('update:value', encodeDictionaryControlValue('001'))
    await flushPromises()
    await wrapper.find('.cell-action-save').trigger('click')
    await flushPromises()
    const updates = wrapper.emitted('update:data')
    expect(updates?.at(-1)?.[0]).toEqual([
      { id: 1, status: '001', formatted: false, custom: false },
    ])
    wrapper.unmount()
  })

  test('表格导出沿用同一字典快照与原始编码，显式formatter优先', async () => {
    const explicit = { type: 'enum' as const, fn: () => '自定义导出' }
    const wrapper = mount(C_Table, {
      global: { provide },
      props: {
        data: [{ id: 1, status: false, formatted: 0 }],
        columns: [
          { key: 'status', title: '状态', dictionary: 'status' },
          {
            key: 'formatted',
            title: '自定义',
            dictionary: 'status',
            formatter: explicit,
          },
        ],
        config: { toolbar: { show: false }, pagination: false },
      },
    })
    await flushPromises()
    await (wrapper.vm as unknown as TableInstance).exportData()
    const [rows, columns] = exporter.run.mock.calls.at(-1)! as [
      unknown[],
      TableColumn[],
    ]
    expect(rows).toEqual([{ id: 1, status: false, formatted: 0 }])
    expect(columns[0]!.formatter!.fn!(false, {})).toBe('未启用')
    expect(columns[0]!.formatter!.fn!('UNKNOWN', {})).toBe('UNKNOWN')
    expect(columns[1]!.formatter!.fn).toBe(explicit.fn)
    wrapper.unmount()
  })

  test('同名字典在不同应用Provider中隔离，不使用进程全局解析器', async () => {
    const formProps = {
      options: [{ type: 'select', prop: 'status', dictionary: 'status' }],
      modelValue: { status: false },
      config: { showActions: false },
    }
    const first = mount(C_Form, { props: formProps, global: { provide } })
    const second = mount(C_Form, {
      props: formProps,
      global: {
        provide: {
          [DICTIONARY_PROVIDER_KEY as symbol]: {
            getDictionary: () => ({
              getOptions: () => [{ value: false, label: '另一个应用' }],
            }),
          },
        },
      },
    })
    await flushPromises()
    expect(first.text()).toContain('未启用')
    expect(second.text()).toContain('另一个应用')
    expect(first.text()).not.toContain('另一个应用')
    first.unmount()
    second.unmount()
  })
})
