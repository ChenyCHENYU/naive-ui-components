import { describe, expect, test } from 'bun:test'
import { computed, effectScope, nextTick, ref } from 'vue'
import type { FormInst, FormItemInst, FormItemRule } from 'naive-ui/es/form'
import { resolveFormConfig } from '../src/components/C_Form/composables/useFormConfig'
import { useFormDirty } from '../src/components/C_Form/composables/useFormDirty'
import { useFormState } from '../src/components/C_Form/composables/useFormState'
import {
  cloneFormValue,
  isFormValueEqual,
  replaceFormRecord,
} from '../src/components/C_Form/utils/formModel'
import type { FormModel, FormOption } from '../src/components/C_Form/types'
import {
  deleteDataPath,
  getDataPath,
  hasDataPath,
  setDataPath,
} from '../src/utils/data'

describe('C_Form data safety', () => {
  test('nested paths are safe, support arrays, and preserve literal keys', () => {
    const model: FormModel = {}
    setDataPath(model, 'profile.contacts[0].email', 'a@example.com')
    expect(getDataPath(model, 'profile.contacts.0.email')).toBe('a@example.com')
    expect(hasDataPath(model, 'profile.contacts[0].email')).toBe(true)
    deleteDataPath(model, 'profile.contacts[0].email')
    expect(hasDataPath(model, 'profile.contacts[0].email')).toBe(false)

    model['literal.key'] = 'legacy'
    setDataPath(model, 'literal.key', 'compatible')
    expect(model['literal.key']).toBe('compatible')
    expect(() => setDataPath(model, '__proto__.polluted', true)).toThrow()
  })
  test('clone keeps structured values and isolates nested mutations', () => {
    const source = {
      date: new Date('2026-08-31T00:00:00.000Z'),
      values: new Map([['enabled', true]]),
      optional: undefined,
      nested: { count: 1 },
    }
    const clone = cloneFormValue(source)

    expect(clone).not.toBe(source)
    expect(clone.date).toEqual(source.date)
    expect(clone.values.get('enabled')).toBe(true)
    expect('optional' in clone).toBe(true)
    clone.nested.count = 2
    expect(source.nested.count).toBe(1)
    expect(isFormValueEqual(source, clone)).toBe(false)
  })

  test('replace removes stale fields instead of only assigning new values', () => {
    const target: FormModel = { stale: true, name: 'old' }
    replaceFormRecord(target, { name: 'new' })
    expect(target).toEqual({ name: 'new' })
  })

  test('dirty snapshot supports Date and returns an isolated clean model', () => {
    const model: FormModel = { date: new Date('2026-08-31T00:00:00.000Z') }
    const dirty = useFormDirty(model)
    dirty.markAsClean()
    expect(dirty.isDirty.value).toBe(false)

    model.date = new Date('2026-09-01T00:00:00.000Z')
    expect(dirty.getChangedFields()).toEqual(['date'])

    const clean = dirty.getCleanModel()
    clean.date = null
    expect(dirty.getCleanModel().date).toEqual(
      new Date('2026-08-31T00:00:00.000Z')
    )
  })
})

describe('C_Form state engine', () => {
  test('fills missing nested defaults without replacing supplied siblings', () => {
    const scope = effectScope()
    const state = scope.run(() =>
      useFormState(
        computed(() => [
          { type: 'input', prop: 'profile.name', value: 'Anonymous' },
          { type: 'inputNumber', prop: 'profile.age', value: 18 },
        ]),
        computed(() => resolveFormConfig()),
        ref<FormInst | null>(null),
        () => undefined,
        computed(() => ({ profile: { name: 'Ada' } }))
      )
    )!

    expect(state.getModel()).toEqual({ profile: { name: 'Ada', age: 18 } })
    scope.stop()
  })

  test('validates and clears only the requested mounted field', async () => {
    const options = ref<FormOption[]>([
      { type: 'input', prop: 'name', label: '姓名', required: true },
      { type: 'input', prop: 'email', label: '邮箱' },
    ])
    const validated: string[] = []
    const restored: string[] = []
    const formRef = ref<FormInst>({
      validate: async () => ({ warnings: undefined }),
      restoreValidation: () => undefined,
    })
    const scope = effectScope()
    const state = scope.run(() =>
      useFormState(
        computed(() => options.value),
        computed(() => resolveFormConfig()),
        formRef,
        () => undefined
      )
    )!

    const createFormItem = (field: string): FormItemInst =>
      ({
        path: field,
        validate: async () => {
          validated.push(field)
          return { warnings: undefined }
        },
        restoreValidation: () => restored.push(field),
        internalValidate: async () => ({
          valid: true,
          errors: undefined,
          warnings: undefined,
        }),
      }) as FormItemInst

    state.setFormItemRef('name', createFormItem('name'))
    state.setFormItemRef('email', createFormItem('email'))
    await state.validateField('name')
    state.clearValidation('name')

    expect(validated).toEqual(['name'])
    expect(restored).toEqual(['name'])
    scope.stop()
  })

  test('removes obsolete option fields and preserves unknown external fields', async () => {
    const options = ref<FormOption[]>([
      { type: 'input', prop: 'name' },
      { type: 'inputNumber', prop: 'age' },
    ])
    const external = ref<FormModel>({ id: 7, name: 'Ada', age: 36 })
    const scope = effectScope()
    const state = scope.run(() =>
      useFormState(
        computed(() => options.value),
        computed(() => resolveFormConfig()),
        ref<FormInst | null>(null),
        () => undefined,
        computed(() => external.value)
      )
    )!

    expect(state.getModel()).toEqual({ id: 7, name: 'Ada', age: 36 })
    options.value = [{ type: 'input', prop: 'name' }]
    await nextTick()
    expect(state.getModel()).toEqual({ id: 7, name: 'Ada' })
    scope.stop()
  })

  test('latest async option request wins and receives an abort signal', async () => {
    const pending: Array<{
      signal: AbortSignal
      resolve: (value: readonly { label: string; value: string }[]) => void
    }> = []
    const loader: NonNullable<FormOption['asyncOptions']> = (_model, context) =>
      new Promise(resolve => {
        pending.push({ signal: context!.signal, resolve })
      })
    const options = ref<FormOption[]>([
      { type: 'select', prop: 'city', asyncOptions: loader },
    ])
    const errors: unknown[] = []
    const scope = effectScope()
    const state = scope.run(() =>
      useFormState(
        computed(() => options.value),
        computed(() =>
          resolveFormConfig({ onError: error => errors.push(error) })
        ),
        ref<FormInst | null>(null),
        () => undefined
      )
    )!

    await nextTick()
    const initial = pending[0]
    const older = state.reloadOptions('city')
    const newer = state.reloadOptions('city')
    expect(initial.signal.aborted).toBe(true)
    expect(pending[1].signal.aborted).toBe(true)

    pending[2].resolve([{ label: '北京', value: 'beijing' }])
    await newer
    pending[1].resolve([{ label: '旧数据', value: 'stale' }])
    initial.resolve([{ label: '初始化旧数据', value: 'initial' }])
    await older

    expect(state.asyncOptionsCache.value.city).toEqual([
      { label: '北京', value: 'beijing' },
    ])
    expect(state.asyncLoadingMap.value.city).toBe(false)
    expect(errors).toEqual([])
    scope.stop()
  })

  test('required flag generates a native rule with a field key', () => {
    const option: FormOption = {
      type: 'input',
      prop: 'name',
      label: '姓名',
      required: true,
    }
    const scope = effectScope()
    const state = scope.run(() =>
      useFormState(
        computed(() => [option]),
        computed(() => resolveFormConfig()),
        ref<FormInst | null>(null),
        () => undefined
      )
    )!
    const rules = state.formRules.name as FormItemRule[]

    expect(rules[0]?.required).toBe(true)
    expect(rules[0]?.key).toBe('name')
    scope.stop()
  })
})
