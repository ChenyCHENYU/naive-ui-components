import { expect, test } from 'bun:test'
import { computed, effectScope, nextTick, ref, watch } from 'vue'
import type { FormInst } from 'naive-ui'
import { useFormState } from '../src/components/C_Form/composables/useFormState'
import { resolveFormConfig } from '../src/components/C_Form/composables/useFormConfig'
import type { FormOption, OptionItem } from '../src/components/C_Form/types'

const settle = async () => {
  await nextTick()
  await Promise.resolve()
  await nextTick()
}
const deferred = () => {
  let resolve!: (rows: OptionItem[]) => void
  let reject!: (error: Error) => void
  const promise = new Promise<OptionItem[]>((done, fail) => {
    resolve = done
    reject = fail
  })
  return { promise, resolve, reject }
}
const location = (warehouse: string): OptionItem[] => [
  { value: `${warehouse}-01`, label: `${warehouse} location` },
]
function fixture(loader: NonNullable<FormOption['asyncOptions']>) {
  const options = ref<FormOption[]>([
    { type: 'input', prop: 'warehouse', value: 'A' },
    {
      type: 'select',
      prop: 'location',
      value: 'A-01',
      dependsOn: 'warehouse',
      children: location('static'),
      asyncOptions: loader,
    },
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
  return { state, options, scope, errors }
}

test('dependency changes invalidate choices immediately and keep business values through failure and retry', async () => {
  const pending = deferred()
  let calls = 0
  const { state, scope, errors } = fixture(async model => {
    calls++
    if (calls === 2) return pending.promise
    return location(String(model.warehouse))
  })
  try {
    await settle()
    expect(state.asyncOptionsCache.value.location).toEqual(location('A'))
    state.setFields({ warehouse: 'B' })
    // [] deliberately overrides static children while the new context is unknown.
    expect(state.asyncOptionsCache.value.location).toEqual([])
    expect(state.getModel().location).toBe('A-01')
    await settle()
    pending.reject(new Error('B unavailable'))
    await settle()
    expect(state.asyncOptionsCache.value.location).toEqual([])
    expect(state.asyncLoadingMap.value.location).toBe(false)
    expect(state.getOptionsError('location')).toBeInstanceOf(Error)
    expect(errors).toHaveLength(1)
    await state.reloadOptions('location')
    expect(state.asyncOptionsCache.value.location).toEqual(location('B'))
    expect(state.getOptionsError('location')).toBeUndefined()
    expect(state.getModel().location).toBe('A-01')
  } finally {
    scope.stop()
  }
})

test('manual refresh in the same context retains valid choices on failure', async () => {
  let calls = 0
  const { state, scope } = fixture(async () => {
    if (++calls === 2) throw new Error('temporarily offline')
    return location('A')
  })
  try {
    await settle()
    await state.reloadOptions('location')
    expect(state.asyncOptionsCache.value.location).toEqual(location('A'))
    expect(state.getModel().location).toBe('A-01')
    expect(state.asyncLoadingMap.value.location).toBe(false)
    expect(state.getOptionsError('location')).toBeInstanceOf(Error)
    await state.reloadOptions('location')
    expect(state.getOptionsError('location')).toBeUndefined()
  } finally {
    scope.stop()
  }
})

test('unchanged dependency notifications refresh without clearing valid choices', async () => {
  let calls = 0
  const { state, scope, errors } = fixture(async () => {
    if (++calls > 1) throw new Error('temporarily offline')
    return location('A')
  })
  try {
    await settle()
    state.setFields({ warehouse: 'A', note: 'unrelated edit' })
    expect(state.asyncOptionsCache.value.location).toEqual(location('A'))
    await settle()
    expect(calls).toBe(2)
    expect(errors).toHaveLength(1)
    expect(state.asyncOptionsCache.value.location).toEqual(location('A'))
    expect(state.getModel()).toMatchObject({
      warehouse: 'A',
      location: 'A-01',
      note: 'unrelated edit',
    })
    // Public field-change notifications still explicitly refresh the loader.
    state.handleFieldChange('warehouse')
    expect(state.asyncOptionsCache.value.location).toEqual(location('A'))
    await settle()
    expect(calls).toBe(3)
    expect(errors).toHaveLength(2)
    expect(state.asyncOptionsCache.value.location).toEqual(location('A'))
    expect(state.asyncLoadingMap.value.location).toBe(false)
  } finally {
    scope.stop()
  }
})

test('object dependency snapshots distinguish equal replacements from nested changes', async () => {
  let calls = 0
  const { state, scope } = fixture(async model => {
    if (++calls === 2) throw new Error('temporarily offline')
    return location((model.warehouse as { code: string }).code)
  })
  try {
    state.setFields({ warehouse: { code: 'A' } })
    await settle()
    expect(state.asyncOptionsCache.value.location).toEqual(location('A'))
    state.setFields({ warehouse: { code: 'A' } })
    expect(state.asyncOptionsCache.value.location).toEqual(location('A'))
    await settle()
    expect(calls).toBe(2)
    expect(state.asyncOptionsCache.value.location).toEqual(location('A'))
    ;(state.formModel.warehouse as { code: string }).code = 'B'
    state.handleFieldChange('warehouse.code')
    expect(state.asyncOptionsCache.value.location).toEqual([])
    await settle()
    expect(calls).toBe(3)
    expect(state.asyncOptionsCache.value.location).toEqual(location('B'))
    expect(state.getModel().location).toBe('A-01')
  } finally {
    scope.stop()
  }
})

test('synchronous cache observers can reload without invalidation deleting the successor loading state', async () => {
  const pending = deferred()
  let calls = 0
  const { state, scope } = fixture(async model => {
    calls++
    return model.warehouse === 'A' ? location('A') : pending.promise
  })
  try {
    await settle()
    scope.run(() =>
      watch(
        () => state.asyncOptionsCache.value.location,
        choices => {
          if (choices?.length === 0) void state.reloadOptions('location')
        },
        { flush: 'sync' }
      )
    )
    state.setFields({ warehouse: 'B' })
    expect(calls).toBe(2)
    expect(state.asyncLoadingMap.value.location).toBe(true)
    await settle()
    expect(calls).toBe(2)
    pending.resolve(location('B'))
    await settle()
    expect(state.asyncOptionsCache.value.location).toEqual(location('B'))
    expect(state.asyncLoadingMap.value.location).toBe(false)
    expect(state.getModel().location).toBe('A-01')
  } finally {
    scope.stop()
  }
})

test('a synchronously failed cache-observer reload still owns dependency invalidation', async () => {
  let calls = 0
  const failure = new Error('B unavailable')
  const { state, scope, errors } = fixture(model => {
    calls++
    if (model.warehouse === 'B') throw failure
    return Promise.resolve(location('A'))
  })
  try {
    await settle()
    scope.run(() =>
      watch(
        () => state.asyncOptionsCache.value.location,
        choices => {
          if (choices?.length === 0) void state.reloadOptions('location')
        },
        { flush: 'sync' }
      )
    )
    state.setFields({ warehouse: 'B' })
    expect(calls).toBe(2)
    expect(state.asyncLoadingMap.value.location).toBe(false)
    await settle()
    expect(calls).toBe(2)
    expect(errors).toEqual([failure])
    expect(state.getOptionsError('location')).toBe(failure)
    expect(state.asyncOptionsCache.value.location).toEqual([])
    expect(state.getModel().location).toBe('A-01')
  } finally {
    scope.stop()
  }
})

test('synchronous abort reload owns the successor and eventually releases its loading state', async () => {
  const pending: Array<ReturnType<typeof deferred> & { signal: AbortSignal }> =
    []
  let reentered: Promise<void> | undefined
  const { state, scope, errors } = fixture((_model, context) => {
    const task = { ...deferred(), signal: context!.signal }
    pending.push(task)
    if (pending.length === 1)
      task.signal.addEventListener(
        'abort',
        () => {
          reentered = state.reloadOptions('location')
        },
        { once: true }
      )
    return task.promise
  })
  try {
    await settle()
    const refresh = state.reloadOptions('location')
    expect(pending).toHaveLength(2)
    expect(pending[0].signal.aborted).toBe(true)
    expect(pending[1].signal.aborted).toBe(false)
    pending[1].resolve(location('latest'))
    await reentered
    await refresh
    pending[0].reject(new Error('late aborted rejection'))
    await settle()
    expect(state.asyncOptionsCache.value.location).toEqual(location('latest'))
    expect(state.asyncLoadingMap.value.location).toBe(false)
    expect(errors).toEqual([])
  } finally {
    scope.stop()
  }
})

test('dependency invalidation preserves a request synchronously started by abort cleanup', async () => {
  const pending: Array<
    ReturnType<typeof deferred> & { warehouse: unknown; signal: AbortSignal }
  > = []
  const { state, scope } = fixture((model, context) => {
    const task = {
      ...deferred(),
      warehouse: model.warehouse,
      signal: context!.signal,
    }
    pending.push(task)
    if (pending.length === 1)
      task.signal.addEventListener(
        'abort',
        () => {
          void state.reloadOptions('location')
        },
        { once: true }
      )
    return task.promise
  })
  try {
    await settle()
    state.setFields({ warehouse: 'B' })
    expect(pending[0].signal.aborted).toBe(true)
    expect(pending).toHaveLength(2)
    expect(pending[1].warehouse).toBe('B')
    await settle()
    expect(pending).toHaveLength(2)
    expect(pending[1].signal.aborted).toBe(false)
    pending[0].resolve(location('A'))
    await settle()
    expect(state.asyncOptionsCache.value.location).toEqual([])
    expect(state.asyncLoadingMap.value.location).toBe(true)
    pending[1].resolve(location('B'))
    await settle()
    expect(state.asyncOptionsCache.value.location).toEqual(location('B'))
    expect(state.asyncLoadingMap.value.location).toBe(false)
  } finally {
    scope.stop()
  }
})

test('loader replacement exposes the new loader before abort listeners request its choices', async () => {
  const first = deferred()
  const second = deferred()
  const nextSignals: AbortSignal[] = []
  let startedDuringAbort = false
  const nextLoader: NonNullable<FormOption['asyncOptions']> = (
    _model,
    context
  ) => {
    nextSignals.push(context!.signal)
    return second.promise
  }
  const { state, options, scope } = fixture((_model, context) => {
    context!.signal.addEventListener(
      'abort',
      () => {
        void state.reloadOptions('location')
        startedDuringAbort = nextSignals.length === 1
      },
      { once: true }
    )
    return first.promise
  })
  try {
    await settle()
    options.value = options.value.map(option =>
      option.prop === 'location'
        ? { ...option, asyncOptions: nextLoader }
        : option
    )
    await settle()
    expect(startedDuringAbort).toBe(true)
    expect(nextSignals).toHaveLength(1)
    expect(nextSignals[0].aborted).toBe(false)
    first.resolve(location('obsolete'))
    await settle()
    expect(state.asyncOptionsCache.value.location).toBeUndefined()
    expect(state.asyncLoadingMap.value.location).toBe(true)
    scope.stop()
    expect(nextSignals[0].aborted).toBe(true)
    second.resolve(location('unmounted'))
    await settle()
    expect(state.asyncOptionsCache.value.location).toBeUndefined()
  } finally {
    scope.stop()
  }
})
