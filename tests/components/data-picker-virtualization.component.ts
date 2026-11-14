/** 候选分页按实际行数选择渲染方式，切换方式不改变选择会话。 */
import { expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { NDataTable, NInput, NPagination } from 'naive-ui'
import C_DataPicker from '../../src/components/C_DataPicker/index.vue'
import C_Table from '../../src/components/C_Table/index.vue'
import type { DataPickerSourceInput } from '../../src/components/C_DataPicker/types'
import type { TableInstance } from '../../src/components/C_Table/types'

interface Entity {
  id: number
  name: string
}

const entities: Entity[] = Array.from({ length: 61 }, (_, id) => ({
  id,
  name: `E${String(id).padStart(3, '0')}`,
}))
const columns = [{ key: 'name', title: '名称' }]
const settle = async () => {
  await flushPromises()
  await flushPromises()
}

test.each([30, 31])(
  'candidate count %i controls the real table delegate independently of pageSize',
  async count => {
    const source: DataPickerSourceInput<Entity> = {
      rowKey: 'id',
      label: row => row.name,
      request: async () => ({ rows: entities.slice(0, count), total: count }),
    }
    const wrapper = mount(C_DataPicker<Entity>, {
      props: { source, columns, pageSize: 50 },
    })
    await wrapper.get('.c-data-picker__open').trigger('click')
    await settle()
    await vi.waitFor(() =>
      expect(wrapper.findComponent(NDataTable).exists()).toBe(true)
    )

    const table = wrapper.getComponent(NDataTable)
    expect(table.props('virtualScroll')).toBe(count > 30)
    expect(table.props('maxHeight')).toBe(360)
    expect(table.find('.v-vl').exists()).toBe(count > 30)
    wrapper.unmount()
  }
)

test('pagination and query can switch native and virtual delegates without losing the selection draft', async () => {
  const source: DataPickerSourceInput<Entity> = {
    rowKey: 'id',
    label: row => row.name,
    request: vi.fn(async ({ page, pageSize, search }) => {
      const rows = search ? entities.slice(0, 10) : entities
      return {
        rows: rows.slice((page - 1) * pageSize, page * pageSize),
        total: rows.length,
      }
    }),
    resolve: vi.fn(async values =>
      entities.filter(row => values.includes(row.id))
    ),
  }
  const wrapper = mount(C_DataPicker<Entity>, {
    props: {
      source,
      columns,
      pageSize: 31,
      multiple: true,
      revalidateOnConfirm: true,
    },
  })
  const select = async (id: number) => {
    // VTU 不保留泛型 SFC 的 defineExpose，按组件公开实例契约读取。
    const table = wrapper.getComponent(C_Table)
      .vm as unknown as TableInstance<Entity>
    expect(table.selectRow(id)).toBe(true)
    await settle()
  }
  const search = async (value: string) => {
    wrapper.getComponent(NInput).vm.$emit('update:value', value)
    await settle()
    const button = wrapper
      .getComponent(NInput)
      .element.closest('form')
      ?.querySelector('button')
    if (!button) throw new Error('Missing search action')
    button.click()
    await settle()
  }
  await wrapper.get('.c-data-picker__open').trigger('click')
  await settle()
  await vi.waitFor(() =>
    expect(wrapper.findComponent(NDataTable).exists()).toBe(true)
  )
  expect(wrapper.getComponent(NDataTable).props('virtualScroll')).toBe(true)
  await select(0)

  wrapper.getComponent(NPagination).vm.$emit('update:page', 2)
  await settle()
  expect(wrapper.getComponent(NDataTable).props('virtualScroll')).toBe(false)
  expect(wrapper.getComponent(NDataTable).props('maxHeight')).toBe(360)
  await select(31)

  await search('short')
  expect(wrapper.getComponent(NDataTable).props('virtualScroll')).toBe(false)
  expect(source.request).toHaveBeenLastCalledWith(
    expect.objectContaining({ page: 1, search: 'short' })
  )
  await search('')
  expect(wrapper.getComponent(NDataTable).props('virtualScroll')).toBe(true)
  expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  expect(await wrapper.vm.confirm()).toBe(true)
  expect(source.resolve).toHaveBeenLastCalledWith(
    [0, 31],
    expect.any(AbortSignal)
  )
  expect(wrapper.emitted('update:modelValue')).toEqual([[[0, 31]]])
  expect(wrapper.emitted('select')).toEqual([[[entities[0], entities[31]]]])
  wrapper.unmount()
})
