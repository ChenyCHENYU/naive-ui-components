import { describe, expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import { h, ref } from 'vue'
import { NSelect, NInputNumber, NDatePicker } from 'naive-ui'
import C_Density from '../../src/components/C_Density/index.vue'
import {
  C_FilterBuilder,
  createFilterGroup,
  validateFilter,
  type FilterField,
  type FilterGroup,
  type FilterRule,
} from '../../src/components/C_FilterBuilder'

const fields = [
  { key: 'customer', label: 'Customer', type: 'text' },
  {
    key: 'amount',
    label: 'Amount',
    type: 'number',
    operators: ['gte', 'isEmpty'],
  },
  { key: 'overdue', label: 'Overdue', type: 'boolean' },
  { key: 'arrival', label: 'Arrival', type: 'date' },
  {
    key: 'quality',
    label: 'Quality',
    type: 'select',
    options: [
      { value: 0, label: 'Pending' },
      { value: 1, label: 'Closed', disabled: true },
    ],
  },
] satisfies FilterField[]

describe('C_FilterBuilder', () => {
  test('builds an AND/OR tree and clears values when the operator or field changes', async () => {
    const initial = Object.freeze(createFilterGroup())
    const filter = ref<FilterGroup>(initial)
    const wrapper = mount({
      setup: () => () =>
        h(
          C_Density,
          { density: 'compact' },
          {
            default: () =>
              h(C_FilterBuilder, {
                modelValue: filter.value,
                fields,
                maxDepth: 1,
                locale: { locale: 'en-US' },
                'onUpdate:modelValue': value => {
                  filter.value = value
                },
              }),
          }
        ),
    })
    const clickButton = async (label: string, group = 0) => {
      const buttons = wrapper
        .findAll('fieldset')[group]
        .findAll(':scope > .c-filter-builder__actions button')
        .filter(button => button.text() === label)
      await buttons[0].trigger('click')
    }

    await clickButton('Add condition')
    await wrapper.get('input[aria-label="Condition value"]').setValue('华东')
    await clickButton('Add group')
    expect(
      wrapper.findAll('button').filter(button => button.text() === 'Add group')
    ).toHaveLength(1)
    const selects = (label: string) =>
      wrapper
        .findAllComponents(NSelect)
        .filter(select => select.attributes('aria-label') === label)
    selects('Match conditions')[1].vm.$emit('update:value', 'or')
    await wrapper.vm.$nextTick()
    await clickButton('Add condition', 1)
    const fieldSelect = selects('Field')[1]
    expect(fieldSelect.props('size')).toBe('small')
    fieldSelect.vm.$emit('update:value', 'amount')
    await wrapper.vm.$nextTick()
    const numeric = wrapper.getComponent(NInputNumber)
    expect(numeric.props('value')).toBeNull()
    numeric.vm.$emit('update:value', 0)
    await wrapper.vm.$nextTick()
    expect(validateFilter(filter.value, fields)).toEqual([])
    expect(filter.value).toMatchObject({
      operator: 'and',
      children: [
        {
          type: 'rule',
          field: 'customer',
          operator: 'contains',
          value: '华东',
        },
        {
          type: 'group',
          operator: 'or',
          children: [
            { type: 'rule', field: 'amount', operator: 'gte', value: 0 },
          ],
        },
      ],
    })
    expect(initial.children).toEqual([])
    expect(selects('Operator')[1].props('options')).toEqual([
      { value: 'gte', label: 'At least' },
      { value: 'isEmpty', label: 'Is empty' },
    ])
    selects('Operator')[1].vm.$emit('update:value', 'isEmpty')
    await wrapper.vm.$nextTick()
    expect(wrapper.findComponent(NInputNumber).exists()).toBe(false)
    expect(filter.value.children[1]).toMatchObject({
      children: [{ operator: 'isEmpty', value: null }],
    })
    fieldSelect.vm.$emit('update:value', 'overdue')
    await wrapper.vm.$nextTick()
    selects('Condition value')[0].vm.$emit('update:value', 'false')
    await wrapper.vm.$nextTick()
    expect(filter.value.children[1]).toMatchObject({
      children: [{ operator: 'eq', field: 'overdue', value: false }],
    })
    await wrapper.get('[aria-label="Remove group"]').trigger('click')
    expect(wrapper.findAll('fieldset')).toHaveLength(1)
    expect(filter.value.children).toHaveLength(1)
    wrapper.unmount()
  })

  test('reports stale fields and impossible dates without mutating a persisted model', async () => {
    const model = {
      ...createFilterGroup(),
      children: [
        {
          id: 'removed',
          type: 'rule',
          field: 'oldField',
          operator: 'eq',
          value: 0,
        },
        {
          id: 'date',
          type: 'rule',
          field: 'arrival',
          operator: 'eq',
          value: '2026-02-30',
        },
      ],
    } satisfies FilterGroup
    const wrapper = mount(C_FilterBuilder, {
      props: {
        modelValue: model,
        fields,
        disabled: true,
        locale: { locale: 'en-US' },
      },
    })
    expect(wrapper.text()).toContain('Select an available field')
    expect(wrapper.text()).toContain('Enter a valid condition value')
    expect(wrapper.getComponent(NDatePicker).props('formattedValue')).toBeNull()
    await wrapper.get('button[aria-label="Remove condition"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(model.children[1].value).toBe('2026-02-30')
    wrapper.unmount()
  })

  test('handles depth-restricted stored groups without dropping them', () => {
    const model = {
      ...createFilterGroup(),
      children: [createFilterGroup('prior-depth')],
    }
    const wrapper = mount(C_FilterBuilder, {
      props: {
        modelValue: model,
        fields,
        maxDepth: 0,
        locale: { locale: 'en-US' },
      },
    })
    expect(wrapper.findAll('fieldset')).toHaveLength(1)
    expect(wrapper.text()).toContain(
      'The group exceeds the maximum nesting depth'
    )
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    wrapper.unmount()
  })
})

describe('validateFilter', () => {
  const rule = (
    id: string,
    field: string,
    value: FilterRule['value']
  ): FilterRule => ({ id, type: 'rule', field, operator: 'eq', value })

  test('accepts populated false, zero, and real leap dates', () => {
    const model: FilterGroup = {
      ...createFilterGroup(),
      children: [
        { ...rule('amount', 'amount', 0), operator: 'gte' },
        rule('choice', 'quality', 0),
        rule('bool', 'overdue', false),
        rule('date', 'arrival', '2024-02-29'),
      ],
    }
    expect(validateFilter(model, fields)).toEqual([])
  })

  test('reports invalid payloads with paths and preserves the root empty state', () => {
    const root = createFilterGroup()
    expect(validateFilter(root, fields)).toEqual([])
    const model: FilterGroup = {
      ...root,
      children: [
        rule('text', 'customer', '  '),
        { ...rule('amount', 'amount', 0), operator: 'contains' },
        rule('text', 'quality', 1),
        createFilterGroup('empty'),
      ],
    }
    expect(validateFilter(model, fields)).toEqual([
      { code: 'invalidValue', path: [0] },
      { code: 'invalidOperator', path: [1] },
      { code: 'duplicateId', path: [2] },
      { code: 'invalidValue', path: [2] },
      { code: 'emptyGroup', path: [3] },
    ])
  })
})
