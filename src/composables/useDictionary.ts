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
    const current = snapshot(options)
    if (!owns(key, view)) return false
    snapshots.set(key, current)
    if (!owns(key, view)) return false
    labelResolvers.set(key, createDictionaryLabelResolver(current))
    return owns(key, view)
  }

  function read(key: string, view: DictionaryView): void {
    if (!owns(key, view)) return
    try {
      if (publish(key, view, view.source.getOptions())) errors.delete(key)
    } catch (error) {
      report(key, error, view)
    }
  }

  /** 单次远端请求只管理自身控制器和结果；切换/取消由 load 统一协调。 */
  async function loadRemote(
    key: string,
    view: DictionaryView,
    loader: NonNullable<DictionarySource['load']>
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
      })
      if (!isCurrent(key, view, controller)) return
      // 订阅在请求期间发布了更新时，以源的当前快照为准，迟到结果不能覆盖它。
      publish(
        key,
        view,
        revision === view.revision ? result : view.source.getOptions()
      )
    } catch (error) {
      if (isCurrent(key, view, controller)) report(key, error, view)
    } finally {
      if (owns(key, view) && view.controller === controller) {
        view.controller = undefined
        loading.set(key, false)
      }
    }
  }

  async function load(key: string, view: DictionaryView): Promise<void> {
    if (!owns(key, view)) return
    const previous = view.controller
    view.controller = undefined
    previous?.abort()
    // abort 回调可能同步重载或销毁；新控制器属于后发请求。
    if (!owns(key, view) || view.controller) return
    const loader = view.source.load
    if (loader) await loadRemote(key, view, loader)
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
    async reload(key?: string): Promise<void> {
      const targets =
        key === undefined
          ? [...views]
          : views.has(key)
            ? [[key, views.get(key)!] as const]
            : []
      await Promise.all(targets.map(([field, view]) => load(field, view)))
    },
  }
}
