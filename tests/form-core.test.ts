import { describe, expect, test } from 'bun:test'
import { computed, effectScope, nextTick, ref } from 'vue'
import type { FormInst, FormItemInst, FormItemRule } from 'naive-ui/es/form'
import {
  resolveFormConfig,
  type FormConfig,
} from '../src/components/C_Form/composables/useFormConfig'
import { useFormDirty } from '../src/components/C_Form/composables/useFormDirty'
import { useFormState } from '../src/components/C_Form/composables/useFormState'
import {
  cloneFormValue,
  isFormValueEqual,
  replaceFormRecord,
} from '../src/components/C_Form/utils/formModel'
import type { FormModel, FormOption } from '../src/components/C_Form/types'
import {
  SPEC_RULES,
  PRESET_RULES as rawPresets,
} from '@robot-admin/form-validate'
import { resolveFormRules } from '../src/components/C_Form/utils/formValidation'
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

describe('C_Form 验证库与提交生命周期', () => {
  /** 无 UI 的表单实例用于验证实际状态引擎的时序和对外事件。 */
  function createForm(config: FormConfig = {}, fields?: FormOption[]) {
    const events: Array<{ event: string; payload: unknown }> = []
    const options = ref<FormOption[]>(
      fields ?? [
        { type: 'input', prop: 'name', label: '名称', value: '初始值' },
      ]
    )
    const formRef = ref<FormInst>({
      validate: async () => ({ warnings: undefined }),
      restoreValidation: () => undefined,
    })
    const scope = effectScope()
    const state = scope.run(() =>
      useFormState(
        computed(() => options.value),
        computed(() => resolveFormConfig(config)),
        formRef,
        (event: string, payload: unknown) => {
          events.push({ event, payload })
        }
      )
    )!
    return { state, scope, events, options, formRef }
  }

  test('原生规则、NaiveRule 和 RuleSpec 可混用且不修改来源', async () => {
    const native: FormItemRule = { min: 2, trigger: ['blur'] }
    const spec = SPEC_RULES.email('邮箱')
    const raw = rawPresets.length('名称', 2, 4)
    const rules = resolveFormRules([native, spec, raw])
    expect(rules[0]).not.toBe(native)
    expect(rules[0].trigger).not.toBe(native.trigger)
    await expect(
      rules[1].validator!(rules[1], 'a@example.com', () => undefined)
    ).resolves.toBeUndefined()
    await expect(
      rules[1].validator!(rules[1], '无效邮箱', () => undefined)
    ).rejects.toThrow('邮箱')
    await expect(
      rules[2].validator!(rules[2], '太长的名称', () => undefined)
    ).rejects.toThrow()
    expect(spec).toHaveProperty('validate')
    expect(native).toEqual({ min: 2, trigger: ['blur'] })
  })

  test('必填使用验证库的空值规则，保留 0 和 false 的有效语义', async () => {
    const fixture = createForm({}, [
      { type: 'input', prop: 'name', label: '名称', required: true },
    ])
    try {
      const rule = (fixture.state.formRules.name as FormItemRule[])[0]
      await Promise.all(
        ['', '   ', [], new Set()].map(async empty => {
          await expect(
            rule.validator!(rule, empty, () => undefined)
          ).rejects.toThrow('名称不能为空')
        })
      )
      await Promise.all(
        [0, false, ['已选择']].map(async value => {
          await expect(
            rule.validator!(rule, value, () => undefined)
          ).resolves.toBeUndefined()
        })
      )
    } finally {
      fixture.scope.stop()
    }
  })

  test('规则回调失败会阻止提交，修复配置后可重新提交', async () => {
    let calls = 0
    const fixture = createForm(
      {
        onSubmit: () => {
          calls++
        },
        onError: () => undefined,
      },
      [
        {
          type: 'input',
          prop: 'name',
          rulesWhen: () => {
            throw new Error('规则配置错误')
          },
        },
      ]
    )
    try {
      expect(await fixture.state.submit()).toBe(false)
      expect(calls).toBe(0)
      fixture.options.value = [
        {
          type: 'input',
          prop: 'name',
          rules: [SPEC_RULES.length('名称', 2, 20)],
        },
      ]
      await nextTick()
      expect(await fixture.state.submit()).toBe(true)
      expect(calls).toBe(1)
    } finally {
      fixture.scope.stop()
    }
  })

  test('异步提交只有一次调用，完成前保持加载且使用隔离的数据快照', async () => {
    const completed = Promise.withResolvers<void>()
    const started = Promise.withResolvers<void>()
    let calls = 0
    let submitted: FormModel | undefined
    const messages: string[] = []
    const fixture = createForm({
      submitSuccessText: '已完成',
      feedback: {
        success: text => {
          messages.push(text)
        },
      },
      onSubmit: async ({ model }, context) => {
        calls++
        submitted = model
        expect(context?.signal.aborted).toBe(false)
        started.resolve()
        await completed.promise
      },
    })
    try {
      const pending = fixture.state.submit()
      await started.promise
      expect(fixture.state.isSubmitting.value).toBe(true)
      expect(await fixture.state.submit()).toBe(false)
      expect(calls).toBe(1)
      await fixture.state.setFieldValue('name', '提交期间的新值')
      expect(submitted?.name).toBe('初始值')
      expect(messages).toEqual([])
      completed.resolve()
      expect(await pending).toBe(true)
      expect(fixture.state.isSubmitting.value).toBe(false)
      expect(messages).toEqual(['已完成'])
      expect(
        fixture.events.filter(item => item.event === 'submit')
      ).toHaveLength(1)
    } finally {
      completed.resolve()
      fixture.scope.stop()
    }
  })

  test('业务提交失败只报告一次，不发出成功事件，随后可重试', async () => {
    let rejectSave = true
    const errors: unknown[] = []
    const fixture = createForm({
      onSubmit: async () => {
        if (rejectSave) throw new Error('保存失败')
      },
      onError: (error, context) => {
        errors.push({ error, source: context.source })
      },
    })
    try {
      expect(await fixture.state.submit()).toBe(false)
      expect(fixture.state.isSubmitting.value).toBe(false)
      expect(errors).toHaveLength(1)
      expect(
        fixture.events.filter(item => item.event === 'submit')
      ).toHaveLength(0)
      rejectSave = false
      expect(await fixture.state.submit()).toBe(true)
    } finally {
      fixture.scope.stop()
    }
  })

  test('卸载会取消在途提交，晚到的结果不发事件或显示成功提示', async () => {
    const completed = Promise.withResolvers<void>()
    const started = Promise.withResolvers<void>()
    let signal: AbortSignal | undefined
    const messages: string[] = []
    const fixture = createForm({
      submitSuccessText: '已完成',
      feedback: {
        success: text => {
          messages.push(text)
        },
      },
      onSubmit: async (_payload, context) => {
        signal = context?.signal
        started.resolve()
        await completed.promise
      },
    })
    const pending = fixture.state.submit()
    await started.promise
    fixture.scope.stop()
    expect(signal?.aborted).toBe(true)
    completed.resolve()
    expect(await pending).toBe(false)
    expect(messages).toEqual([])
    expect(fixture.events.filter(item => item.event === 'submit')).toHaveLength(
      0
    )
  })

  test('校验等待期间卸载，不继续调用业务提交', async () => {
    const validated = Promise.withResolvers<{ warnings: undefined }>()
    let calls = 0
    const fixture = createForm({
      onSubmit: () => {
        calls++
      },
    })
    fixture.formRef.value.validate = () => validated.promise
    const pending = fixture.state.submit()
    fixture.scope.stop()
    validated.resolve({ warnings: undefined })
    expect(await pending).toBe(false)
    expect(calls).toBe(0)
    expect(fixture.events).toEqual([])
  })

  test('只读和禁用表单不能通过实例方法提交', async () => {
    await Promise.all(
      [{ readonly: true }, { disabled: true }].map(async config => {
        let calls = 0
        const fixture = createForm({
          ...config,
          onSubmit: () => {
            calls++
          },
        })
        try {
          expect(await fixture.state.submit()).toBe(false)
          expect(calls).toBe(0)
        } finally {
          fixture.scope.stop()
        }
      })
    )
  })

  test('反馈插件异常不改变已完成的提交结果，也不阻止失败后的清理', async () => {
    const fixture = createForm({
      submitSuccessText: '已完成',
      feedback: {
        success: () => {
          throw new Error('提示异常')
        },
      },
    })
    try {
      expect(await fixture.state.submit()).toBe(true)
      expect(fixture.state.isSubmitting.value).toBe(false)
    } finally {
      fixture.scope.stop()
    }
    const failed = createForm({
      onSubmit: () => {
        throw new Error('保存失败')
      },
      onError: () => {
        throw new Error('回调异常')
      },
    })
    try {
      expect(await failed.state.submit()).toBe(false)
      expect(failed.state.isSubmitting.value).toBe(false)
    } finally {
      failed.scope.stop()
    }
  })
})
