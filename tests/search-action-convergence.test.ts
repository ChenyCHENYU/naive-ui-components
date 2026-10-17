import { describe, expect, test } from 'bun:test'
import { effectScope } from 'vue'
import { useActionTask } from '../src/composables/useActionTask'

describe('instance action task boundary', () => {
  test('locks synchronously by stable key while independent keys can run', async () => {
    const tasks = useActionTask<string>()
    let release!: () => void
    let calls = 0
    const pending = tasks.run('save', async () => {
      calls++
      await new Promise<void>(resolve => {
        release = resolve
      })
      return 42
    })
    expect(tasks.isRunning('save')).toBe(true)
    expect(
      await tasks.run('save', () => {
        calls++
      })
    ).toEqual({ executed: false })
    expect(await tasks.run('other', () => 'ok')).toEqual({
      executed: true,
      value: 'ok',
    })
    expect(
      await tasks.run(
        'blocked',
        () => {
          calls++
        },
        () => false
      )
    ).toEqual({ executed: false })
    release()
    expect(await pending).toEqual({ executed: true, value: 42 })
    expect(calls).toBe(1)
    expect(tasks.isRunning('save')).toBe(false)
  })

  test('preserves failures and releases the lock for retry', async () => {
    const tasks = useActionTask<string>()
    const cause = new Error('network failed')
    await expect(
      tasks.run('save', () => {
        throw cause
      })
    ).rejects.toBe(cause)
    expect(tasks.isRunning('save')).toBe(false)
    expect(await tasks.run('save', () => 'retry')).toEqual({
      executed: true,
      value: 'retry',
    })
  })

  test('scope disposal clears local state and prevents further execution', async () => {
    const scope = effectScope()
    const tasks = scope.run(() => useActionTask<string>())!
    let release!: () => void
    const pending = tasks.run(
      'save',
      () =>
        new Promise<void>(resolve => {
          release = resolve
        })
    )
    const otherInstance = useActionTask<string>()
    expect(await otherInstance.run('save', () => 'independent')).toEqual({
      executed: true,
      value: 'independent',
    })
    scope.stop()
    expect(tasks.isRunning('save')).toBe(false)
    expect(await tasks.run('save', () => 'late')).toEqual({ executed: false })
    release()
    await pending
    expect(tasks.isRunning('save')).toBe(false)
  })
})
