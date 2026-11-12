import {
  computed,
  getCurrentInstance,
  getCurrentScope,
  onActivated,
  onDeactivated,
  onScopeDispose,
  ref,
  shallowRef,
  watch,
  type ComputedRef,
} from 'vue'
import type { TreeKey, TreeProps } from '../types'
import {
  projectTreePaths,
  treeSearchKey,
  validateTreePaths,
} from '../searchProjection'

interface SearchOptions<T extends object> {
  props: TreeProps<T>
  pattern: ComputedRef<string>
  fields: () => {
    key: string
    children: string
    getChildren?: (node: T) => unknown
  }
  reveal: (path: readonly T[]) => Promise<boolean>
  preview: (
    paths: readonly (readonly T[])[],
    current: () => boolean
  ) => Promise<void>
  onError: (error: unknown) => void
  onLoadError: (error: unknown, node: T) => void
}

const bounded = (
  value: number | undefined,
  fallback: number,
  maximum: number
) =>
  Number.isFinite(value)
    ? Math.max(0, Math.min(maximum, Math.trunc(value!)))
    : fallback

/** 只协调远程路径与请求所有权；选中、复选、拖动和键盘仍由原生树负责。 */
export function useTreeSearch<T extends object>(options: SearchOptions<T>) {
  const { props } = options
  const matches = shallowRef<readonly (readonly T[])[]>([])
  const retainedPath = shallowRef<readonly T[]>([])
  const branches = shallowRef<ReadonlyMap<TreeKey, readonly T[]>>(new Map())
  const loading = ref(false)
  const error = shallowRef<unknown>(null)
  const matchIndex = ref(-1)
  const loadingKeys = shallowRef<ReadonlySet<TreeKey>>(new Set())
  const active = ref(true)
  const limit = computed(() =>
    Math.max(1, bounded(props.searchSource?.limit, 100, 1000))
  )
  const minChars = computed(() =>
    bounded(props.searchSource?.minChars, 1, 1000)
  )
  const query = computed(() => options.pattern.value.trim())
  const disabled = computed(
    () => props.disabled ?? props.treeProps?.disabled ?? false
  )
  const ready = computed(() =>
    Boolean(
      props.searchSource &&
      query.value.length >= minChars.value &&
      query.value &&
      !disabled.value
    )
  )
  let revision = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  let searchController: AbortController | undefined
  let locateController: AbortController | undefined
  const pending = new Map<
    TreeKey,
    { controller: AbortController; promise: Promise<boolean> }
  >()
  const paths = computed(() =>
    retainedPath.value.length
      ? [...matches.value, retainedPath.value]
      : matches.value
  )
  const projection = computed(() => {
    try {
      return {
        ...projectTreePaths(
          props.data,
          paths.value,
          branches.value,
          options.fields()
        ),
        error: null,
      }
    } catch (cause) {
      return {
        data: props.data,
        partialKeys: new Set<TreeKey>(),
        projected: false,
        error: cause,
      }
    }
  })
  const report = (cause: unknown) => {
    error.value = cause
    options.onError(cause)
  }
  watch(
    () => projection.value.error,
    cause => {
      if (!cause) return
      matches.value = []
      retainedPath.value = []
      branches.value = new Map()
      report(cause)
    }
  )

  function cancelSearch() {
    revision++
    clearTimeout(timer)
    timer = undefined
    searchController?.abort()
    searchController = undefined
    loading.value = false
  }
  function reset() {
    cancelSearch()
    locateController?.abort()
    locateController = undefined
    for (const request of pending.values()) request.controller.abort()
    pending.clear()
    loadingKeys.value = new Set()
    matches.value = []
    retainedPath.value = []
    branches.value = new Map()
    matchIndex.value = -1
    error.value = null
  }
  const currentSearch = (
    controller: AbortController,
    requestRevision: number
  ) =>
    !controller.signal.aborted && requestRevision === revision && active.value
  const currentLocate = (controller: AbortController) =>
    !controller.signal.aborted &&
    locateController === controller &&
    active.value
  const currentPaths = (result: readonly (readonly T[])[]) =>
    retainedPath.value.length ? [...result, retainedPath.value] : result
  async function run() {
    cancelSearch()
    if (!active.value || !ready.value) return
    const source = props.searchSource!
    const controller = new AbortController()
    searchController = controller
    const requestRevision = revision
    loading.value = true
    error.value = null
    try {
      const result = await source.request({
        search: query.value,
        signal: controller.signal,
        limit: limit.value,
      })
      if (!currentSearch(controller, requestRevision)) return
      validateTreePaths(result, options.fields().key, limit.value)
      projectTreePaths(
        props.data,
        currentPaths(result),
        branches.value,
        options.fields()
      )
      matches.value = result.map(path => [...path])
      matchIndex.value = -1
      await options.preview(result, () =>
        currentSearch(controller, requestRevision)
      )
    } catch (cause) {
      if (currentSearch(controller, requestRevision)) report(cause)
    } finally {
      if (searchController === controller) {
        loading.value = false
        searchController = undefined
      }
    }
  }
  function schedule() {
    cancelSearch()
    matches.value = []
    matchIndex.value = -1
    error.value = null
    if (!active.value || !ready.value) return
    loading.value = true
    timer = setTimeout(
      () => {
        void run()
      },
      bounded(props.searchSource?.debounce, 250, 10000)
    )
  }
  watch(
    [
      () => props.data,
      () => props.searchSource?.request,
      () => props.searchSource?.resolve,
      () => props.searchSource?.load,
      () => props.searchSource?.scope,
      () => options.fields().key,
      () => options.fields().children,
      () => options.fields().getChildren,
    ],
    () => {
      reset()
      schedule()
    },
    { flush: 'sync' }
  )
  watch([query, minChars, limit, disabled], schedule, {
    immediate: true,
    flush: 'sync',
  })

  async function locatePath(path: readonly T[]) {
    if (props.searchSource) retainedPath.value = path
    return options.reveal(path)
  }
  async function locateMatch(index: number) {
    const path = matches.value[index]
    if (!path || loading.value) return false
    cancelLocate()
    matchIndex.value = index
    return locatePath(path)
  }
  function validateResolvedPath(path: readonly T[], key: TreeKey) {
    validateTreePaths([path], options.fields().key, 1)
    if (treeSearchKey(path[path.length - 1], options.fields().key) !== key)
      throw new TypeError(
        'Resolved tree path does not end at the requested key'
      )
    projectTreePaths(props.data, [path], branches.value, options.fields())
  }
  async function locate(key: TreeKey) {
    const source = props.searchSource
    if (!source?.resolve || !active.value) return false
    locateController?.abort()
    const controller = new AbortController()
    locateController = controller
    try {
      const path = await source.resolve(key, controller.signal)
      if (!path || !currentLocate(controller)) return false
      validateResolvedPath(path, key)
      return await locatePath(path)
    } catch (cause) {
      if (currentLocate(controller)) report(cause)
      return false
    } finally {
      if (locateController === controller) locateController = undefined
    }
  }
  function cancelLocate() {
    locateController?.abort()
    locateController = undefined
  }
  function load(node: T): Promise<boolean> {
    const source = props.searchSource
    const sourceLoad = source?.load
    if (!sourceLoad || !active.value) return Promise.resolve(false)
    const requestChildren = sourceLoad
    const key = treeSearchKey(node, options.fields().key)
    const current = pending.get(key)
    if (current) return current.promise
    const controller = new AbortController()
    const promise = Promise.resolve().then(loadBranch)
    pending.set(key, { controller, promise })
    loadingKeys.value = new Set(pending.keys())
    return promise

    function mayCommit() {
      return !controller.signal.aborted && active.value
    }
    async function loadBranch() {
      try {
        if (!mayCommit()) return false
        const children = await requestChildren(node, {
          signal: controller.signal,
        })
        if (!mayCommit()) return false
        if (!Array.isArray(children))
          throw new TypeError('Tree load must return a complete child array')
        const next = new Map(branches.value).set(key, children)
        projectTreePaths(props.data, paths.value, next, options.fields())
        branches.value = next
        return true
      } catch (cause) {
        if (mayCommit()) options.onLoadError(cause, node)
        return false
      } finally {
        if (pending.get(key)?.controller === controller) {
          pending.delete(key)
          loadingKeys.value = new Set(pending.keys())
        }
      }
    }
  }
  function acceptBranch(key: TreeKey, children: readonly T[]) {
    const next = new Map(branches.value).set(key, children)
    projectTreePaths(props.data, paths.value, next, options.fields())
    branches.value = next
  }
  if (getCurrentInstance()) {
    onDeactivated(() => {
      active.value = false
      reset()
    })
    onActivated(() => {
      if (active.value) return
      active.value = true
      schedule()
    })
  }
  if (getCurrentScope())
    onScopeDispose(() => {
      active.value = false
      reset()
    })
  return {
    projection,
    matches,
    loading,
    error,
    matchIndex,
    ready,
    minChars,
    active,
    loadingKeys,
    run,
    locate,
    locateMatch,
    load,
    acceptBranch,
    cancelLocate,
    retainAndReveal: locatePath,
    nextMatch: () => locateMatch((matchIndex.value + 1) % matches.value.length),
    previousMatch: () =>
      locateMatch(
        (matchIndex.value <= 0 ? matches.value.length : matchIndex.value) - 1
      ),
  }
}
