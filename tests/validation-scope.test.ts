import { describe, expect, test } from 'bun:test'
import { ref, watch } from 'vue'
import {
  collectValidationIssues,
  type ValidationIssue,
  type ValidationTarget,
} from '../src/core/validation'
import { useValidationScope } from '../src/composables/useValidationScope'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((a, b) => {
    resolve = a
    reject = b
  })
  return { promise, resolve, reject }
}

describe('composite validation scope', () => {
  test('identical row keys in different panels cannot collide or share mutable error addresses', async () => {
    const scope = useValidationScope()
    const issue = {
      key: 'same',
      source: '',
      message: 'Required',
      target: { rowKey: 0, field: 'name' },
    }
    scope.register({ id: 'A', validate: () => [issue, issue] })
    scope.register({ id: 'B', validate: () => [issue] })
    expect(await scope.validate()).toBe(false)
    expect(scope.issues.value).toHaveLength(2)
    expect(new Set(scope.issues.value.map(item => item.key)).size).toBe(2)
    issue.target.field = 'changed'
    expect(
      scope.issues.value.every(item => item.target?.field === 'name')
    ).toBe(true)
    scope.dispose()
  })
  test('keeps field identities and aggregates form/grid issues without stopping at first region', async () => {
    const scope = useValidationScope(),
      dirty = ref(false)
    scope.register({
      id: 'header',
      dirty: () => dirty.value,
      validate: () => {
        throw [[{ field: 'customer', message: '请选择客户' }]]
      },
    })
    let revealed = ''
    scope.register({
      id: 'items',
      validate: () => [
        {
          key: 'row-7:qty',
          source: 'ignored',
          message: '数量不足',
          target: { rowKey: 'row-7', field: 'qty', tab: 'items' },
        },
      ],
      reveal: issue => {
        revealed = String(issue.target?.rowKey)
      },
    })
    expect(scope.dirty.value).toBe(false)
    dirty.value = true
    expect(scope.dirty.value).toBe(true)
    expect(await scope.validate()).toBe(false)
    expect(scope.issues.value.map(x => x.source)).toEqual(['header', 'items'])
    expect(await scope.reveal(scope.issues.value[1])).toBe(true)
    expect(revealed).toBe('row-7')
    scope.dispose()
  })
  test('unregister aborts old validation and late results cannot repopulate issues', async () => {
    const scope = useValidationScope()
    let complete!: (value: []) => void
    let signal!: AbortSignal
    const remove = scope.register({
      id: 'A',
      validate: value => {
        signal = value
        return new Promise<[]>(r => {
          complete = r
        })
      },
    })
    const pending = scope.validate()
    expect(scope.validate()).toBe(pending)
    await Promise.resolve()
    remove()
    complete([])
    expect(signal.aborted).toBe(true)
    expect(await pending).toBe(false)
    expect(scope.issues.value).toEqual([])
    expect(await scope.validate()).toBe(true)
    scope.dispose()
  })

  test('void form validators need no wrapper and registration during validation cancels only the old run', async () => {
    const scope = useValidationScope()
    let first = true
    scope.register({
      id: 'form',
      validate: () => {
        if (first) {
          first = false
          scope.register({ id: 'details', validate: async () => undefined })
        }
      },
    })
    expect(await scope.validate()).toBe(false)
    expect(await scope.validate()).toBe(true)
    scope.dispose()
  })
  test('duplicate sources fail explicitly; circular errors and duplicate messages stay bounded', () => {
    const scope = useValidationScope()
    scope.register({ id: 'A', validate: () => [] })
    expect(() => scope.register({ id: 'A', validate: () => [] })).toThrow()
    const circular: unknown[] = [{ field: 'name', message: '必填' }]
    circular.push(circular, { field: 'name', message: '必填' })
    expect(collectValidationIssues(circular, 'A')).toHaveLength(1)
    expect(collectValidationIssues(new Error('offline'), 'A')[0].message).toBe(
      'offline'
    )
    scope.dispose()
  })
  test('complete error addresses preserve typed row, section and tab identity without delimiter collisions', async () => {
    const scope = useValidationScope()
    const targets: ValidationTarget[] = [
      { rowKey: 0, field: 'qty', section: 'A', tab: 'B' },
      { rowKey: '0', field: 'qty', section: 'A', tab: 'B' },
      { rowKey: 0, field: 'qty', section: 'other', tab: 'B' },
      { rowKey: 0, field: 'qty', section: 'A', tab: 'other' },
      { rowKey: 0, field: 'qty', section: 'A:B', tab: 'C' },
      { rowKey: 0, field: 'qty', section: 'A', tab: 'B:C' },
    ]
    const errors = targets.map(
      target =>
        collectValidationIssues(new Error('Required'), 'items', target)[0]
    )
    expect(new Set(errors.map(issue => issue.key)).size).toBe(targets.length)
    // A supplied rule key is opaque and cannot replace the target address.
    const issues = errors.map(issue => ({ ...issue, key: 'required' }))
    scope.register({ id: 'items', validate: () => [...issues, issues[0]] })
    expect(await scope.validate()).toBe(false)
    expect(scope.issues.value).toHaveLength(targets.length)
    expect(new Set(scope.issues.value.map(issue => issue.key)).size).toBe(
      targets.length
    )
    scope.dispose()
  })
  test('late navigation errors cannot overwrite a newer navigation or a disposed scope', async () => {
    const scope = useValidationScope(),
      old = deferred<void>(),
      last = deferred<void>()
    let calls = 0
    scope.register({
      id: 'items',
      validate: () => undefined,
      reveal: () => {
        calls++
        return calls === 1
          ? old.promise
          : calls === 3
            ? last.promise
            : undefined
      },
    })
    const issue: ValidationIssue = {
      key: 'qty',
      source: 'items',
      message: 'Required',
    }
    const first = scope.reveal(issue)
    expect(await scope.reveal(issue)).toBe(true)
    old.reject(new Error('stale navigation'))
    expect(await first).toBe(false)
    expect(scope.navigationError.value).toBeNull()
    const pending = scope.reveal(issue)
    scope.dispose()
    last.reject(new Error('disposed navigation'))
    expect(await pending).toBe(false)
    expect(scope.navigationError.value).toBeNull()
  })
  test('publishing issues cannot report success after a synchronous observer registers another region', async () => {
    const scope = useValidationScope()
    scope.register({ id: 'header', validate: () => undefined })
    let registered = false
    const stop = watch(
      scope.issues,
      () => {
        if (registered) return
        registered = true
        scope.register({
          id: 'items',
          validate: () => [
            { key: 'required', source: '', message: 'Required' },
          ],
        })
      },
      { flush: 'sync' }
    )
    expect(await scope.validate()).toBe(false)
    expect(registered).toBe(true)
    expect(await scope.validate()).toBe(false)
    expect(scope.issues.value.map(issue => issue.source)).toEqual(['items'])
    stop()
    scope.dispose()
  })
  test('busy observers share the installed promise before validators are dispatched', async () => {
    const scope = useValidationScope(),
      complete = deferred<void>()
    scope.register({ id: 'header', validate: () => complete.promise })
    let observed: Promise<boolean> | undefined
    const stop = watch(
      scope.validating,
      busy => {
        if (busy && !observed) observed = scope.validate()
      },
      { flush: 'sync' }
    )
    const first = scope.validate()
    expect(observed).toBe(first)
    complete.resolve()
    expect(await first).toBe(true)
    stop()
    scope.dispose()
  })
  test('a busy observer may replace an invalidated run without leaving an orphaned promise', async () => {
    const scope = useValidationScope()
    let calls = 0,
      replacement: Promise<boolean> | undefined,
      replaced = false
    scope.register({
      id: 'header',
      validate: () => {
        calls++
      },
    })
    const stop = watch(
      scope.validating,
      busy => {
        if (!busy || replaced) return
        replaced = true
        scope.register({ id: 'items', validate: () => undefined })
        replacement = scope.validate()
      },
      { flush: 'sync' }
    )
    const old = scope.validate()
    expect(scope.validate()).toBe(replacement!)
    expect(await old).toBe(false)
    expect(await replacement).toBe(true)
    expect(calls).toBe(1)
    expect(scope.validating.value).toBe(false)
    stop()
    scope.dispose()
  })
  test('abort callbacks may begin a new run without losing its pending promise or busy state', async () => {
    const scope = useValidationScope(),
      first = deferred<void>(),
      second = deferred<void>()
    let calls = 0,
      next: Promise<boolean> | undefined
    const signals: AbortSignal[] = []
    scope.register({
      id: 'header',
      validate: signal => {
        signals.push(signal)
        calls++
        if (calls === 1) {
          signal.addEventListener('abort', () => {
            next = scope.validate()
          })
          return first.promise
        }
        return second.promise
      },
    })
    const old = scope.validate()
    await Promise.resolve()
    scope.clear()
    expect(next).toBeDefined()
    expect(scope.validate()).toBe(next!)
    expect(scope.validating.value).toBe(true)
    await Promise.resolve()
    expect(signals[1].aborted).toBe(false)
    first.resolve()
    expect(await old).toBe(false)
    expect(scope.validating.value).toBe(true)
    second.resolve()
    expect(await next).toBe(true)
    expect(scope.validating.value).toBe(false)
    scope.dispose()
  })
})
