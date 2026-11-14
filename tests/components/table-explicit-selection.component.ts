import { describe, expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { h, ref } from 'vue'
import { NCheckbox, NDataTable } from 'naive-ui'
import C_Table from '../../src/components/C_Table/index.vue'
import { TABLE_GLOBAL_CONFIG_KEY } from '../../src/components/C_Table/composables/useTableGlobalConfig'
import type { TableConfig } from '../../src/components/C_Table/composables/useTableConfig'
import type {
  TableColumn,
  TableInstance,
} from '../../src/components/C_Table/types'

interface Row {
  id: number
  name: string
}
const rows: Row[] = [
  { id: 1, name: 'One' },
  { id: 2, name: 'Two' },
]
const businessColumn: TableColumn<Row> = { key: 'name', title: 'Name' }
const config = {
  density: 'compact',
  edit: 'cell',
  pagination: false,
  toolbar: { show: false },
} as const

function table(
  selection?: TableConfig<Row>['selection'],
  globalSelection?: TableConfig<Row>['selection']
) {
  const wrapper = mount(C_Table<Row>, {
    props: {
      data: rows,
      columns: [{ type: 'selection' }, businessColumn],
      config: { ...config, selection },
    },
    global: {
      provide: {
        [TABLE_GLOBAL_CONFIG_KEY as symbol]: {
          defaults: { selection: globalSelection },
        },
      },
    },
  })
  const api = wrapper.vm as unknown as TableInstance<Row>
  return { wrapper, api }
}

describe('explicit selection columns own the omitted selection default', () => {
  test('real row and header checkbox clicks update controlled state, emit real rows, and clear selection', async () => {
    const { wrapper, api } = table()
    await flushPromises()
    const first = () => wrapper.findAll('.n-checkbox')[1]
    expect(first().attributes('aria-checked')).toBe('false')
    await first().trigger('click')
    expect(first().attributes('aria-checked')).toBe('true')
    expect(api.getSelectedRows()).toEqual([rows[0]])
    expect(wrapper.emitted('selection-change')?.at(-1)?.slice(0, 2)).toEqual([
      [1],
      [rows[0]],
    ])
    await wrapper.findAll('.n-checkbox')[0].trigger('click')
    expect(api.getSelectedRows()).toEqual(rows)
    expect(wrapper.emitted('selection-change')?.at(-1)?.slice(0, 2)).toEqual([
      [1, 2],
      rows,
    ])
    api.clearSelection()
    await flushPromises()
    expect(first().attributes('aria-checked')).toBe('false')
    expect(api.getSelectedRows()).toEqual([])
    expect(wrapper.emitted('selection-change')).toHaveLength(3)
  })

  test.each([false, { enabled: false }] as const)(
    'explicit local %j keeps selection disabled even when global selection is enabled',
    async selection => {
      const { wrapper, api } = table(selection, true)
      await flushPromises()
      expect(
        wrapper
          .findAllComponents(NCheckbox)
          .slice(1)
          .every(box => box.props('disabled'))
      ).toBe(true)
      await wrapper.findAll('.n-checkbox')[1].trigger('click')
      expect(wrapper.findAll('.n-checkbox')[1].attributes('aria-checked')).toBe(
        'false'
      )
      expect(api.getSelectedRows()).toEqual([])
      expect(api.selectRow(1)).toBe(false)
      expect(wrapper.emitted('selection-change')).toBeUndefined()
    }
  )

  test.each([false, { enabled: false }] as const)(
    'explicit global %j keeps selection disabled when local selection is omitted',
    async globalSelection => {
      const { wrapper, api } = table(undefined, globalSelection)
      await flushPromises()
      expect(
        wrapper
          .findAllComponents(NCheckbox)
          .slice(1)
          .every(box => box.props('disabled'))
      ).toBe(true)
      await wrapper.findAll('.n-checkbox')[1].trigger('click')
      expect(wrapper.findAll('.n-checkbox')[1].attributes('aria-checked')).toBe(
        'false'
      )
      expect(api.getSelectedRows()).toEqual([])
      expect(wrapper.emitted('selection-change')).toBeUndefined()
    }
  )

  test('explicit local true overrides a disabled global default', async () => {
    const { wrapper, api } = table(true, { enabled: false })
    await flushPromises()
    await wrapper.findAll('.n-checkbox')[1].trigger('click')
    expect(wrapper.findAll('.n-checkbox')[1].attributes('aria-checked')).toBe(
      'true'
    )
    expect(api.getSelectedRows()).toEqual([rows[0]])
  })

  test('disabled selection columns become usable when enabled while column and row eligibility remain combined', async () => {
    const source = [...rows, { id: 3, name: 'Three' }]
    const disabled = (row: Row) => row.id === 2
    const selectionColumn: TableColumn<Row> = { type: 'selection', disabled }
    const rowCheckable = (row: Row) => row.id !== 3
    const wrapper = mount(C_Table<Row>, {
      props: {
        data: source,
        columns: [selectionColumn, businessColumn],
        config: { ...config, selection: { enabled: false, rowCheckable } },
      },
    })
    const api = wrapper.vm as unknown as TableInstance<Row>
    await flushPromises()
    const boxes = () => wrapper.findAllComponents(NCheckbox).slice(1)
    expect(boxes().map(box => box.props('disabled'))).toEqual([
      true,
      true,
      true,
    ])
    expect(boxes()[0].attributes('tabindex')).toBeUndefined()
    await boxes()[0].trigger('click')
    expect(wrapper.emitted('selection-change')).toBeUndefined()
    await wrapper.setProps({
      config: { ...config, selection: { enabled: true, rowCheckable } },
    })
    expect(boxes().map(box => box.props('disabled'))).toEqual([
      false,
      true,
      true,
    ])
    expect(boxes()[0].attributes('tabindex')).toBe('0')
    await boxes()[0].trigger('click')
    expect(api.getSelectedRows()).toEqual([source[0]])
    expect(wrapper.emitted('selection-change')?.at(-1)?.slice(0, 2)).toEqual([
      [1],
      [source[0]],
    ])
    expect(selectionColumn.disabled).toBe(disabled)
    expect(selectionColumn.disabled!(source[0])).toBe(false)
  })

  test('disabled selection does not activate the disabled expansion adapter or rewrite its native renderer', async () => {
    const renderExpand = () => h('div', 'Native detail')
    const onLoadData = vi.fn(async () => [])
    const wrapper = mount(C_Table<Row>, {
      props: {
        data: rows,
        columns: [
          { type: 'selection' },
          { type: 'expand', renderExpand },
          businessColumn,
        ],
        config: {
          ...config,
          selection: false,
          expand: { enabled: false, onLoadData },
        },
      },
    })
    await flushPromises()
    const columns = wrapper.getComponent(NDataTable).props('columns')!
    expect(columns.find(column => column.type === 'expand')?.renderExpand).toBe(
      renderExpand
    )
    expect(
      wrapper
        .findAllComponents(NCheckbox)
        .slice(1)
        .every(box => box.props('disabled'))
    ).toBe(true)
    expect(onLoadData).not.toHaveBeenCalled()
    await wrapper.setProps({
      config: { ...config, selection: false, expand: true },
    })
    expect(
      wrapper
        .findAllComponents(NCheckbox)
        .slice(1)
        .every(box => box.props('disabled'))
    ).toBe(true)
  })

  test('global selection options retain default checked rows and row eligibility', async () => {
    const { wrapper, api } = table(undefined, {
      defaultCheckedKeys: [1],
      rowCheckable: row => row.id === 1,
    })
    await flushPromises()
    expect(api.getSelectedRows()).toEqual([rows[0]])
    expect(wrapper.findAll('.n-checkbox')[1].attributes('aria-checked')).toBe(
      'true'
    )
    await wrapper.findAll('.n-checkbox')[2].trigger('click')
    expect(wrapper.findAll('.n-checkbox')[2].attributes('aria-checked')).toBe(
      'false'
    )
    expect(api.getSelectedRows()).toEqual([rows[0]])
  })

  test('in-place selection column insertion and removal update the inferred capability', async () => {
    const columns = ref<TableColumn<Row>[]>([businessColumn])
    const wrapper = mount(C_Table<Row>, {
      props: { data: rows, columns: columns.value, config },
    })
    const api = wrapper.vm as unknown as TableInstance<Row>
    await flushPromises()
    expect(wrapper.findAll('.n-checkbox')).toHaveLength(0)
    expect(api.selectRow(1)).toBe(false)

    columns.value.unshift({ type: 'selection' })
    await flushPromises()
    await wrapper.findAll('.n-checkbox')[1].trigger('click')
    expect(api.getSelectedRows()).toEqual([rows[0]])
    await wrapper.findAll('.n-checkbox')[1].trigger('click')
    expect(api.getSelectedRows()).toEqual([])

    columns.value.shift()
    await flushPromises()
    expect(wrapper.findAll('.n-checkbox')).toHaveLength(0)
    expect(api.selectRow(1)).toBe(false)
    expect(wrapper.emitted('selection-change')).toHaveLength(2)

    columns.value.unshift({ type: 'selection' })
    await flushPromises()
    await wrapper.findAll('.n-checkbox')[2].trigger('click')
    expect(api.getSelectedRows()).toEqual([rows[1]])
    expect(wrapper.emitted('selection-change')?.at(-1)?.slice(0, 2)).toEqual([
      [2],
      [rows[1]],
    ])
  })
})
