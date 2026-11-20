import { computed, shallowRef, watch } from 'vue'
import { getPickerValue, validatePickerPage } from './source'
import type {
  DataPickerProps,
  DataPickerSourceInput,
  DataPickerValue,
} from './types'

const MAX_TEXT_LENGTH = 24_000
const MAX_ITEMS = 500

type BatchStatus = 'match' | 'missing' | 'disabled' | 'selected' | 'limit'
type BatchError = 'empty' | 'items' | 'text' | 'failed'

interface BatchSelection<T> {
  writable: () => boolean
  values: () => ReadonlyMap<DataPickerValue, T | undefined>
  maximum: () => number
  checkable: (row: T) => boolean
  append: (rows: ReadonlyMap<DataPickerValue, T>) => void
}

async function resolveBatchRows<T extends object, F extends object>(
  source: DataPickerSourceInput<T, F>,
  codes: string[],
  signal: AbortSignal,
  scope: string | number | undefined
): Promise<ReadonlyMap<DataPickerValue, T>> {
  const context: [] | [{ scope: string | number }] =
    scope === undefined ? [] : [{ scope }]
  if (source.resolveCodes) {
    const matched = await source.resolveCodes(codes, signal, ...context)
    signal.throwIfAborted()
    const rows = [...matched.values()]
    validatePickerPage(source, { rows, total: rows.length }, codes.length)
    return matched
  }
  const resolved = await source.resolve!(codes, signal, ...context)
  signal.throwIfAborted()
  const rows = [...resolved]
  validatePickerPage(source, { rows, total: rows.length }, codes.length)
  return new Map(rows.map(row => [getPickerValue(source, row), row]))
}

/** Batch lookup owns only its temporary preview; the picker owns the selection. */
export function usePickerBatchPaste<T extends object, F extends object>(
  props: Readonly<DataPickerProps<T, F>>,
  selection: BatchSelection<T>
) {
  const visible = shallowRef(false)
  const input = shallowRef('')
  const matches = shallowRef<Array<{ code: string; row?: T }>>([])
  const error = shallowRef<BatchError | null>(null)
  const pending = shallowRef(false)
  let controller: AbortController | undefined
  const enabled = computed(() =>
    Boolean(
      props.multiple &&
      props.batchPaste &&
      (props.source.resolveCodes || props.source.resolve)
    )
  )
  const maxItems = computed(() => {
    const configured =
      typeof props.batchPaste === 'object'
        ? props.batchPaste.maxItems
        : undefined
    if (
      configured === undefined ||
      !Number.isSafeInteger(configured) ||
      configured < 1
    )
      return 100
    return Math.min(configured, MAX_ITEMS)
  })
  const writable = computed(() => enabled.value && selection.writable())
  const results = computed(() => {
    const draft = selection.values()
    let available = selection.maximum() - draft.size
    return matches.value.map(({ code, row }) => {
      let status: BatchStatus = 'missing'
      if (row) {
        const value = getPickerValue(props.source, row)
        if (!selection.checkable(row)) status = 'disabled'
        else if (draft.has(value)) status = 'selected'
        else if (available <= 0) status = 'limit'
        else {
          status = 'match'
          available--
        }
      }
      return { code, row, status }
    })
  })
  const additions = computed(() => {
    const next = new Map<DataPickerValue, T>()
    for (const { row, status } of results.value) {
      if (row && status === 'match')
        next.set(getPickerValue(props.source, row), row)
    }
    return next
  })

  function clearPreview(): void {
    controller?.abort()
    controller = undefined
    matches.value = []
    error.value = null
    pending.value = false
  }

  function reset(): void {
    clearPreview()
    input.value = ''
    visible.value = false
  }
  watch([enabled, maxItems], reset, { flush: 'sync' })

  function toggle(): void {
    if (!writable.value) return
    if (visible.value) reset()
    else visible.value = true
  }

  function update(value: string): void {
    clearPreview()
    input.value = value
  }

  function readCodes(): string[] | undefined {
    if (input.value.length > MAX_TEXT_LENGTH) {
      error.value = 'text'
      return
    }
    // Whitespace inside a code is significant, along with case and leading zeroes.
    const codes = [
      ...new Set(
        input.value
          .split(/[,，、;；\r\n\t]/u)
          .map(code => code.trim())
          .filter(Boolean)
      ),
    ]
    if (codes.length === 0 || codes.length > maxItems.value) {
      error.value = codes.length === 0 ? 'empty' : 'items'
      return
    }
    return codes
  }

  async function lookup(): Promise<void> {
    if (!writable.value || !visible.value || pending.value) return
    clearPreview()
    const codes = readCodes()
    if (!codes) return
    const request = new AbortController()
    controller = request
    pending.value = true
    try {
      const matched = await resolveBatchRows(
        props.source,
        codes,
        request.signal,
        props.scope
      )
      if (controller !== request || !writable.value) return
      matches.value = codes.map(code => ({ code, row: matched.get(code) }))
    } catch {
      if (controller === request) error.value = 'failed'
    } finally {
      if (controller === request) {
        controller = undefined
        pending.value = false
      }
    }
  }

  function apply(): void {
    if (!writable.value || pending.value || !additions.value.size) return
    selection.append(additions.value)
  }

  return {
    enabled,
    visible,
    input,
    error,
    maxItems,
    pending,
    results,
    count: computed(() => additions.value.size),
    toggle,
    update,
    lookup,
    apply,
    reset,
  }
}
