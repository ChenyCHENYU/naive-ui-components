import { describe, expect, test } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { NDataTable, NInput, NPagination } from 'naive-ui'
import C_Table from '../../src/components/C_Table/index.vue'
import C_ActionBar from '../../src/components/C_ActionBar/index.vue'
import type { TableInstance } from '../../src/components/C_Table/types'

describe('C_Table density and mode integration', () => {
  test('live density reaches table, editor, pagination and actions without losing a draft', async () => {
    const wrapper = mount(C_Table, {
      props: {
        columns: [{ key: 'name', title: 'Name' }],
        data: [{ id: 1, name: 'Original' }],
        config: {
          density: 'compact',
          edit: 'row',
          toolbar: { actions: [{ key: 'refresh' }] },
        },
      },
    })
    const api = wrapper.vm as unknown as TableInstance
    api.startEdit(1)
    await flushPromises()
    expect(wrapper.getComponent(NDataTable).props('size')).toBe('small')
    expect(
      wrapper.getComponent(NDataTable).getComponent(NInput).props('size')
    ).toBe('small')
    expect(wrapper.getComponent(NPagination).props('size')).toBe('small')
    expect(wrapper.getComponent(C_ActionBar).props('config')).toMatchObject({
      size: 'small',
      compact: true,
    })
    wrapper
      .getComponent(NDataTable)
      .getComponent(NInput)
      .vm.$emit('update:value', 'Draft')
    await flushPromises()
    await wrapper.setProps({
      config: {
        density: 'comfortable',
        edit: 'row',
        toolbar: { actions: [{ key: 'refresh' }] },
      },
    })
    expect(api.getEditingData()?.name).toBe('Draft')
    expect(
      wrapper.getComponent(NDataTable).getComponent(NInput).props('size')
    ).toBe('large')
    expect(wrapper.getComponent(NDataTable).props('size')).toBe('large')
    expect(wrapper.classes()).toContain('c-table-wrapper--comfortable')
    await wrapper.setProps({ config: { density: 'compact', edit: 'cell' } })
    expect(
      wrapper.getComponent(NDataTable).findComponent(NInput).exists()
    ).toBe(false)
    api.startEdit(1, 'name')
    await flushPromises()
    expect(
      wrapper.getComponent(NDataTable).getComponent(NInput).props('value')
    ).toBe('Original')
    expect(
      wrapper.getComponent(NDataTable).getComponent(NInput).props('size')
    ).toBe('small')
    await wrapper.setProps({ config: { edit: 'none' } })
    expect(
      wrapper.getComponent(NDataTable).findComponent(NInput).exists()
    ).toBe(false)
    expect(wrapper.classes()).not.toContain('c-table-wrapper--compact')
    expect(wrapper.emitted('update:data')).toBeUndefined()
    wrapper.unmount()
  })
})
