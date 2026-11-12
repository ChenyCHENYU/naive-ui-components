import { expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { NModal } from 'naive-ui'
import C_DataPicker from '../../src/components/C_DataPicker/index.vue'
import C_Table from '../../src/components/C_Table/index.vue'
import C_Tree from '../../src/components/C_Tree/index.vue'
import type { DataPickerSourceInput } from '../../src/components/C_DataPicker/types'
import type { TableInstance } from '../../src/components/C_Table/types'

function clickWithDocumentCapture(element: Element): void {
  element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
  element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
  ;(element as HTMLElement).click()
}

test('a real document-captured trigger click keeps keyword, category and checked rows when switching to the full modal', async () => {
  interface Row {
    id: number
    name: string
  }
  interface Filters {
    factory?: string
    category?: string
  }
  const records: Row[] = [{ id: 0, name: '合金零' }]
  const source: DataPickerSourceInput<Row, Filters> = {
    rowKey: 'id',
    label: row => row.name,
    request: vi.fn(async () => ({ rows: records, total: records.length })),
  }
  const wrapper = mount(C_DataPicker<Row, Filters>, {
    props: {
      source,
      columns: [{ key: 'name', title: '名称' }],
      multiple: true,
      presentation: 'popover',
      fixedFilters: { factory: 'A' },
      navigation: {
        field: 'category',
        options: [{ key: 'metal', label: '合金' }],
      },
    },
    attachTo: document.body,
  })
  const input = wrapper.get<HTMLInputElement>('.c-data-picker__trigger input')
  input.element.focus()
  await flushPromises()
  await input.setValue('合金')
  await input.trigger('keydown', { key: 'Enter' })
  await flushPromises()
  await wrapper
    .getComponent(C_Tree)
    .get('.n-tree-node-content')
    .trigger('click')
  await flushPromises()
  const nativeTable = wrapper.getComponent(C_Table)
  await nativeTable.get('.n-checkbox').trigger('click')
  await flushPromises()
  expect(
    (nativeTable.vm as unknown as TableInstance<Row>).getSelectedRows()
  ).toEqual([records[0]])
  const lastQuery = vi.mocked(source.request).mock.calls.at(-1)![0]
  expect(lastQuery).toMatchObject({
    search: '合金',
    filters: { factory: 'A', category: 'metal' },
  })
  const calls = vi.mocked(source.request).mock.calls.length

  const captured = vi.fn()
  document.addEventListener('mouseup', captured, true)
  try {
    const more = wrapper.get('.c-data-picker__more').element
    clickWithDocumentCapture(more)
    await flushPromises()
    expect(captured).toHaveBeenCalledOnce()
    expect(captured.mock.calls[0][0].target).toBe(more)
    expect(wrapper.getComponent(NModal).props('show')).toBe(true)
    const modalTable = wrapper.getComponent(C_Table)
      .vm as unknown as TableInstance<Row>
    expect(modalTable.getSelectedRows()).toEqual([records[0]])
    expect(vi.mocked(source.request).mock.calls).toHaveLength(calls)
    for (const [query] of vi.mocked(source.request).mock.calls.slice(calls)) {
      expect(query).toMatchObject({
        search: '合金',
        filters: { factory: 'A', category: 'metal' },
      })
    }
    const panel = wrapper.getComponent({ name: 'PickerPanel' })
    expect(
      panel.get('input[aria-label="搜索候选数据"]').element
    ).toHaveProperty('value', '合金')
    expect(
      panel.getComponent({ name: 'C_Tree' }).props('selectedKeys')
    ).toEqual(['metal'])
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  } finally {
    document.removeEventListener('mouseup', captured, true)
    wrapper.unmount()
  }
})
