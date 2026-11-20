import { flushPromises, mount } from '@vue/test-utils'
import { expect, test, vi } from 'vitest'
import Picker from '../../src/components/C_DataPicker/index.vue'
import { createLocalDataPickerSource } from '../../src/components/C_DataPicker'
import type {
  DataPickerProps,
  DataPickerSourceInput,
} from '../../src/components/C_DataPicker/types'
import type { TableInstance } from '../../src/components/C_Table/types'
import { COMPONENT_LOCALE_KEY } from '../../src/context'

interface Row {
  id: number
  code: string
  name: string
  enabled: boolean
}

const rows: Row[] = [
  { id: 1, code: '001', name: '物料一', enabled: true },
  { id: 2, code: '002', name: '物料二', enabled: false },
  { id: 3, code: '003', name: '物料三', enabled: true },
  { id: 4, code: '004', name: '物料四', enabled: true },
]
const adapter = (): DataPickerSourceInput<Row> => ({
  rowKey: 'id',
  value: row => row.code,
  label: row => row.name,
  request: async () => ({ rows: [...rows], total: rows.length }),
  resolve: vi.fn(async codes =>
    rows.filter(row => codes.includes(row.code)).reverse()
  ),
})
const setup = (props: Partial<DataPickerProps<Row>> = {}) =>
  mount(Picker<Row>, {
    props: {
      source: adapter(),
      columns: [{ key: 'name', title: '名称' }],
      presentation: 'inline',
      multiple: true,
      batchPaste: true,
      ...props,
    },
  })
type Wrapper = ReturnType<typeof setup>
function button(wrapper: Wrapper, title: string) {
  const found = wrapper.findAll('button').find(item => item.text() === title)
  if (!found) throw new Error(`Missing button: ${title}`)
  return found
}
async function open(wrapper: Wrapper) {
  await wrapper.get('.c-data-picker__open').trigger('click')
  await button(wrapper, '批量粘贴').trigger('click')
  await flushPromises()
}
const textarea = (wrapper: Wrapper) =>
  wrapper.get<HTMLTextAreaElement>('textarea[aria-label="待匹配编码"]')
const statuses = (wrapper: Wrapper) =>
  wrapper.findAll('[data-match]').map(item => item.attributes('data-match'))

test('预览匹配状态并按粘贴顺序加入草稿，确认才发布受控值', async () => {
  const source = adapter()
  const wrapper = setup({
    source,
    modelValue: ['004'],
    maxSelection: 2,
    rowCheckable: row => row.enabled,
  })
  try {
    await open(wrapper)
    await textarea(wrapper).setValue(' 003 \r\n001，003\t002;空；004、1 ')
    await button(wrapper, '匹配编码').trigger('click')
    await flushPromises()
    expect(source.resolve).toHaveBeenLastCalledWith(
      ['003', '001', '002', '空', '004', '1'],
      expect.any(AbortSignal)
    )
    expect(statuses(wrapper)).toEqual([
      'match',
      'limit',
      'disabled',
      'missing',
      'selected',
      'missing',
    ])
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    await button(wrapper, '加入 1 项').trigger('click')
    expect(statuses(wrapper)[0]).toBe('selected')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    await button(wrapper, '确定').trigger('click')
    await flushPromises()
    expect(wrapper.emitted('update:modelValue')).toEqual([[['004', '003']]])
    expect(wrapper.emitted('select')).toEqual([[[rows[3], rows[2]]]])
  } finally {
    wrapper.unmount()
  }
})

test('本地编码与提交值分别映射，匹配后的草稿和表格保持一致', async () => {
  const source = createLocalDataPickerSource({
    rows,
    rowKey: 'id',
    label: row => row.name,
    code: row => row.code,
  })
  const wrapper = setup({ source })
  try {
    await open(wrapper)
    await textarea(wrapper).setValue('003\n001')
    await button(wrapper, '匹配编码').trigger('click')
    await flushPromises()
    await button(wrapper, '加入 2 项').trigger('click')
    await vi.waitFor(() => {
      const table = wrapper.getComponent({ name: 'C_Table' })
        .vm as unknown as TableInstance<Row>
      expect(table.getSelectedRows()).toEqual([rows[0], rows[2]])
    })
    await button(wrapper, '确定').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([[[3, 1]]])
    expect(wrapper.emitted('select')).toEqual([[[rows[2], rows[0]]]])
  } finally {
    wrapper.unmount()
  }
})

test('编辑输入和切换业务范围会取消旧请求，迟到结果不会进入新会话', async () => {
  const completions: Array<(value: ReadonlyMap<string, Row>) => void> = []
  const resolveCodes = vi.fn<
    NonNullable<DataPickerSourceInput<Row>['resolveCodes']>
  >(() => new Promise(resolve => completions.push(resolve)))
  const wrapper = setup({ source: { ...adapter(), resolveCodes }, scope: 'w1' })
  try {
    await open(wrapper)
    await textarea(wrapper).setValue('001')
    await button(wrapper, '匹配编码').trigger('click')
    const [, firstSignal] = resolveCodes.mock.calls[0]
    expect(button(wrapper, '确定').attributes('disabled')).toBeDefined()
    await textarea(wrapper).setValue('003')
    expect(firstSignal.aborted).toBe(true)
    completions[0](new Map([['001', rows[0]]]))
    await flushPromises()
    expect(statuses(wrapper)).toEqual([])
    await button(wrapper, '匹配编码').trigger('click')
    const [, secondSignal, context] = resolveCodes.mock.calls[1]
    expect(context).toEqual({ scope: 'w1' })
    await wrapper.setProps({ scope: 'w2' })
    expect(secondSignal.aborted).toBe(true)
    completions[1](new Map([['003', rows[2]]]))
    await open(wrapper)
    expect(textarea(wrapper).element.value).toBe('')
    expect(statuses(wrapper)).toEqual([])
  } finally {
    wrapper.unmount()
  }
})

test('限制批次并拒绝含重复身份的响应，失败后可以直接重试', async () => {
  const resolve = vi
    .fn<NonNullable<DataPickerSourceInput<Row>['resolve']>>()
    .mockResolvedValueOnce([rows[0], rows[0]])
    .mockResolvedValueOnce([rows[0]])
  const wrapper = setup({
    source: { ...adapter(), resolve },
    batchPaste: { maxItems: 1 },
  })
  try {
    await open(wrapper)
    await textarea(wrapper).setValue('001\n003')
    await button(wrapper, '匹配编码').trigger('click')
    expect(wrapper.get('.c-data-picker__batch-error').text()).toContain('1 个')
    expect(resolve).not.toHaveBeenCalled()
    await textarea(wrapper).setValue('001')
    await button(wrapper, '匹配编码').trigger('click')
    await flushPromises()
    expect(wrapper.get('.c-data-picker__batch-error').text()).toBe(
      '匹配失败，请重试'
    )
    expect(statuses(wrapper)).toEqual([])
    await button(wrapper, '匹配编码').trigger('click')
    await flushPromises()
    expect(statuses(wrapper)).toEqual(['match'])
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  } finally {
    wrapper.unmount()
  }
})

test('批量面板保留应用语言和当前选择器词条覆盖', async () => {
  const wrapper = mount(Picker<Row>, {
    props: {
      source: adapter(),
      columns: [],
      presentation: 'inline',
      multiple: true,
      batchPaste: true,
      locale: { messages: { 'picker.batch.open': 'Paste material numbers' } },
    },
    global: {
      provide: {
        [COMPONENT_LOCALE_KEY as symbol]: {
          locale: 'en-US',
          messages: { 'picker.batch.open': 'Paste business codes' },
        },
      },
    },
  })
  await wrapper.get('.c-data-picker__open').trigger('click')
  await button(wrapper, 'Paste material numbers').trigger('click')
  expect(wrapper.get('textarea').attributes('aria-label')).toBe(
    'Codes to match'
  )
  await wrapper.setProps({ locale: undefined })
  expect(button(wrapper, 'Paste business codes').exists()).toBe(true)
})
