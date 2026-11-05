import { describe, expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, KeepAlive, nextTick, ref } from 'vue'
import { NButton, NPagination, NSelect, NTag, NModal, NInput } from 'naive-ui'
import { FORM_GLOBAL_CONFIG_KEY } from '../../src/context'
import C_DataPicker from '../../src/components/C_DataPicker/index.vue'
import C_BatchResult from '../../src/components/C_BatchResult/index.vue'
import C_Table from '../../src/components/C_Table/index.vue'
import type { DataPickerSource } from '../../src/components/C_DataPicker/types'
import type {
  TableColumn,
  TableInstance,
} from '../../src/components/C_Table/types'
import type { BatchOperationResult } from '../../src/core/batchPatch'

interface Row {
  id: string
  code: number
  name: string
}
const allRows: Row[] = [
  { id: 'r0', code: 0, name: '客户零' },
  { id: 'r1', code: 1, name: '客户一' },
  { id: 'r2', code: 2, name: '客户二' },
]
const columns: TableColumn<Row>[] = [{ key: 'name', title: '客户名称' }]

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(finish => {
    resolve = finish
  })
  return { promise, resolve }
}

function button(wrapper: ReturnType<typeof mount>, label: string) {
  const result = wrapper
    .findAllComponents(NButton)
    .find(item => item.text() === label)
  if (!result) throw new Error(`未找到按钮 ${label}`)
  return result
}

function tableData(wrapper: ReturnType<typeof mount>): unknown[] {
  return wrapper.getComponent({ name: 'C_Table' }).props('data') as unknown[]
}

function createSource(): DataPickerSource<Row> {
  return {
    rowKey: 'id',
    value: row => row.code,
    label: row => row.name,
    request: vi.fn(async ({ page, pageSize }) => ({
      rows: allRows.slice((page - 1) * pageSize, page * pageSize),
      total: allRows.length,
    })),
    resolve: vi.fn(async values =>
      allRows.filter(row => values.includes(row.code))
    ),
  }
}

describe('C_DataPicker远程选择会话', () => {
  test('内嵌会话不挂载第二个弹窗，Enter 只查询候选项，Escape 取消并归还焦点', async () => {
    const source = createSource()
    const parentSubmit = vi.fn((event: Event) => event.preventDefault())
    const parentKeydown = vi.fn()
    const Host = defineComponent(
      () => () =>
        h('form', { onSubmit: parentSubmit, onKeydown: parentKeydown }, [
          h(C_DataPicker<Row>, { source, columns, presentation: 'inline' }),
        ])
    )
    const wrapper = mount(Host, { attachTo: document.body })
    try {
      const picker = wrapper.getComponent(C_DataPicker<Row>)
      const trigger = wrapper.get<HTMLButtonElement>('.c-data-picker__open')
      trigger.element.focus()
      await trigger.trigger('click')
      await flushPromises()
      expect(wrapper.findAll('form')).toHaveLength(1)
      expect(picker.findComponent(NModal).exists()).toBe(false)
      const panel = picker.get('[role="region"]')
      expect(trigger.attributes('aria-expanded')).toBe('true')
      expect(trigger.attributes('aria-controls')).toBe(panel.attributes('id'))
      const input = panel.get('input[aria-label="搜索候选数据"]')
      expect(document.activeElement).toBe(input.element)
      await input.setValue('客户')
      await input.trigger('keydown', { key: 'Enter' })
      await flushPromises()
      expect(source.request).toHaveBeenLastCalledWith({
        page: 1,
        pageSize: 20,
        search: '客户',
        signal: expect.any(AbortSignal),
      })
      expect(parentSubmit).not.toHaveBeenCalled()
      expect(parentKeydown).not.toHaveBeenCalled()
      await input.trigger('keydown', { key: 'Escape' })
      expect(trigger.attributes('aria-expanded')).toBe('false')
      expect(document.activeElement).toBe(trigger.element)
      expect(picker.emitted('select')).toBeUndefined()
      expect(parentKeydown).not.toHaveBeenCalled()
    } finally {
      wrapper.unmount()
    }
  })

  test('类型化条件随分页保持，重新查询回第一页，上下文切换废弃旧请求与草稿', async () => {
    interface Filters {
      organization: string
      name: string
      enabled: boolean | null
    }
    const oldRequest = deferred<{ rows: Row[]; total: number }>()
    const request = vi.fn<DataPickerSource<Row, Filters>['request']>(query => {
      if (query.filters?.name === '旧查询') return oldRequest.promise
      return Promise.resolve({
        rows: [allRows[query.page - 1]!],
        total: allRows.length,
      })
    })
    const source: DataPickerSource<Row, Filters> = {
      ...createSource(),
      request,
    }
    const initialValues: Filters = {
      organization: 'A',
      name: '',
      enabled: false,
    }
    const wrapper = mount(C_DataPicker<Row, Filters>, {
      props: {
        source,
        columns,
        initialValues,
        pageSize: 1,
        presentation: 'inline',
      },
      slots: {
        query: ({ initialValues, submit, loading }) =>
          h(
            'button',
            {
              type: 'button',
              disabled: loading,
              onClick: () => submit({ ...initialValues!, name: '旧查询' }),
            },
            '筛选候选'
          ),
      },
    })
    try {
      await wrapper.get('.c-data-picker__open').trigger('click')
      await flushPromises()
      expect(request.mock.calls[0]?.[0].filters).toEqual(initialValues)
      const table = wrapper.getComponent(C_Table)
        .vm as unknown as TableInstance<Row>
      table.selectRow('r0')
      await flushPromises()
      wrapper.getComponent(NPagination).vm.$emit('update:page', 2)
      await flushPromises()
      expect(request.mock.calls[1]?.[0]).toMatchObject({
        page: 2,
        filters: initialValues,
      })
      await wrapper.get('button[type="button"]:not(.n-button)').trigger('click')
      await flushPromises()
      const pending = request.mock.calls[2]?.[0]
      expect(pending).toMatchObject({
        page: 1,
        filters: { ...initialValues, name: '旧查询' },
      })
      await wrapper.setProps({
        initialValues: { ...initialValues, organization: 'B' },
      })
      expect(pending?.signal.aborted).toBe(true)
      expect(wrapper.find('[role="region"]').exists()).toBe(false)
      oldRequest.resolve({ rows: [allRows[2]!], total: allRows.length })
      await wrapper.get('.c-data-picker__open').trigger('click')
      await flushPromises()
      expect(tableData(wrapper)).toEqual([allRows[0]])
      expect(request).toHaveBeenCalledTimes(4)
      expect(request.mock.calls[3]?.[0]).toMatchObject({
        page: 1,
        filters: { ...initialValues, organization: 'B' },
      })
      await button(wrapper, '确定').trigger('click')
      expect(wrapper.emitted('select')).toEqual([[[]]])
    } finally {
      wrapper.unmount()
    }
  })

  test('搜索名称传递到原生输入框，可由读屏和键盘自动化定位', async () => {
    const wrapper = mount(C_DataPicker<Row>, {
      props: { source: createSource(), columns },
      attachTo: document.body,
    })
    try {
      await wrapper.get('.c-data-picker__open').trigger('click')
      await flushPromises()
      expect(
        wrapper.getComponent(NInput).get('input').attributes('aria-label')
      ).toBe('搜索候选数据')
      expect(button(wrapper, '搜索').attributes('type')).toBe('submit')
    } finally {
      wrapper.unmount()
    }
  })
  test('KeepAlive切离关闭Teleport弹窗并取消请求，返回后不恢复未确认草稿', async () => {
    const shown = ref(true)
    const pending = deferred<{ rows: Row[]; total: number }>()
    let signal: AbortSignal | undefined
    const source: DataPickerSource<Row> = {
      ...createSource(),
      request: ({ page, signal: current }) => {
        signal = current
        return page === 1
          ? Promise.resolve({
              rows: allRows.slice(0, 2),
              total: allRows.length,
            })
          : pending.promise
      },
    }
    const Host = defineComponent(
      () => () =>
        h(KeepAlive, null, {
          default: () =>
            shown.value
              ? h(C_DataPicker<Row>, {
                  source,
                  columns,
                  modelValue: [0],
                  multiple: true,
                  pageSize: 2,
                })
              : h('div'),
        })
    )
    const wrapper = mount(Host, { attachTo: document.body })
    const picker = wrapper.getComponent(C_DataPicker<Row>)
    await wrapper.get('.c-data-picker__open').trigger('click')
    await flushPromises()
    const table = picker.getComponent(C_Table)
      .vm as unknown as TableInstance<Row>
    table.selectRow('r1')
    await flushPromises()
    picker.getComponent(NPagination).vm.$emit('update:page', 2)
    await flushPromises()
    expect(document.querySelector('.c-data-picker__modal')).not.toBeNull()
    shown.value = false
    await nextTick()
    await flushPromises()
    expect(signal?.aborted).toBe(true)
    expect(picker.getComponent(NModal).props('show')).toBe(false)
    expect(
      window.getComputedStyle(
        document.querySelector<HTMLElement>('.c-data-picker__modal')!
      ).display
    ).toBe('none')
    expect(picker.emitted('update:modelValue')).toBeUndefined()
    expect(picker.emitted('select')).toBeUndefined()
    pending.resolve({ rows: [allRows[2]!], total: allRows.length })
    shown.value = true
    await nextTick()
    await flushPromises()
    expect(picker.getComponent(NModal).props('show')).toBe(false)
    await wrapper.get('.c-data-picker__open').trigger('click')
    await flushPromises()
    await button(wrapper, '确定').trigger('click')
    expect(picker.emitted('update:modelValue')!.at(-1)![0]).toEqual([0])
    wrapper.unmount()
  })

  test('0初值批量回显；多页草稿取消不提交，确认才发送完整值与已解析行', async () => {
    const source = createSource()
    const wrapper = mount(C_DataPicker<Row>, {
      props: { source, columns, modelValue: [0], multiple: true, pageSize: 2 },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('客户零')
    expect(source.resolve).toHaveBeenCalledTimes(1)
    expect(source.resolve).toHaveBeenCalledWith([0], expect.any(AbortSignal))
    await wrapper.get('.c-data-picker__open').trigger('click')
    await flushPromises()
    const table = () =>
      wrapper.getComponent(C_Table).vm as unknown as TableInstance<Row>
    table().selectRow('r1')
    await flushPromises()
    wrapper.getComponent(NPagination).vm.$emit('update:page', 2)
    await flushPromises()
    table().selectRow('r2')
    await flushPromises()
    expect(
      wrapper.findAllComponents(NButton).some(item => item.text() === '确定')
    ).toBe(true)
    await button(wrapper, '取消').trigger('click')
    await flushPromises()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.emitted('select')).toBeUndefined()
    expect(wrapper.props('modelValue')).toEqual([0])
    await wrapper.get('.c-data-picker__open').trigger('click')
    await flushPromises()
    table().selectRow('r1')
    await flushPromises()
    await button(wrapper, '确定').trigger('click')
    await flushPromises()
    expect(wrapper.emitted('update:modelValue')!.at(-1)![0]).toEqual([0, 1])
    expect(wrapper.emitted('select')!.at(-1)![0]).toEqual(allRows.slice(0, 2))
    wrapper.unmount()
  })

  test('换页保留分页和已知总数，无选中项时禁用确认，数据缩减后重新定位', async () => {
    const pending = deferred<{ rows: Row[]; total: number }>()
    const request = vi
      .fn<DataPickerSource<Row>['request']>()
      .mockResolvedValueOnce({ rows: allRows.slice(0, 2), total: 3 })
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce({ rows: [allRows[0]!], total: 1 })
    const wrapper = mount(C_DataPicker<Row>, {
      props: {
        source: { ...createSource(), request },
        columns,
        pageSize: 2,
        requireSelection: true,
      },
    })
    await wrapper.get('.c-data-picker__open').trigger('click')
    await flushPromises()
    const pager = () => wrapper.getComponent(NPagination)
    expect(button(wrapper, '确定').props('disabled')).toBe(true)
    expect(pager().props('itemCount')).toBe(3)
    pager().vm.$emit('update:page', 2)
    await flushPromises()
    expect(pager().props('page')).toBe(2)
    expect(pager().props('itemCount')).toBe(3)
    expect(tableData(wrapper)).toEqual([])
    pending.resolve({ rows: [], total: 1 })
    await flushPromises()
    expect(request.mock.calls.map(([query]) => query.page)).toEqual([1, 2, 1])
    expect(tableData(wrapper)).toEqual([allRows[0]])
    expect(wrapper.findComponent(NPagination).exists()).toBe(false)
    wrapper.unmount()
  })

  test('切换源会取消旧请求并关闭旧会话，忽略signal的旧回包也不能覆盖新源', async () => {
    const pending = deferred<{ rows: Row[]; total: number }>()
    let signal!: AbortSignal
    const first: DataPickerSource<Row> = {
      ...createSource(),
      request: ({ signal: requestSignal }) => {
        signal = requestSignal
        return pending.promise
      },
    }
    const wrapper = mount(C_DataPicker<Row>, {
      props: { source: first, columns },
    })
    await wrapper.get('.c-data-picker__open').trigger('click')
    await flushPromises()
    const second: DataPickerSource<Row> = {
      ...createSource(),
      request: async () => ({
        rows: [{ id: 'new', code: 7, name: '新数据源' }],
        total: 1,
      }),
    }
    await wrapper.setProps({ source: second })
    expect(signal.aborted).toBe(true)
    pending.resolve({
      rows: [{ id: 'old', code: 9, name: '旧数据源' }],
      total: 1,
    })
    await flushPromises()
    await wrapper.get('.c-data-picker__open').trigger('click')
    await flushPromises()
    expect(tableData(wrapper)).toEqual([
      { id: 'new', code: 7, name: '新数据源' },
    ])
    wrapper.unmount()
  })

  test('回显与列表资源独立，外部值更换后旧名称不能回写，卸载取消在途请求', async () => {
    const first = deferred<readonly Row[]>()
    const second = deferred<readonly Row[]>()
    const third = deferred<readonly Row[]>()
    const signals: AbortSignal[] = []
    let count = 0
    const source: DataPickerSource<Row> = {
      ...createSource(),
      resolve: (_values, signal) => {
        signals.push(signal)
        return [first, second, third][count++]!.promise
      },
    }
    const wrapper = mount(C_DataPicker<Row>, {
      props: { source, columns, modelValue: 0 },
    })
    await wrapper.setProps({ modelValue: 1 })
    expect(signals[0]!.aborted).toBe(true)
    second.resolve([allRows[1]!])
    first.resolve([allRows[0]!])
    await flushPromises()
    expect(wrapper.text()).toContain('客户一')
    expect(wrapper.text()).not.toContain('客户零')
    await wrapper.setProps({ modelValue: 2 })
    wrapper.unmount()
    expect(signals.at(-1)!.aborted).toBe(true)
    third.resolve([allRows[2]!])
    await flushPromises()
  })

  test('失败显示重试入口；readonly/disabled不打开或清空已选0值', async () => {
    const source = createSource()
    source.request = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ rows: allRows, total: 3 })
    const wrapper = mount(C_DataPicker<Row>, {
      props: { source, columns, modelValue: 0, clearable: true },
    })
    await wrapper.get('.c-data-picker__open').trigger('click')
    await flushPromises()
    expect(wrapper.findComponent(C_Table).exists()).toBe(false)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    await button(wrapper, '重试').trigger('click')
    await flushPromises()
    expect(tableData(wrapper)).toHaveLength(3)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    await wrapper.setProps({ readonly: true })
    await wrapper.get('.c-data-picker__open').trigger('click')
    await wrapper.get('.c-data-picker__clear').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    await wrapper.setProps({ readonly: false })
    await wrapper.get('.c-data-picker__clear').trigger('click')
    expect(wrapper.emitted('update:modelValue')!.at(-1)![0]).toBeNull()
    wrapper.unmount()
  })

  test('跨页同一rowKey/value仍是一项，移除已选只在确认时提交，未知ID保留', async () => {
    const source: DataPickerSource<Row> = {
      ...createSource(),
      resolve: undefined,
      request: async ({ page }) => ({
        rows: [
          { id: 'r0', code: 0, name: page === 1 ? '第一页名称' : '第二页名称' },
        ],
        total: 2,
      }),
    }
    const wrapper = mount(C_DataPicker<Row>, {
      props: {
        source,
        columns,
        modelValue: [0, 99],
        multiple: true,
        pageSize: 1,
      },
    })
    await wrapper.get('.c-data-picker__open').trigger('click')
    await flushPromises()
    wrapper.getComponent(NPagination).vm.$emit('update:page', 2)
    await flushPromises()
    const chosen = wrapper
      .findAllComponents(NTag)
      .find(item => item.text() === '第二页名称')!
    expect(chosen.exists()).toBe(true)
    expect(
      wrapper.findAllComponents(NTag).some(item => item.text() === '99')
    ).toBe(true)
    chosen.vm.$emit('close')
    await flushPromises()
    expect(
      (
        wrapper.getComponent(C_Table).vm as unknown as TableInstance<Row>
      ).getSelectedRows()
    ).toEqual([])
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    await button(wrapper, '确定').trigger('click')
    expect(wrapper.emitted('update:modelValue')!.at(-1)![0]).toEqual([99])
    expect(wrapper.emitted('select')!.at(-1)![0]).toEqual([])
    wrapper.unmount()
  })

  test('本地locale与显式title优先，切换语言不丢失选择草稿', async () => {
    const wrapper = mount(C_DataPicker<Row>, {
      props: {
        source: createSource(),
        columns,
        title: '自定义标题',
        locale: { locale: 'en-US' },
      },
    })
    await wrapper.get('.c-data-picker__open').trigger('click')
    await flushPromises()
    expect(wrapper.getComponent(NModal).props('title')).toBe('自定义标题')
    expect(button(wrapper, 'Cancel').exists()).toBe(true)
    expect(button(wrapper, 'Confirm').exists()).toBe(true)
    await wrapper.setProps({ locale: { locale: 'zh-CN' } })
    expect(button(wrapper, '确定').exists()).toBe(true)
    expect(wrapper.getComponent(NModal).props('show')).toBe(true)
    wrapper.unmount()
  })

  test('区域密度可继承，显式density仍优先', async () => {
    const wrapper = mount(C_DataPicker<Row>, {
      props: { source: createSource(), columns },
      global: {
        provide: {
          [FORM_GLOBAL_CONFIG_KEY as symbol]: { density: 'comfortable' },
        },
      },
    })
    expect(wrapper.getComponent(NButton).props('size')).toBe('large')
    await wrapper.setProps({ density: 'compact' })
    expect(wrapper.getComponent(NButton).props('size')).toBe('small')
    wrapper.unmount()
  })

  test('第二页提交新搜索时只发送一次最终查询快照', async () => {
    const source = createSource()
    const wrapper = mount(C_DataPicker<Row>, {
      props: { source, columns, pageSize: 1 },
    })
    await wrapper.get('.c-data-picker__open').trigger('click')
    await flushPromises()
    wrapper.getComponent(NPagination).vm.$emit('update:page', 2)
    await flushPromises()
    const before = vi.mocked(source.request).mock.calls.length
    const input = wrapper.getComponent(NInput)
    input.vm.$emit('update:value', '新条件')
    await flushPromises()
    input.element
      .closest('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await flushPromises()
    expect(source.request).toHaveBeenCalledTimes(before + 1)
    expect(vi.mocked(source.request).mock.calls.at(-1)![0]).toMatchObject({
      page: 1,
      pageSize: 1,
      search: '新条件',
    })
    wrapper.unmount()
  })

  test.each([
    { label: '小数total', rows: allRows.slice(0, 1), total: 1.5 },
    {
      label: '非安全total',
      rows: allRows.slice(0, 1),
      total: Number.MAX_SAFE_INTEGER + 1,
    },
    {
      label: '缺失rowKey',
      rows: [{ id: '', code: 0, name: '缺失身份' }],
      total: 1,
    },
    {
      label: '重复rowKey',
      rows: [
        { id: 'same', code: 0, name: '第一项' },
        { id: 'same', code: 1, name: '第二项' },
      ],
      total: 2,
    },
    { label: '超出分页', rows: allRows, total: 3 },
  ])('$label会阻止候选挂载，重试不提交或静默截断', async ({ rows, total }) => {
    const source: DataPickerSource<Row> = {
      ...createSource(),
      request: async () => ({ rows, total }),
    }
    const wrapper = mount(C_DataPicker<Row>, {
      props: { source, columns, pageSize: 2, modelValue: 0 },
    })
    await wrapper.get('.c-data-picker__open').trigger('click')
    await flushPromises()
    expect(wrapper.findComponent(C_Table).exists()).toBe(false)
    expect(button(wrapper, '重试').exists()).toBe(true)
    await button(wrapper, '重试').trigger('click')
    await flushPromises()
    expect(wrapper.findComponent(C_Table).exists()).toBe(false)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.props('modelValue')).toBe(0)
    wrapper.unmount()
  })
})

describe('C_BatchResult结果展示', () => {
  test('同key最后状态优先，仅明确可重试的失败/冲突被发出', async () => {
    const results: BatchOperationResult[] = [
      { key: 0, status: 'failure', retryable: true, message: '旧失败' },
      { key: 0, status: 'success', message: '已经成功' },
      { key: 'bad', status: 'failure', retryable: false, message: '禁止重试' },
      {
        key: 'conflict',
        status: 'conflict',
        retryable: true,
        message: '版本冲突',
      },
      { key: 'retry', status: 'failure', retryable: true, message: '网络失败' },
      { key: 'skip', status: 'skipped', retryable: true },
    ]
    const wrapper = mount(C_BatchResult, { props: { results } })
    await flushPromises()
    expect(wrapper.text()).toContain('共 5 项')
    expect(wrapper.text()).not.toContain('旧失败')
    await button(wrapper, '重试可重试项（2）').trigger('click')
    expect(wrapper.emitted('retry')![0]![0]).toEqual(['conflict', 'retry'])
    wrapper.getComponent(NSelect).vm.$emit('update:value', 'failure')
    await flushPromises()
    expect(tableData(wrapper)).toEqual(
      results.filter(result => result.key === 'bad' || result.key === 'retry')
    )
    wrapper.unmount()
  })

  test('万条失败只交付当前页给表格；筛选后重置页码，不创建万条DOM', async () => {
    const results: BatchOperationResult[] = Array.from(
      { length: 10_000 },
      (_, key) => ({
        key,
        status: key === 0 ? 'success' : 'failure',
        retryable: false,
        message: `结果${key}`,
      })
    )
    const wrapper = mount(C_BatchResult, { props: { results, pageSize: 20 } })
    await flushPromises()
    expect(tableData(wrapper)).toHaveLength(20)
    expect(wrapper.findAll('tbody tr').length).toBeLessThanOrEqual(20)
    wrapper.getComponent(NPagination).vm.$emit('update:page', 500)
    await flushPromises()
    expect((tableData(wrapper) as BatchOperationResult[])[0]!.key).toBe(9980)
    wrapper.getComponent(NSelect).vm.$emit('update:value', 'success')
    await flushPromises()
    expect(tableData(wrapper)).toEqual([results[0]])
    expect(wrapper.findComponent(NPagination).exists()).toBe(false)
    expect(wrapper.emitted('retry')).toBeUndefined()
    wrapper.unmount()
  })

  test('结果标题、筛选、列头与重试文案响应locale', async () => {
    const wrapper = mount(C_BatchResult, {
      props: {
        results: [{ key: 0, status: 'conflict', retryable: true }],
        locale: { locale: 'en-US' },
      },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('Batch operation results')
    expect(wrapper.text()).toContain('Business key')
    expect(button(wrapper, 'Retry eligible items (1)').exists()).toBe(true)
    await wrapper.setProps({ title: '指定标题', locale: { locale: 'zh-CN' } })
    expect(wrapper.text()).toContain('指定标题')
    expect(wrapper.text()).toContain('业务标识')
    expect(button(wrapper, '重试可重试项（1）').exists()).toBe(true)
    wrapper.unmount()
  })
})
