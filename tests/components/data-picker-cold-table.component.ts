import { expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import C_DataPicker from '../../src/components/C_DataPicker/index.vue'
import type { TableInstance } from '../../src/components/C_Table/types'

const tableChunk = vi.hoisted(() => {
  let finish!: () => void
  return {
    pending: new Promise<void>(resolve => {
      finish = resolve
    }),
    finish: () => finish(),
  }
})

vi.mock('../../src/components/C_Table/index.vue', async importOriginal => {
  await tableChunk.pending
  return importOriginal()
})

test('a cold table chunk rejects the loading placeholder ref and restores selection when the real API arrives', async () => {
  const row = { id: 0, name: 'Zero' }
  const wrapper = mount(C_DataPicker<typeof row>, {
    props: {
      source: {
        rowKey: 'id',
        label: value => value.name,
        request: async () => ({ rows: [row], total: 1 }),
        resolve: async () => [row],
      },
      columns: [{ key: 'name', title: 'Name' }],
      modelValue: 0,
      presentation: 'inline',
    },
  })
  try {
    await wrapper.get('.c-data-picker__open').trigger('click')
    await flushPromises()
    const state = wrapper
      .getComponent({ name: 'PickerPanel' })
      .props('state') as {
      setTable: (instance: TableInstance<typeof row> | null) => void
    }
    const capture = vi.spyOn(state, 'setTable')
    // Cross the real async component's default 200 ms loading delay.
    await new Promise(resolve => setTimeout(resolve, 250))
    await flushPromises()
    expect(capture).toHaveBeenCalledWith(null)
    expect(wrapper.findComponent({ name: 'C_Table' }).exists()).toBe(false)

    tableChunk.finish()
    await vi.waitFor(
      () => {
        const table = wrapper.findComponent({ name: 'C_Table' })
        expect(table.exists()).toBe(true)
        const api = table.vm as unknown as TableInstance<typeof row>
        expect(api.getSelectedRows()).toEqual([row])
        expect(capture).toHaveBeenCalledWith(
          expect.objectContaining({
            clearSelection: expect.any(Function),
            selectRow: expect.any(Function),
            unselectRow: expect.any(Function),
          })
        )
      },
      { timeout: 5000 }
    )
  } finally {
    tableChunk.finish()
    wrapper.unmount()
  }
})
