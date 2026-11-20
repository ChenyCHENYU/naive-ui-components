import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { describe, expect, test, vi } from 'vitest'
import C_DataPicker from '../../src/components/C_DataPicker/index.vue'
import {
  createDataPickerField,
  type DataPickerFieldSelection,
} from '../../src/components/C_DataPicker'
import type { DataPickerProps } from '../../src/components/C_DataPicker/types'
import C_Form from '../../src/components/C_Form/index.vue'

interface Entity {
  key: number
  label: string
  quantity: number
  active: boolean
}

const zero: Entity = { key: 0, label: '零号', quantity: 0, active: false }
const second: Entity = { key: 2, label: '二号', quantity: 2, active: true }
const source: DataPickerProps<Entity>['source'] = {
  rowKey: 'key',
  label: row => row.label,
  request: async () => ({ rows: [zero, second], total: 2 }),
}

interface Draft {
  entity: number | readonly number[] | null
  details: { quantity: number | null; label: string | null }
  active: boolean | null
  notes: string
}

function mountDraft(
  mapFields: (
    context: DataPickerFieldSelection<Entity>
  ) => Record<string, unknown> | undefined,
  multiple = false
) {
  const draft = ref<Draft>({
    entity: multiple ? [2] : 2,
    details: { quantity: 2, label: '手工备注' },
    active: true,
    notes: '保留',
  })
  const updates: Draft[] = []
  const callbacks: [string, Draft['entity']][] = []
  const onError = vi.fn()
  const renderer = createDataPickerField({
    source,
    columns: [],
    clearable: true,
    multiple,
    mapFields,
    'onUpdate:modelValue': () => {
      callbacks.push(['update', draft.value.entity])
    },
    onSelect: () => {
      callbacks.push(['select', draft.value.entity])
    },
  })
  const renderers = { 'entity-picker': renderer }
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(C_Form<Draft>, {
          modelValue: draft.value,
          'onUpdate:modelValue': value => {
            updates.push({ ...value, details: { ...value.details } })
            draft.value = value
          },
          options: [{ type: 'entity-picker', prop: 'entity' }],
          renderers,
        }),
    }),
    { global: { config: { errorHandler: onError } } }
  )
  function select(value: number | number[] | null, rows: Entity[]) {
    const picker = wrapper.getComponent(C_DataPicker<Entity>)
    picker.vm.$emit('update:modelValue', value)
    picker.vm.$emit('select', rows)
  }
  return { wrapper, draft, updates, callbacks, onError, select }
}

describe('entity field patch', () => {
  test('publishes the value and related fields together, keeps same-identity edits, and clears explicitly', async () => {
    const mapFields = vi.fn(({ rows }: DataPickerFieldSelection<Entity>) => ({
      'details.quantity': rows[0]?.quantity ?? null,
      'details.label': rows[0]?.label ?? null,
      active: rows[0]?.active ?? null,
    }))
    const { wrapper, draft, updates, callbacks, select } = mountDraft(mapFields)
    try {
      await flushPromises()
      updates.length = 0
      select(2, [second])
      await flushPromises()
      expect(draft.value.details.label).toBe('手工备注')
      expect(mapFields).not.toHaveBeenCalled()
      callbacks.length = 0
      select(0, [zero])
      await flushPromises()
      expect(updates).toEqual([
        {
          entity: 0,
          details: { quantity: 0, label: '零号' },
          active: false,
          notes: '保留',
        },
      ])
      expect(callbacks).toEqual([
        ['update', 0],
        ['select', 0],
      ])
      await wrapper.get('.c-data-picker__clear').trigger('click')
      await flushPromises()
      expect(draft.value).toEqual({
        entity: null,
        details: { quantity: null, label: null },
        active: null,
        notes: '保留',
      })
    } finally {
      wrapper.unmount()
    }
  })

  test('uses the live previous value and keeps the primary value when no patch is returned', async () => {
    const transitions: [unknown, unknown][] = []
    const { wrapper, draft, select, updates } = mountDraft(
      ({ previousValue, value }) => {
        transitions.push([previousValue, value])
        return undefined
      },
      true
    )
    try {
      await flushPromises()
      updates.length = 0
      select([2, 0], [second, zero])
      select([0, 2], [zero, second])
      select([0, 2], [])
      await flushPromises()
      expect(transitions).toEqual([
        [[2], [2, 0]],
        [
          [2, 0],
          [0, 2],
        ],
      ])
      expect(updates).toHaveLength(1)
      expect(draft.value.entity).toEqual([0, 2])
      expect(draft.value.details.label).toBe('手工备注')
    } finally {
      wrapper.unmount()
    }
  })

  test('invalid paths and async or rejected maps cannot partially write or apply later', async () => {
    const mapFields = vi.fn<Parameters<typeof mountDraft>[0]>()
    const { wrapper, draft, updates, select, onError } = mountDraft(mapFields)
    try {
      await flushPromises()
      updates.length = 0
      mapFields.mockReturnValueOnce({
        'details.label': '待拒绝',
        'constructor.untrusted': 1,
      })
      select(0, [zero])
      await flushPromises()
      expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(TypeError)
      expect(updates).toEqual([])

      let resolve!: (value: Record<string, unknown>) => void
      const late = new Promise<Record<string, unknown>>(done => {
        resolve = done
      })
      mapFields.mockReturnValueOnce(late as unknown as Record<string, unknown>)
      select(0, [zero])
      await flushPromises()
      expect(onError.mock.calls[1]?.[0]).toBeInstanceOf(TypeError)
      expect(updates).toEqual([])

      mapFields.mockReturnValueOnce(
        Promise.reject(new Error('late failure')) as unknown as Record<
          string,
          unknown
        >
      )
      select(0, [zero])
      await flushPromises()
      expect(onError.mock.calls[2]?.[0]).toBeInstanceOf(TypeError)
      expect(updates).toEqual([])

      mapFields.mockReturnValueOnce({ 'details.label': '采用此处' })
      select(0, [zero])
      resolve({ 'details.label': '不应覆盖' })
      await flushPromises()
      expect(draft.value).toEqual({
        entity: 0,
        details: { quantity: 2, label: '采用此处' },
        active: true,
        notes: '保留',
      })
      expect(updates).toHaveLength(1)
    } finally {
      wrapper.unmount()
    }
  })
})
