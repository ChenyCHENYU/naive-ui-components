import { describe, expect, test } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { h } from 'vue'
import { NSelect } from 'naive-ui'
import C_Table from '../../src/components/C_Table/index.vue'
import type {
  DataRecord,
  TableInstance,
} from '../../src/components/C_Table/types'

const quiet = {
  success: () => undefined,
  warning: () => undefined,
  error: () => undefined,
}

describe('C_Table combined feature contracts', () => {
  test('remote pages retain selected rows and emit one event per user transition', async () => {
    const wrapper = mount(C_Table<DataRecord>, {
      props: {
        data: [{ id: 1, name: 'first' }],
        columns: [{ type: 'selection' }, { key: 'name', title: 'Name' }],
        config: {
          toolbar: { show: false },
          selection: true,
          crossPageSelection: true,
          pagination: { remote: true, total: 2, pageSize: 1 },
        },
      },
    })
    await flushPromises()
    await wrapper.findAll('.n-checkbox')[1].trigger('click')
    await flushPromises()
    expect(wrapper.emitted('selection-change')).toHaveLength(1)
    await wrapper.setProps({ data: [{ id: 2, name: 'second' }] })
    await flushPromises()
    await wrapper.findAll('.n-checkbox')[1].trigger('click')
    await flushPromises()
    expect(wrapper.emitted('selection-change')!.map(event => event[0])).toEqual(
      [[1], [1, 2]]
    )
    expect(wrapper.emitted('selection-change')!.at(-1)![0]).toEqual([1, 2])
    const instance = wrapper.vm as unknown as TableInstance<{
      id: number
      name: string
    }>
    expect(instance.getSelectedRows().map(row => row.name)).toEqual([
      'first',
      'second',
    ])
    instance.clearSelection()
    await flushPromises()
    expect(wrapper.emitted('selection-change')).toHaveLength(3)
    expect(instance.getSelectedRows()).toEqual([])
  })

  test('failed expansion makes one request and offers an explicit retry', async () => {
    let calls = 0
    const wrapper = mount(C_Table<DataRecord>, {
      props: {
        data: [{ id: 1 }],
        columns: [{ type: 'expand' }, { key: 'id', title: 'ID' }],
        config: {
          toolbar: { show: false },
          pagination: false,
          feedback: quiet,
          expand: {
            defaultExpandedKeys: [1],
            onLoadData: async () => {
              calls++
              if (calls === 1) throw new Error('offline')
              return [{ id: 'child', name: 'loaded' }]
            },
          },
        },
      },
    })
    await flushPromises()
    await flushPromises()
    expect(calls).toBe(1)
    expect(wrapper.get('[role="alert"]').text()).toContain('加载失败')
    const retry = wrapper
      .findAll('button')
      .find(button => button.text() === '重试')!
    await retry.trigger('click')
    await flushPromises()
    expect(calls).toBe(2)
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('loaded')
  })

  test('custom cell editor receives row context and clearing remains null through save', async () => {
    const source = [{ id: 7, role: 'admin' }]
    const contexts: Array<[object, number]> = []
    const saved: DataRecord[] = []
    const wrapper = mount(C_Table<DataRecord>, {
      props: {
        data: source,
        columns: [
          {
            key: 'role',
            title: 'Role',
            render: (row: DataRecord) => h('span', String(row.role)),
            editRender: (
              value: unknown,
              row: DataRecord,
              index: number,
              { onUpdate }: { onUpdate: (value: unknown) => void }
            ) => {
              contexts.push([row, index])
              return h(NSelect, {
                value: value as string | null,
                clearable: true,
                options: [{ label: 'Admin', value: 'admin' }],
                'onUpdate:value': onUpdate,
              })
            },
          },
        ],
        config: {
          toolbar: { show: false },
          pagination: false,
          edit: {
            mode: 'cell',
            onSave: (row: DataRecord) => {
              saved.push(row)
            },
          },
        },
      },
    })
    const instance = wrapper.vm as unknown as TableInstance
    instance.startEdit(7, 'role')
    await flushPromises()
    expect(contexts.at(-1)).toEqual([source[0], 0])
    wrapper.getComponent(NSelect).vm.$emit('update:value', null)
    await flushPromises()
    expect(wrapper.getComponent(NSelect).props('value')).toBeNull()
    expect(source[0].role).toBe('admin')
    await instance.saveEdit()
    expect(saved[0].role).toBeNull()
  })

  test('tree descendants can be selected and edited without changing the original tree', async () => {
    const source = [
      { id: 1, name: 'parent', children: [{ id: 2, name: 'child' }] },
    ]
    const wrapper = mount(C_Table<DataRecord>, {
      props: {
        data: source,
        columns: [{ type: 'selection' }, { key: 'name', title: 'Name' }],
        config: {
          toolbar: { show: false },
          pagination: false,
          tree: { defaultExpandAll: true },
          selection: true,
          edit: { mode: 'row' },
        },
      },
    })
    await flushPromises()
    const instance = wrapper.vm as unknown as TableInstance
    instance.selectRow(2)
    await flushPromises()
    expect(wrapper.emitted('selection-change')).toHaveLength(1)
    expect(wrapper.emitted('selection-change')![0][0]).toEqual([2])
    instance.startEdit(2)
    await flushPromises()
    const editing = instance.getEditingData()!
    editing.name = 'changed'
    await instance.saveEdit()
    const update = wrapper.emitted('update:data')!.at(-1)![0] as typeof source
    expect(update[0].children[0].name).toBe('changed')
    expect(source[0].children[0].name).toBe('child')
  })

  test('dynamic row insertion uses the table string row key', () => {
    const wrapper = mount(C_Table<DataRecord>, {
      props: {
        data: [{ uuid: 'existing', name: 'First' }],
        rowKey: 'uuid',
        columns: [{ key: 'name', title: 'Name' }],
        config: {
          toolbar: { show: false },
          pagination: false,
          feedback: quiet,
          dynamicRows: true,
        },
      },
    })
    ;(wrapper.vm as unknown as TableInstance).addRow()
    const update = wrapper.emitted('update:data')!.at(-1)![0] as DataRecord[]
    expect(typeof update[1].uuid).toBe('string')
    expect(update[1].uuid).not.toBe('existing')
  })
})
