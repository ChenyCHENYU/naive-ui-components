import { expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, isRef, ref } from 'vue'
import {
  NAlert,
  NButton,
  NCard,
  NEmpty,
  NGrid,
  NGridItem,
  NMenu,
  NSpace,
} from 'naive-ui'
import C_Table from '../../src/components/C_Table/index.vue'
import C_Form from '../../src/components/C_Form/index.vue'
import C_Time from '../../src/components/C_Time/index.vue'
import C_Menu from '../../src/components/C_Menu/index.vue'
import { useRowEdit } from '../../src/components/C_Table/composables/useRowEdit'
import { useCellEdit } from '../../src/components/C_Table/composables/useCellEdit'
import { validateTableRule } from '../../src/components/C_Table/composables/tableValidation'
import { useWorkflowValidation } from '../../src/components/C_WorkFlow/composables/useWorkflowValidation'
import type {
  DataRecord,
  TableInstance,
} from '../../src/components/C_Table/types'
import type { WorkflowNode } from '../../src/components/C_WorkFlow/types'

test('required column is enforced in row and cell editing', async () => {
  const saveRow = vi.fn(),
    saveCell = vi.fn()
  const rows = [{ id: 1, name: '' }]
  const options = {
    data: () => rows,
    rowKey: (row: DataRecord) => row.id as number,
    columns: () => [{ key: 'name', title: 'Name', required: true }],
  }
  const row = useRowEdit({ ...options, onSave: saveRow })
  row.startEditRow(1)
  await row.saveEditRow()
  const cell = useCellEdit({ ...options, onSave: saveCell })
  cell.startEditCell(1, 'name')
  await cell.saveEditCell()
  expect({
    rowSaves: saveRow.mock.calls.length,
    cellSaves: saveCell.mock.calls.length,
  }).toEqual({ rowSaves: 0, cellSaves: 0 })
})

test('declared email rule rejects an invalid email', async () => {
  expect(
    await validateTableRule(
      { type: 'email', message: 'invalid email' },
      'not-an-email',
      'Email',
      {}
    )
  ).toBe('invalid email')
})

test('modal editor enforces rules declared on editProps', async () => {
  const onSave = vi.fn()
  const wrapper = mount(C_Table, {
    attachTo: document.body,
    global: {
      components: {
        NAlert,
        NButton,
        NCard,
        NEmpty,
        NGrid,
        NGridItem,
        NMenu,
        NSpace,
      },
    },
    props: {
      data: [{ id: 1, name: 'short' }],
      columns: [
        {
          key: 'name',
          title: 'Name',
          editProps: { rules: [{ min: 20, message: 'too short' }] },
        },
      ],
      config: {
        toolbar: { show: false },
        pagination: false,
        edit: { mode: 'modal', onSave },
      },
    },
  })
  const api = wrapper.vm as unknown as TableInstance
  api.startEdit(1)
  await vi.waitFor(() =>
    expect(wrapper.findComponent(C_Form).exists()).toBe(true)
  )
  await flushPromises()
  await api.saveEdit()
  expect(onSave).not.toHaveBeenCalled()
})

test('time and menu public instances unwrap top-level refs', async () => {
  const time = mount(C_Time, { props: { mode: 'single', modelValue: 1234 } })
  const menu = mount(C_Menu, {
    global: { components: { NMenu } },
    props: { options: [{ label: 'A', key: 'a' }] },
  })
  await flushPromises()
  expect(isRef(time.vm.singleTime)).toBe(false)
  expect(time.vm.singleTime).toBe(1234)
  expect(isRef(menu.vm.menuRef)).toBe(false)
  expect(typeof menu.vm.menuRef?.showOption).toBe('function')
})

test('workflow rejects imported whitespace-only conditions', () => {
  const nodes = ref<WorkflowNode[]>([
    {
      id: 'start',
      type: 'start',
      position: { x: 0, y: 0 },
      data: { title: 'Start', status: 'active' },
    },
    {
      id: 'condition',
      type: 'condition',
      position: { x: 0, y: 0 },
      data: {
        title: 'Condition',
        conditions: [
          {
            id: 'c1',
            name: ' ',
            field: 'amount',
            operator: 'equals',
            value: ' ',
          },
        ],
      },
    },
  ])
  let controller!: ReturnType<typeof useWorkflowValidation>
  mount(
    defineComponent({
      setup() {
        controller = useWorkflowValidation(
          nodes,
          ref([{ id: 'e1', source: 'start', target: 'condition' }]),
          ref(null)
        )
        return () => null
      },
    })
  )
  expect(controller.validateWorkflow()).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ field: 'conditions', type: 'incomplete' }),
    ])
  )
})

test('utility columns do not become invalid modal fields', async () => {
  const errors: string[] = []
  const wrapper = mount(C_Table, {
    attachTo: document.body,
    global: {
      components: { NAlert, NButton, NCard, NEmpty, NGrid, NGridItem, NSpace },
      config: { errorHandler: error => errors.push(String(error)) },
    },
    props: {
      data: [{ id: 1, name: 'A' }],
      columns: [
        { type: 'selection' },
        { type: 'index' },
        { key: 'name', title: 'Name' },
      ],
      config: { toolbar: { show: false }, pagination: false, edit: 'modal' },
    },
  })
  const api = wrapper.vm as unknown as TableInstance
  api.startEdit(1)
  await vi.waitFor(() =>
    expect(errors.length > 0 || wrapper.findComponent(C_Form).exists()).toBe(
      true
    )
  )
  await flushPromises()
  expect(errors).toEqual([])
})

test.each(['row', 'cell'] as const)(
  '%s editing disables native input while validating and restores it after failure',
  async mode => {
    let reject!: (error: Error) => void
    const pending = new Promise<void>((_resolve, decline) => {
      reject = decline
    })
    const onSave = vi.fn()
    const wrapper = mount(C_Table, {
      global: {
        components: { NButton, NCard, NAlert, NGrid, NGridItem, NSpace },
      },
      props: {
        data: [{ id: 1, name: 'Original' }],
        columns: [
          {
            key: 'name',
            title: 'Name',
            editProps: {
              disabled: false,
              rules: [
                {
                  asyncValidator: (_rule, value) =>
                    value === 'Valid' ? Promise.resolve() : pending,
                },
              ],
            },
          },
        ],
        config: {
          edit: { mode, onSave },
          toolbar: { show: false },
          pagination: false,
          feedback: { error: () => undefined },
        },
      },
    })
    const api = wrapper.vm as unknown as TableInstance
    api.startEdit(1, mode === 'cell' ? 'name' : undefined)
    await flushPromises()
    const save = api.saveEdit()
    await flushPromises()
    expect(wrapper.get('tbody input').attributes('disabled')).toBeDefined()
    reject(new Error('invalid'))
    await save
    await flushPromises()
    expect(onSave).not.toHaveBeenCalled()
    expect(wrapper.get('tbody input').attributes('disabled')).toBeUndefined()
    await wrapper.get('tbody input').setValue('Valid')
    await api.saveEdit()
    await flushPromises()
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(wrapper.find('tbody input').exists()).toBe(false)
  }
)
