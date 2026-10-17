import { getCurrentScope, onScopeDispose, shallowReactive } from 'vue'

export type ActionTaskResult<T> =
  { executed: false } | { executed: true; value: T }

/** Instance-scoped task locks. Errors belong to the caller's feedback boundary. */
export function useActionTask<K>() {
  const running = shallowReactive(new Set<K>())
  let disposed = false

  const isRunning = (key: K): boolean => running.has(key)

  const run = async <T>(
    key: K,
    task: () => T | Promise<T>,
    canRun: () => boolean = () => true
  ): Promise<ActionTaskResult<T>> => {
    if (disposed || running.has(key) || !canRun()) return { executed: false }
    running.add(key)
    try {
      return { executed: true, value: await task() }
    } finally {
      running.delete(key)
    }
  }

  const dispose = (): void => {
    disposed = true
    running.clear()
  }

  if (getCurrentScope()) onScopeDispose(dispose)
  return { isRunning, run, dispose }
}
