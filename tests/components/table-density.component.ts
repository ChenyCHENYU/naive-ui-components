import { describe, expect, test, vi } from 'vitest'
import { computed, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { NDataTable, NInput, NPagination } from 'naive-ui'
import C_Table from '../../src/components/C_Table/index.vue'
import C_ActionBar from '../../src/components/C_ActionBar/index.vue'
import type { TableInstance } from '../../src/components/C_Table/types'

describe('C_Table density and mode integration', () => {
  test('CRUD persistence adapters do not execute until confirmation; explicit edit launchers win', async () => {
    const persistenceAdapter = vi.fn()
    const save = vi.fn()
    const override = vi.fn()
    const crud = {
      data: ref([{ id: 1, name: 'Original' }]),
      loading: ref(false),
      columns: computed(() => [{ key: 'name', title: 'Name' }]),
      actions: computed(() => ({ edit: persistenceAdapter })),
      save,
    }
    const wrapper = mount(C_Table, {
      props: {
        crud,
        config: { edit: 'row', pagination: false, toolbar: { show: false } },
      },
    })
    await wrapper.get('[title="编辑"]').trigger('click')
    await flushPromises()
    expect(
      wrapper.getComponent(NDataTable).findComponent(NInput).exists()
    ).toBe(true)
    expect(persistenceAdapter).not.toHaveBeenCalled()
    expect(save).not.toHaveBeenCalled()
    wrapper
      .getComponent(NDataTable)
      .getComponent(NInput)
      .vm.$emit('update:value', 'Changed')
    await (wrapper.vm as unknown as TableInstance).saveEdit()
    expect(save).toHaveBeenCalledTimes(1)
    expect(save.mock.calls[0][0]).toMatchObject({ id: 1, name: 'Changed' })
    expect(persistenceAdapter).not.toHaveBeenCalled()
    await wrapper.setProps({
      config: { edit: 'row', actions: { edit: override }, pagination: false },
    })
    await wrapper.get('[title="编辑"]').trigger('click')
    await flushPromises()
    expect(override).toHaveBeenCalledTimes(1)
    expect(
      wrapper.getComponent(NDataTable).findComponent(NInput).exists()
    ).toBe(false)
    wrapper.unmount()
  })

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
