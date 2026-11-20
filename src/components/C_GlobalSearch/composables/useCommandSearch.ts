import { computed, onScopeDispose, shallowRef, watch } from 'vue'
import { useDataResource } from '../../../composables/useDataResource'
import type {
  GlobalSearchCommandItem,
  GlobalSearchCommandOptions,
  GlobalSearchCommandSource,
} from '../types'

const CONCURRENT_SOURCES = 3
const RESULTS_PER_SOURCE = 20

interface CommandRequest {
  query: string
  scope?: string | number
  sources: GlobalSearchCommandSource[]
}

interface CommandGroup {
  key: string
  title: string
  items: GlobalSearchCommandItem[]
  failed?: boolean
}

function selectSources(
  sources: readonly GlobalSearchCommandSource[],
  length: number
): GlobalSearchCommandSource[] {
  const seen = new Set<string>()
  return sources.flatMap(source => {
    const { key, title, minChars, search } = source
    if (!key || seen.has(key)) return []
    seen.add(key)
    const minimum =
      minChars !== undefined && Number.isSafeInteger(minChars)
        ? Math.max(minChars, 1)
        : 1
    return length < minimum ? [] : [{ key, title, search: search.bind(source) }]
  })
}

function normalizeResults(
  response: readonly GlobalSearchCommandItem[]
): GlobalSearchCommandItem[] {
  if (!Array.isArray(response))
    throw new TypeError('Command source must return an array')
  const items: GlobalSearchCommandItem[] = []
  const keys = new Set<string | number>()
  for (const item of response) {
    if (!item || typeof item.label !== 'string' || !item.label.trim()) continue
    if (typeof item.key !== 'string' && !Number.isFinite(item.key)) continue
    if (keys.has(item.key)) continue
    keys.add(item.key)
    items.push(item)
    if (items.length >= RESULTS_PER_SOURCE) break
  }
  return items
}

async function loadGroups(
  { sources, query, scope }: CommandRequest,
  signal: AbortSignal
): Promise<CommandGroup[]> {
  const results: CommandGroup[] = []
  let next = 0
  async function loadSource(
    source: GlobalSearchCommandSource
  ): Promise<CommandGroup> {
    const { key, title } = source
    try {
      const response = await source.search(query, { signal, scope })
      signal.throwIfAborted()
      return { key, title, items: normalizeResults(response) }
    } catch {
      return { key, title, items: [], failed: true }
    }
  }
  async function run(): Promise<void> {
    if (signal.aborted || next >= sources.length) return
    const index = next++
    results[index] = await loadSource(sources[index])
    return run()
  }
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENT_SOURCES, sources.length) }, run)
  )
  return results
}

/** Add-on command lookups share a cancellable query snapshot and never own menu history. */
export function useCommandSearch(
  options: () => GlobalSearchCommandOptions | undefined,
  activeQuery: () => string
) {
  const enabled = computed(() => Boolean(options()?.sources.length))
  const request = computed(() => {
    const query = activeQuery().trim()
    const config = options()
    if (!query || !config) return undefined
    const sources = selectSources(config.sources, query.length)
    return sources.length ? { query, scope: config.scope, sources } : undefined
  })
  const key = shallowRef<number | null>(null)
  const waiting = shallowRef(false)
  let snapshot: CommandRequest | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  let revision = 0
  const resource = useDataResource({
    key,
    load: ({ signal }) => loadGroups(snapshot!, signal),
  })

  function schedule(value: CommandRequest | undefined, delay: number): void {
    clearTimeout(timer)
    key.value = null
    waiting.value = value !== undefined
    if (!value) return
    timer = setTimeout(() => {
      snapshot = value
      key.value = ++revision
      waiting.value = false
    }, delay)
  }
  watch(
    request,
    value => {
      const delay = options()?.debounce
      schedule(
        value,
        delay !== undefined && Number.isFinite(delay) ? Math.max(0, delay) : 200
      )
    },
    { immediate: true, flush: 'sync' }
  )
  onScopeDispose(() => clearTimeout(timer))

  const groups = computed(() => resource.data.value ?? [])
  return {
    enabled,
    groups,
    loading: computed(() => waiting.value || resource.loading.value),
    failed: computed(() => groups.value.some(group => group.failed)),
    retry: () => {
      if (!waiting.value && !resource.loading.value) schedule(request.value, 0)
    },
  }
}
