import { describe, expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { NButton, NEmpty, NForm, NGrid, NGridItem, NSpace } from 'naive-ui'
import C_Table from '../../src/components/C_Table/index.vue'
import C_Form from '../../src/components/C_Form/index.vue'
import type { TableInstance } from '../../src/components/C_Table/types'

const formChunk = vi.hoisted(() => {
  let resolve!: () => void
  const ready = new Promise<void>(complete => {
    resolve = complete
  })
  return { ready, resolve: () => resolve() }
})
vi.mock('../../src/components/C_Form', async importOriginal => {
  await formChunk.ready
  return importOriginal()
})

interface Row {
  id: number
  name: string
}

const components = { NButton, NEmpty, NGrid, NGridItem, NSpace }
const source = (): Row[] => [
  { id: 1, name: 'First' },
  { id: 2, name: 'Second' },
]

function mountModal(onSave = vi.fn()) {
  const data = source()
  const wrapper = mount(C_Table<Row>, {
    attachTo: document.body,
    global: { components },
    props: {
      data,
      columns: [{ key: 'name', title: 'Name', required: true }],
      config: {
        toolbar: { show: false },
        pagination: false,
        edit: { mode: 'modal', onSave },
      },
    },
  })
  const api = wrapper.vm as unknown as TableInstance<Row>
  const saveButton = () => {
    const button = wrapper
      .findAllComponents(NButton)
      .find(candidate => candidate.text() === '保存')
    expect(button, 'the real teleported modal save button').toBeDefined()
    return button!
  }
  return { wrapper, api, data, onSave, saveButton }
}

describe('table modal asynchronous form ownership', () => {
  test('async form loading guards button and public saves, then saves the current model', async () => {
    const { wrapper, api, onSave, saveButton } = mountModal()
    api.startEdit(1)
    await flushPromises()
    expect(wrapper.findComponent(C_Form).exists()).toBe(false)
    expect(saveButton().props('disabled')).toBe(true)
    await saveButton().trigger('click')
    expect(onSave).not.toHaveBeenCalled()

    try {
      await api.saveEdit()
      expect(onSave).not.toHaveBeenCalled()
    } finally {
      formChunk.resolve()
    }
    await vi.waitFor(() =>
      expect(wrapper.findComponent(C_Form).exists()).toBe(true)
    )
    await flushPromises()
    expect(saveButton().props('disabled')).toBe(false)
    await saveButton().trigger('click')
    await flushPromises()
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave.mock.calls[0][0]).toEqual({ id: 1, name: 'First' })
    expect(wrapper.emitted('update:data')).toHaveLength(1)

    api.startEdit(1)
    await flushPromises()
    await wrapper.getComponent(C_Form).get('input').setValue('Updated')
    await api.saveEdit()
    await flushPromises()
    expect(onSave).toHaveBeenCalledTimes(2)
    expect(onSave.mock.calls[1][0]).toEqual({ id: 1, name: 'Updated' })
  })

  test.each(['model', 'target', 'cancel', 'unmount'] as const)(
    'a pending real form validation cannot save after a %s change',
    async change => {
      const { wrapper, api, data, onSave, saveButton } = mountModal()
      api.startEdit(1)
      await vi.waitFor(() =>
        expect(wrapper.findComponent(C_Form).exists()).toBe(true)
      )
      await flushPromises()
      let resolveValidation!: () => void
      const validation = new Promise<{ warnings: undefined }>(resolve => {
        resolveValidation = () => resolve({ warnings: undefined })
      })
      const validate = vi
        .spyOn(wrapper.getComponent(NForm).vm, 'validate')
        .mockImplementation(() => validation)
      await saveButton().trigger('click')
      expect(validate).toHaveBeenCalledTimes(1)

      if (change === 'model') {
        await wrapper.getComponent(C_Form).get('input').setValue('Changed')
      } else if (change === 'target') {
        api.startEdit(2)
      } else if (change === 'cancel') {
        api.cancelEdit()
      } else {
        wrapper.unmount()
      }
      await flushPromises()
      resolveValidation()
      await flushPromises()
      expect(onSave).not.toHaveBeenCalled()
      expect(wrapper.emitted('update:data')).toBeUndefined()
      expect(data).toEqual(source())
    }
  )
})
