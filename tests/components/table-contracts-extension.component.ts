import { expect, test, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick, type VNode } from 'vue'
import { NDataTable, NInputNumber } from 'naive-ui'
import C_Table from '../../src/components/C_Table/index.vue'
import C_Form from '../../src/components/C_Form/index.vue'
import { renderEditComponent } from '../../src/components/C_Table/editRenderer'
import {
  generateFormOptions,
  generateFormRenderers,
} from '../../src/components/C_Table/data'
import { createTableSelectEditor } from '../../src/components/C_Table/editors'
import { flattenTableColumns } from '../../src/components/C_Table/helpers'
import type {
  DataRecord,
  TableColumn,
} from '../../src/components/C_Table/types'

const config = {
  toolbar: { show: false },
  pagination: false as const,
  edit: 'cell' as const,
}

function renderQuantity(
  columns: import('naive-ui').DataTableColumn[],
  row: DataRecord
) {
  const column = flattenTableColumns(columns).find(
    item => 'key' in item && item.key === 'qty'
  )
  if (column && 'render' in column) return column.render?.(row, 0)
}

test('nested grouped headers preserve utility widths, leaf editors and runtime permissions', async () => {
  const row = { id: 0, qty: 1.125, locked: false, name: '示例' }
  const columns: TableColumn<DataRecord>[] = [
    { type: 'selection' },
    {
      type: 'group',
      title: '计量',
      children: [
        {
          type: 'group',
          title: '明细',
          children: [
            {
              key: 'qty',
              title: '数量',
              editType: 'number',
              editProps: { precision: 3 },
              editable: r => !r.locked,
            },
          ],
        },
        { key: 'name', title: '名称' },
      ],
    },
  ]
  const wrapper = mount(C_Table<DataRecord>, {
    props: { columns, data: [row], rowKey: 'id', config },
  })
  await flushPromises()
  const native = wrapper.getComponent(NDataTable).props('columns') ?? []
  expect(wrapper.text()).toContain('计量')
  expect(wrapper.text()).toContain('明细')
  expect(
    flattenTableColumns(native).filter(c => c.type === 'selection')[0].width
  ).toBe(40)
  const cell = renderQuantity(native, row) as VNode
  expect(cell.props?.class).toBe('cell-edit-wrapper')
  await wrapper.find('.cell-edit-icon').trigger('click')
  await nextTick()
  expect(wrapper.getComponent(NInputNumber).props('precision')).toBe(3)
  await wrapper.find('.cell-action-cancel').trigger('click')
  row.locked = true
  await wrapper.setProps({ data: [{ ...row }] })
  expect(
    renderQuantity(wrapper.getComponent(NDataTable).props('columns') ?? [], row)
  ).toBe('1.125')
  wrapper.unmount()
})

test('inline source editors derive row filters, preserve zero and notify after model update', async () => {
  const source = {
    request: async () => ({ rows: [{ id: 0, name: 'A' }], total: 1 }),
    value: (r: { id: number; name: string }) => r.id,
    label: (r: { id: number; name: string }) => r.name,
  }
  const selected = vi.fn()
  let current: unknown = 0
  const column: TableColumn<DataRecord> = {
    key: 'material',
    title: '物料',
    editType: 'select',
    editProps: {
      source: row => ({ ...source, filters: { warehouse: row.warehouse } }),
      onSelect: () => selected(current),
    },
  }
  const vnode = renderEditComponent(
    column,
    0,
    value => {
      current = value
    },
    { warehouse: 5 },
    2
  ) as VNode
  expect(vnode.props?.modelValue).toBe(0)
  expect(vnode.props?.source.filters).toEqual({ warehouse: 5 })
  vnode.props?.['onUpdate:modelValue'](9)
  await vnode.props?.onSelect({ id: 9, name: 'B' })
  expect(selected).toHaveBeenCalledWith(9)
})

test('modal field renderers reuse typed source editors rather than silently falling back to plain inputs', async () => {
  const source = {
    request: vi.fn(async () => ({ rows: [{ id: 0, name: '候选' }], total: 1 })),
    value: (r: { id: number; name: string }) => r.id,
    label: (r: { id: number; name: string }) => r.name,
    resolve: async () => [{ id: 0, name: '候选' }],
  }
  const columns: TableColumn<DataRecord>[] = [
    {
      key: 'material',
      title: '物料',
      editRender: createTableSelectEditor({ source }),
    },
  ]
  const row = { material: 0 }
  const wrapper = mount(C_Form<DataRecord>, {
    props: {
      modelValue: row,
      options: generateFormOptions(columns, () => row),
      renderers: generateFormRenderers(
        columns,
        () => row,
        () => 0
      ),
      config: { showActions: false },
    },
  })
  await flushPromises()
  await flushPromises()
  await vi.waitFor(() =>
    expect(wrapper.findComponent({ name: 'C_Select' }).exists()).toBe(true)
  )
  expect(wrapper.findComponent({ name: 'C_Select' }).props('modelValue')).toBe(
    0
  )
  wrapper.unmount()
})
