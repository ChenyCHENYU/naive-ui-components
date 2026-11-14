import { describe, expect, test } from 'bun:test'
import { useDynamicFormState } from '../src/components/C_Form/composables/useDynamicFormState'
import type { FormOption } from '../src/components/C_Form/types'

describe('dynamic form visibility contract', () => {
  test('initially hidden dynamic fields stay out of the visible field list', () => {
    const form = useDynamicFormState()
    form.addField({ id: 'internal-id', prop: 'comment', visible: false })

    expect(form.allFields.value[0]?.show).toBe(false)
    expect(form.visibleFields.value).toEqual([])
    expect(form.hiddenFieldsCount.value).toBe(1)
    expect(form.allVisible.value).toBe(false)

    // 控制器按 prop 操作；初始显隐是默认值，后续手动操作可以显示字段。
    expect(form.toggleFieldVisibility('internal-id')).toBe(false)
    expect(form.toggleFieldVisibility('comment')).toBe(true)
    expect(form.visibleFields.value.map(field => field.prop)).toEqual([
      'comment',
    ])
    expect(form.hiddenFieldsCount.value).toBe(0)
    expect(form.toggleFieldVisibility('comment')).toBe(false)
    expect(form.visibleFields.value).toEqual([])
  })

  test('base field visibility, counts and toggle return values agree', () => {
    const fields: FormOption[] = [
      { type: 'input', prop: 'name' },
      { type: 'input', prop: 'secret', show: false },
    ]
    const form = useDynamicFormState()
    form.initialize(fields)

    expect(form.visibleFields.value.map(field => field.prop)).toEqual(['name'])
    expect(form.hiddenFieldsCount.value).toBe(1)
    expect(form.toggleFieldVisibility('name')).toBe(false)
    expect(form.visibleFields.value).toEqual([])
    expect(form.hiddenFieldsCount.value).toBe(2)
    expect(form.toggleFieldVisibility('secret')).toBe(true)
    expect(form.visibleFields.value.map(field => field.prop)).toEqual([
      'secret',
    ])
    expect(form.toggleFieldVisibility('unknown')).toBe(false)
    expect(form.hiddenFieldsCount.value).toBe(1)
    expect(fields[0]?.show).toBeUndefined()
    expect(fields[1]?.show).toBe(false)
  })

  test('toggle all includes base and dynamic fields and reports the actual result', () => {
    const form = useDynamicFormState()
    form.initialize([{ type: 'input', prop: 'name', show: false }])
    form.addField({ prop: 'comment', visible: false })
    form.addField({ prop: 'quantity' })

    expect(form.toggleAllVisibility()).toBe(true)
    expect(form.visibleFields.value.map(field => field.prop)).toEqual([
      'name',
      'comment',
      'quantity',
    ])
    expect(form.hiddenFieldsCount.value).toBe(0)
    expect(form.toggleAllVisibility()).toBe(false)
    expect(form.visibleFields.value).toEqual([])
    expect(form.hiddenFieldsCount.value).toBe(3)
    expect(form.toggleAllVisibility()).toBe(true)
    expect(form.allVisible.value).toBe(true)
  })

  test('removal and clear release only dynamic visibility state', () => {
    const form = useDynamicFormState()
    form.initialize([{ type: 'input', prop: 'name', show: false }])
    form.addField({ prop: 'comment', visible: false })
    form.addField({ prop: 'pinned', removable: false, visible: false })

    expect(form.removeField(1)).toBeNull()
    expect(form.hiddenFieldsCount.value).toBe(3)
    expect(form.removeField(0)?.prop).toBe('comment')
    expect(form.hiddenFieldsCount.value).toBe(2)
    form.addField({ prop: 'comment' })
    expect(form.visibleFields.value.map(field => field.prop)).toEqual([
      'comment',
    ])
    expect(form.clearDynamicFields()).toBe(2)
    expect(form.hiddenFieldsCount.value).toBe(1)
    expect(form.visibleFields.value).toEqual([])
    expect(form.toggleAllVisibility()).toBe(true)
    expect(form.visibleFields.value.map(field => field.prop)).toEqual(['name'])
  })

  test('initialization resets manual overrides and dynamic state without mutating inputs', () => {
    const fields: FormOption[] = [{ type: 'input', prop: 'name', show: false }]
    const form = useDynamicFormState()
    form.initialize(fields, { maxFields: 1 })
    form.toggleFieldVisibility('name')
    form.addField({ prop: 'comment', visible: false })
    form.initialize(fields)

    expect(form.dynamicFieldsCount.value).toBe(0)
    expect(form.state.config.maxFields).toBe(20)
    expect(form.hiddenFieldsCount.value).toBe(1)
    expect(form.visibleFields.value).toEqual([])
    expect(form.state.fieldCounter).toBe(0)
    expect(form.state.isInitialized).toBe(true)
    expect(fields[0]?.show).toBe(false)

    form.initialize([])
    expect(form.hiddenFieldsCount.value).toBe(0)
    expect(form.allVisible.value).toBe(true)
    expect(form.toggleAllVisibility()).toBe(true)
  })

  test('exported hidden props match runtime visibility and controllers stay isolated', () => {
    const first = useDynamicFormState()
    const second = useDynamicFormState()
    first.initialize([{ type: 'input', prop: 'name', show: false }])
    second.initialize([{ type: 'input', prop: 'name' }])
    first.addField({ prop: 'comment', visible: false })
    first.toggleFieldVisibility('name')

    expect(JSON.parse(first.exportConfig()).hiddenFields).toEqual(['comment'])
    expect(first.visibleFields.value.map(field => field.prop)).toEqual(['name'])
    expect(second.hiddenFieldsCount.value).toBe(0)
    expect(second.allVisible.value).toBe(true)
  })
})
