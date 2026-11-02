/** 字典控件的可取消视图快照；不缓存网络数据，不替代应用已有的 resolver/store。 */
import {
  getCurrentInstance,
  getCurrentScope,
  inject,
  onScopeDispose,
  shallowReactive,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from 'vue'
import { DICTIONARY_PROVIDER_KEY } from '../context'
import { notifyObserver } from '../core/observer'
import {
  createDictionaryLabelResolver,
  type DictionaryBinding,
  type DictionaryOption,
  type DictionarySource,
  type DictionaryValue,
} from '../core/dictionary'

const EMPTY_OPTIONS: readonly DictionaryOption[] = Object.freeze([])

/** 只有状态和数据入口指向同一份不可变快照时，才允许复用派生数据。 */
function getImmutableSnapshot(
  source: DictionarySource,
  options: readonly DictionaryOption[]
): readonly DictionaryOption[] | undefined {
  const candidate = source.getState?.()?.options
  return candidate === options ? candidate : undefined
}

function isDictionaryValue(value: unknown): value is DictionaryValue {
  return (
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  )
}

function copyOption(
  option: DictionaryOption,
  seen: Set<DictionaryValue>
): DictionaryOption {
  if (
    !option ||
    typeof option.label !== 'string' ||
    !isDictionaryValue(option.value)
  )
    throw new TypeError(
      '[dictionary] 选项必须有字符串 label 和有限的原始 value'
    )
  if (option.disabled !== undefined && typeof option.disabled !== 'boolean')
    throw new TypeError('[dictionary] disabled 必须是 boolean')
  if (seen.has(option.value))
    throw new TypeError('[dictionary] 选项 value 不得重复')
  seen.add(option.value)
  return { ...option }
}

interface DictionaryView {
  binding: DictionaryBinding
  source: DictionarySource
  controller?: AbortController
  unsubscribe?: () => void
  revision: number
  immutableSnapshot?: readonly DictionaryOption[]
}

interface DictionaryEntry {
  key: string
  binding: DictionaryBinding | undefined
  source: DictionarySource | undefined
  error?: unknown
}

/** 为一组控件绑定应用字典；只管理可销毁的视图快照和请求所有权。 */
export function useDictionaryOptions(
  bindings: MaybeRefOrGetter<
    ReadonlyMap<string, DictionaryBinding | undefined>
  >,
  config: { onError?: (error: unknown, key: string) => void } = {}
) {
  const provider = getCurrentInstance()
    ? inject(DICTIONARY_PROVIDER_KEY, undefined)
    : undefined
  const views = new Map<string, DictionaryView>()
  const snapshots = shallowReactive(
    new Map<string, readonly DictionaryOption[]>()
  )
  const loading = shallowReactive(new Map<string, boolean>())
  const errors = shallowReactive(new Map<string, unknown>())
  const labelResolvers = shallowReactive(
    new Map<string, (value: unknown) => string>()
  )
  let disposed = false

  const owns = (key: string, view: DictionaryView) =>
    !disposed && views.get(key) === view
  const isCurrent = (
    key: string,
    view: DictionaryView,
    controller: AbortController
  ) =>
    owns(key, view) &&
    !controller.signal.aborted &&
    view.controller === controller
  const report = (key: string, error: unknown, view?: DictionaryView) => {
    if (disposed || (view && !owns(key, view))) return
    error ??= '[dictionary] 字典加载失败'
    if (errors.has(key) && Object.is(errors.get(key), error)) return
    errors.set(key, error)
    if (!disposed && (!view || owns(key, view)))
      notifyObserver(() => config.onError?.(error, key))
  }
  const snapshot = (options: readonly DictionaryOption[]) => {
    if (!Array.isArray(options))
      throw new TypeError('[dictionary] 选项源必须返回数组')
    const seen = new Set<DictionaryValue>()
    return options.map(option => copyOption(option, seen))
  }
  const publish = (
    key: string,
    view: DictionaryView,
    options: readonly DictionaryOption[]
  ) => {
    if (!owns(key, view)) return false
    const immutable = getImmutableSnapshot(view.source, options)
    // 状态型源显式承诺快照不可变时，加载/失败通知只同步状态，不复制数据或重建索引。
    if (immutable && view.immutableSnapshot === immutable)
      return owns(key, view)
    const current = snapshot(options)
    if (!owns(key, view)) return false
    snapshots.set(key, current)
    if (!owns(key, view)) return false
    labelResolvers.set(key, createDictionaryLabelResolver(current))
    if (owns(key, view)) view.immutableSnapshot = immutable
    return owns(key, view)
  }

  /** 状态型源同时发布 loading/error，数据读取不能把源错误误判为恢复。 */
  function readState(
    key: string,
    view: DictionaryView,
    clearLegacy = false
  ): void {
    if (!owns(key, view)) return
    const state = view.source.getState?.()
    if (!owns(key, view)) return
    if (!state) {
      if (clearLegacy) errors.delete(key)
      return
    }
    loading.set(key, state.status === 'loading')
    if (!owns(key, view)) return
    if (state.status === 'error')
      report(key, state.error ?? '[dictionary] 字典加载失败', view)
    else errors.delete(key)
  }

  function read(key: string, view: DictionaryView): void {
    if (!owns(key, view)) return
    try {
      if (publish(key, view, view.source.getOptions()))
        readState(key, view, true)
    } catch (error) {
      report(key, error, view)
    }
  }

  /** 仅当前请求可结束自身加载状态；共享源仍可能为其他消费者加载。 */
  function finishLoad(
    key: string,
    view: DictionaryView,
    controller: AbortController
  ): void {
    if (owns(key, view) && view.controller === controller) {
      view.controller = undefined
      loading.set(key, false)
      // 同步观察者可能已启动替代请求，其加载状态由新请求管理。
      if (view.controller) return
      try {
        readState(key, view)
      } catch (error) {
        report(key, error, view)
      }
    }
  }

  /** 源已通知新代次时，旧共享等待的取消不能覆盖新状态或短暂触发错误反馈。 */
  function reportLoadFailure(
    key: string,
    view: DictionaryView,
    revision: number,
    error: unknown
  ): void {
    try {
      if (
        view.revision !== revision &&
        error instanceof Error &&
        error.name === 'AbortError' &&
        view.source.getState
      ) {
        readState(key, view)
        return
      }
    } catch (currentError) {
      report(key, currentError, view)
      return
    }
    // 当前请求失败和缺少状态协议的旧源继续明确报告，不按错误名一概静默。
    report(key, error, view)
  }

  /** 单次远端请求只管理自身控制器和结果；切换/取消由 load 统一协调。 */
  async function loadRemote(
    key: string,
    view: DictionaryView,
    loader: NonNullable<DictionarySource['load']>,
    force: boolean
  ): Promise<void> {
    const controller = new AbortController()
    view.controller = controller
    const { revision } = view
    loading.set(key, true)
    if (!isCurrent(key, view, controller)) return
    errors.delete(key)
    if (!isCurrent(key, view, controller)) return
    try {
      const result = await loader.call(view.source, {
        signal: controller.signal,
        ...(force ? { force: true } : {}),
      })
      if (!isCurrent(key, view, controller)) return
      // 订阅在请求期间发布了更新时，以源的当前快照为准，迟到结果不能覆盖它。
      publish(
        key,
        view,
        revision === view.revision ? result : view.source.getOptions()
      )
      readState(key, view)
    } catch (error) {
      if (isCurrent(key, view, controller))
        reportLoadFailure(key, view, revision, error)
    } finally {
      finishLoad(key, view, controller)
    }
  }

  async function load(
    key: string,
    view: DictionaryView,
    force = false
  ): Promise<void> {
    if (!owns(key, view)) return
    const previous = view.controller
    view.controller = undefined
    previous?.abort()
    // abort 回调可能同步重载或销毁；新控制器属于后发请求。
    if (!owns(key, view) || view.controller) return
    const loader = view.source.load
    if (loader) await loadRemote(key, view, loader, force)
    else read(key, view)
  }

  /** 初始化快照和订阅；同步销毁后仍归还迟到返回的清理函数。 */
  function connectView(key: string, view: DictionaryView): void {
    read(key, view)
    if (!owns(key, view)) return
    try {
      const unsubscribe = view.source.subscribe?.(() => {
        if (!owns(key, view)) return
        view.revision++
        read(key, view)
      })
      if (owns(key, view)) view.unsubscribe = unsubscribe
      else notifyObserver(() => unsubscribe?.())
    } catch (error) {
      report(key, error, view)
    }
    if (view.source.load) void load(key, view)
  }

  function reconcileBinding({
    key,
    binding,
    source,
    error,
  }: DictionaryEntry): void {
    if (disposed) return
    const current = views.get(key)
    if (current && current.source === source && current.binding === binding)
      return
    remove(key)
    if (disposed) return
    if (!source) {
      if (binding !== undefined)
        report(
          key,
          error ?? new Error(`[dictionary] 未注册字典: ${String(binding)}`)
        )
      return
    }
    const view: DictionaryView = { binding: binding!, source, revision: 0 }
    views.set(key, view)
    connectView(key, view)
  }

  function remove(key: string): void {
    const view = views.get(key)
    views.delete(key)
    view?.controller?.abort()
    try {
      view?.unsubscribe?.()
    } catch (error) {
      if (!disposed) report(key, error)
    }
    snapshots.delete(key)
    loading.delete(key)
    errors.delete(key)
    labelResolvers.delete(key)
  }

  let stop = () => {}
  // 必须先登记销毁：源的初次读取/订阅/加载也可能同步销毁当前作用域。
  if (getCurrentScope()) onScopeDispose(dispose)
  stop = watch(
    () =>
      [...toValue(bindings)].map(([key, binding]) => {
        try {
          return {
            key,
            binding,
            source:
              typeof binding === 'string'
                ? provider?.getDictionary(binding)
                : binding,
          }
        } catch (error) {
          return { key, binding, source: undefined, error }
        }
      }),
    entries => {
      const current = new Set(entries.map(entry => entry.key))
      for (const key of new Set([...views.keys(), ...errors.keys()]))
        if (!current.has(key)) remove(key)
      entries.forEach(reconcileBinding)
    },
    { immediate: true }
  )

  if (disposed) stop()

  function dispose() {
    if (disposed) return
    disposed = true
    stop()
    for (const key of new Set([...views.keys(), ...errors.keys()])) remove(key)
  }

  return {
    dispose,
    getOptions: (key: string): readonly DictionaryOption[] =>
      snapshots.get(key) ?? EMPTY_OPTIONS,
    getLabel: (key: string, value: unknown): string =>
      labelResolvers.get(key)?.(value) ?? String(value ?? ''),
    isLoading: (key: string): boolean => loading.get(key) ?? false,
    getError: (key: string): unknown => errors.get(key),
    getSource: (key: string): DictionarySource | undefined =>
      views.get(key)?.source,
    async reload(key?: string): Promise<void> {
      const targets =
        key === undefined
          ? [...views]
          : views.has(key)
            ? [[key, views.get(key)!] as const]
            : []
      await Promise.all(targets.map(([field, view]) => load(field, view, true)))
    },
  }
}
