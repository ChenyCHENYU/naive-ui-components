import { describe, expect, test } from 'bun:test'
import { computed, effectScope, nextTick, reactive, ref } from 'vue'
import type { FormInst, FormItemInst } from 'naive-ui'
import { useFormState } from '../src/components/C_Form/composables/useFormState'
import { resolveFormConfig } from '../src/components/C_Form/composables/useFormConfig'
import { useFormDirty } from '../src/components/C_Form/composables/useFormDirty'
import { useCForm } from '../src/components/C_Form/helpers'
import type {
  FormInstance,
  FormModel,
  FormOption,
} from '../src/components/C_Form/types'

const settle = async (): Promise<void> => {
  await nextTick()
  await Promise.resolve()
  await nextTick()
}

describe('C_Form consistent model changes', () => {
  test('submission requires the model snapshot checked by validation, including synchronous listeners', async () => {
    await Promise.all(
      ['during-validation', 'validate-success-listener', 'unchanged'].map(
        async change => {
          let release!: () => void
          const validation = new Promise<void>(resolve => {
            release = resolve
          })
          const submitted: FormModel[] = []
          const events: string[] = []
          const scope = effectScope()
          const state: ReturnType<typeof useFormState> = scope.run(() =>
            useFormState(
              computed<FormOption[]>(() => [
                { type: 'input', prop: 'name', value: 'validated' },
              ]),
              computed(() =>
                resolveFormConfig({
                  onSubmit: async ({ model }) => {
                    submitted.push(model)
                  },
                })
              ),
              ref<FormInst | null>({
                validate: () => validation,
              } as unknown as FormInst),
              event => {
                events.push(event)
                if (
                  event === 'validate-success' &&
                  change === 'validate-success-listener'
                ) {
                  state.setFields({ name: 'unvalidated listener edit' })
                }
              }
            )
          )!
          try {
            await settle()
            const pending = state.submit()
            if (change === 'during-validation')
              state.setFields({ name: 'unvalidated edit' })
            release()
            expect(await pending).toBe(change === 'unchanged')
            expect(submitted).toEqual(
              change === 'unchanged' ? [{ name: 'validated' }] : []
            )
            expect(events.filter(event => event === 'submit')).toHaveLength(
              change === 'unchanged' ? 1 : 0
            )
            expect(state.isSubmitting.value).toBe(false)
          } finally {
            scope.stop()
          }
        }
      )
    )
  })

  test('submission rechecks disabled and readonly after validation and preserves retry signal semantics', async () => {
    await Promise.all(
      (['disabled', 'readonly'] as const).map(async flag => {
        let release!: () => void
        const validation = new Promise<void>(resolve => {
          release = resolve
        })
        const flags = reactive({ disabled: false, readonly: false })
        const signals: (AbortSignal | undefined)[] = []
        const events: string[] = []
        const scope = effectScope()
        const state = scope.run(() =>
          useFormState(
            computed<FormOption[]>(() => [
              { type: 'input', prop: 'name', value: 'validated' },
            ]),
            computed(() =>
              resolveFormConfig({
                ...flags,
                onSubmit: async (_payload, context) => {
                  signals.push(context?.signal)
                },
              })
            ),
            ref<FormInst | null>({
              validate: () => validation,
            } as unknown as FormInst),
            event => {
              events.push(event)
            }
          )
        )!
        try {
          await settle()
          const pending = state.submit()
          flags[flag] = true
          release()
          expect(await pending).toBe(false)
          expect(signals).toEqual([])
          expect(events).not.toContain('submit')
          expect(state.isSubmitting.value).toBe(false)
          flags[flag] = false
          expect(await state.submit()).toBe(true)
          expect(signals).toHaveLength(1)
          expect(signals[0]).toBeInstanceOf(AbortSignal)
          expect(signals[0]?.aborted).toBe(false)
          expect(events.filter(event => event === 'submit')).toHaveLength(1)
        } finally {
          scope.stop()
        }
      })
    )
  })

  test('edit initialValues seed the first derivation before any callbacks run', async () => {
    const errors: unknown[] = []
    const scope = effectScope()
    const state = scope.run(() =>
      useFormState(
        computed<FormOption[]>(() => [
          {
            type: 'input',
            prop: 'summary',
            valueWhen: model =>
              (model.record as { name: string }).name.toUpperCase(),
          },
        ]),
        computed(() =>
          resolveFormConfig({
            mode: 'edit',
            initialValues: { record: { name: 'Ada' } },
            onError: error => {
              errors.push(error)
            },
          })
        ),
        ref<FormInst | null>(null),
        () => undefined
      )
    )!
    try {
      await settle()
      expect(state.getModel().summary).toBe('ADA')
      expect(state.isDirty.value).toBe(false)
      expect(errors).toEqual([])
    } finally {
      scope.stop()
    }
  })

  test('external record changes and resets refresh dependent options without model echoes', async () => {
    const external = ref<FormModel>({ country: 'CN', city: 'BJ' })
    const loaded: unknown[] = []
    const emitted: string[] = []
    const scope = effectScope()
    const state = scope.run(() =>
      useFormState(
        computed<FormOption[]>(() => [
          { type: 'input', prop: 'country' },
          {
            type: 'select',
            prop: 'city',
            dependsOn: 'country',
            asyncOptions: async model => {
              loaded.push(model.country)
              return [
                { label: String(model.country), value: String(model.country) },
              ]
            },
          },
        ]),
        computed(() => resolveFormConfig()),
        ref<FormInst | null>(null),
        event => emitted.push(event),
        computed(() => external.value)
      )
    )!
    try {
      await settle()
      emitted.length = 0
      external.value = { country: 'US', city: 'NY' }
      await settle()
      expect(loaded).toEqual(['CN', 'US'])
      expect(state.asyncOptionsCache.value.city[0].value).toBe('US')
      expect(emitted).toEqual([])
      await state.setFieldValue('country', 'JP')
      await settle()
      state.resetFields()
      await settle()
      expect(state.getModel().country).toBe('CN')
      expect(state.asyncOptionsCache.value.city[0].value).toBe('CN')
      expect(loaded).toEqual(['CN', 'US', 'JP', 'CN'])
    } finally {
      scope.stop()
    }
  })

  test('derived fields settle before loading, including hydration and parent-path patches', async () => {
    const external = ref<FormModel>({ profile: { country: 'CN' } })
    const loaded: unknown[] = []
    const scope = effectScope()
    const state = scope.run(() =>
      useFormState(
        computed<FormOption[]>(() => [
          { type: 'input', prop: 'profile.country' },
          {
            type: 'input',
            prop: 'country',
            valueWhen: model => (model.profile as { country: string }).country,
          },
          {
            type: 'input',
            prop: 'title',
            valueWhen: model => `Country ${String(model.country)}`,
          },
          {
            type: 'select',
            prop: 'city',
            dependsOn: ['country', 'profile.country'],
            asyncOptions: async model => {
              loaded.push(model.title)
              return []
            },
          },
        ]),
        computed(() => resolveFormConfig()),
        ref<FormInst | null>(null),
        () => undefined,
        computed(() => external.value)
      )
    )!
    try {
      await settle()
      expect(state.getModel().title).toBe('Country CN')
      state.setFields({ profile: { country: 'JP' } })
      state.setFields({ profile: { country: 'US' } })
      await settle()
      expect(state.getModel().title).toBe('Country US')
      expect(loaded).toEqual(['Country CN', 'Country US'])
      external.value = { profile: { country: 'DE' } }
      await settle()
      expect(state.getModel().title).toBe('Country DE')
      expect(loaded.at(-1)).toBe('Country DE')
    } finally {
      scope.stop()
    }
  })

  test('removing a loader aborts it and lets static options replace its cache', async () => {
    let finish!: (value: { label: string; value: string }[]) => void
    let signal: AbortSignal | undefined
    const loader: NonNullable<FormOption['asyncOptions']> = (
      _model,
      context
    ) => {
      signal = context?.signal
      return new Promise(resolve => {
        finish = resolve
      })
    }
    const options = ref<FormOption[]>([
      { type: 'select', prop: 'city', asyncOptions: loader },
    ])
    const scope = effectScope()
    const state = scope.run(() =>
      useFormState(
        computed(() => options.value),
        computed(() => resolveFormConfig()),
        ref<FormInst | null>(null),
        () => undefined
      )
    )!
    try {
      await settle()
      options.value = [
        {
          type: 'select',
          prop: 'city',
          children: [{ label: 'Static', value: 'static' }],
        },
      ]
      await settle()
      expect(signal?.aborted).toBe(true)
      finish([{ label: 'Late', value: 'late' }])
      await settle()
      expect(Object.hasOwn(state.asyncOptionsCache.value, 'city')).toBe(false)
      expect(Object.hasOwn(state.asyncLoadingMap.value, 'city')).toBe(false)
    } finally {
      scope.stop()
    }
  })

  test('removing a settled loader also releases its cached choices', async () => {
    const options = ref<FormOption[]>([
      {
        type: 'select',
        prop: 'city',
        asyncOptions: async () => [{ label: 'Remote', value: 'remote' }],
      },
    ])
    const scope = effectScope()
    const state = scope.run(() =>
      useFormState(
        computed(() => options.value),
        computed(() => resolveFormConfig()),
        ref<FormInst | null>(null),
        () => undefined
      )
    )!
    try {
      await settle()
      expect(state.asyncOptionsCache.value.city[0].value).toBe('remote')
      options.value = [{ type: 'select', prop: 'city', children: [] }]
      await settle()
      expect(Object.hasOwn(state.asyncOptionsCache.value, 'city')).toBe(false)
    } finally {
      scope.stop()
    }
  })

  test('a replaced loader cannot clear its successor loading state or abort ownership', async () => {
    type Choices = { label: string; value: string }[]
    let finishFirst!: (choices: Choices) => void
    let finishSecond!: (choices: Choices) => void
    let secondSignal: AbortSignal | undefined
    const first: NonNullable<FormOption['asyncOptions']> = () =>
      new Promise(resolve => {
        finishFirst = resolve
      })
    const second: NonNullable<FormOption['asyncOptions']> = (
      _model,
      context
    ) => {
      secondSignal = context?.signal
      return new Promise(resolve => {
        finishSecond = resolve
      })
    }
    const options = ref<FormOption[]>([
      { type: 'select', prop: 'city', asyncOptions: first },
    ])
    const scope = effectScope()
    const state = scope.run(() =>
      useFormState(
        computed(() => options.value),
        computed(() => resolveFormConfig()),
        ref<FormInst | null>(null),
        () => undefined
      )
    )!
    try {
      await settle()
      options.value = [{ type: 'select', prop: 'city', asyncOptions: second }]
      await settle()
      expect(state.asyncLoadingMap.value.city).toBe(true)
      finishFirst([{ label: 'Old', value: 'old' }])
      await settle()
      expect(state.asyncLoadingMap.value.city).toBe(true)
      scope.stop()
      expect(secondSignal?.aborted).toBe(true)
      finishSecond([{ label: 'Late', value: 'late' }])
      await settle()
      expect(Object.hasOwn(state.asyncOptionsCache.value, 'city')).toBe(false)
    } finally {
      scope.stop()
    }
  })

  test('unmount before nextTick prevents a queued initial request from starting', async () => {
    let calls = 0
    const scope = effectScope()
    scope.run(() =>
      useFormState(
        computed<FormOption[]>(() => [
          {
            type: 'select',
            prop: 'city',
            asyncOptions: async () => {
              calls += 1
              return []
            },
          },
        ]),
        computed(() => resolveFormConfig()),
        ref<FormInst | null>(null),
        () => undefined
      )
    )
    scope.stop()
    await settle()
    expect(calls).toBe(0)
  })

  test('step keys validate only visible fields in their own group', async () => {
    const validated: string[] = []
    const scope = effectScope()
    const state = scope.run(() =>
      useFormState(
        computed<FormOption[]>(() => [
          {
            type: 'input',
            prop: 'hidden',
            show: false,
            layout: { step: 'real' },
          },
          { type: 'input', prop: 'name', layout: { step: 'real' } },
        ]),
        computed(() =>
          resolveFormConfig({
            steps: {
              steps: [
                { key: 'empty', title: 'Empty' },
                { key: 'real', title: 'Real' },
              ],
            },
          })
        ),
        ref<FormInst | null>({
          validate: async () => undefined,
        } as unknown as FormInst),
        () => undefined
      )
    )!
    try {
      state.setFormItemRef('name', {
        validate: async () => {
          validated.push('name')
        },
      } as unknown as FormItemInst)
      expect(await state.validateStep('real')).toBe(true)
      expect(await state.validateStep(1)).toBe(true)
      expect(validated).toEqual(['name', 'name'])
    } finally {
      scope.stop()
    }
  })
})

test('dirty computed tracks nested edits to an object-valued field', () => {
  const model = reactive({ profile: { name: 'Ada', tags: ['first'] } })
  const dirty = useFormDirty(model, () => ['profile'])
  dirty.markAsClean()
  expect(dirty.isDirty.value).toBe(false)
  model.profile.tags.push('second')
  expect(dirty.isDirty.value).toBe(true)
  model.profile.tags.pop()
  expect(dirty.isDirty.value).toBe(false)
  model.profile.name = 'Grace'
  expect(dirty.isDirty.value).toBe(true)
})

test('useCForm convenience operations work before and after mounting with isolated snapshots', async () => {
  interface Model {
    name: string
    count: number
  }
  const helper = useCForm<Model>({
    initialValues: { name: 'Ada', count: 0 },
    options: [],
  })
  await helper.setValues({ name: 'Grace' })
  const snapshot = helper.getValues()
  snapshot.name = 'External'
  expect(helper.model.value.name).toBe('Grace')
  helper.reset()
  expect(helper.getValues()).toEqual({ name: 'Ada', count: 0 })
  let draft: Model = { name: 'Mounted', count: 1 }
  const validations: boolean[] = []
  helper.formRef.value = {
    getModel: () => ({ ...draft }),
    setFieldsValue: async (values, validate) => {
      draft = { ...draft, ...values }
      validations.push(Boolean(validate))
    },
    resetFields: () => {
      draft = { name: 'Clean', count: 2 }
    },
  } as FormInstance<Model>
  await helper.setValues({ count: 3 }, true)
  expect(helper.getValues()).toEqual({ name: 'Mounted', count: 3 })
  expect(validations).toEqual([true])
  helper.reset()
  expect(helper.model.value).toEqual({ name: 'Clean', count: 2 })
})

test('useCForm rejects validation until a form is bound and forwards real validation failures', async () => {
  const helper = useCForm({ initialValues: { name: '' }, options: [] })
  await expect(helper.validate()).rejects.toThrow('C_Form is not mounted')
  expect(await helper.submit()).toBe(false)
  let error: Error | undefined = new Error('required')
  let calls = 0
  helper.formRef.value = {
    validate: async () => {
      calls++
      if (error) throw error
    },
  } as unknown as FormInstance<{ name: string }>
  await expect(helper.validate()).rejects.toThrow('required')
  error = undefined
  await expect(helper.validate()).resolves.toBeUndefined()
  expect(calls).toBe(2)
  helper.formRef.value = null
  await expect(helper.validate()).rejects.toThrow('C_Form is not mounted')
})
