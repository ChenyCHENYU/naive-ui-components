import { shallowRef } from 'vue'
import { getPickerValue, validatePickerPage } from './source'
import type { DataPickerProps, DataPickerValue } from './types'

/** Confirmation and stored shortcuts share one cancelable eligibility check. */
export function usePickerResolver<T extends object, F extends object>(
  props: Readonly<DataPickerProps<T, F>>
) {
  const pending = shallowRef(false)
  const error = shallowRef<{
    kind: 'invalid' | 'failed'
    cause: unknown
  } | null>(null)
  let controller: AbortController | undefined
  const abort = () => {
    controller?.abort()
    controller = undefined
    pending.value = false
    error.value = null
  }
  const resolve = async (values: DataPickerValue[]) => {
    abort()
    const { source } = props
    if (!source.resolve) return
    const request = new AbortController()
    controller = request
    pending.value = true
    let validating = false
    try {
      const response =
        props.scope === undefined
          ? await source.resolve(values, request.signal)
          : await source.resolve(values, request.signal, { scope: props.scope })
      const result = [...response]
      if (request.signal.aborted || controller !== request) return
      validating = true
      validatePickerPage(
        source,
        { rows: result, total: result.length },
        result.length
      )
      const rows = new Map(
        result.map(row => [getPickerValue(source, row), row])
      )
      const valid = values.every(value => {
        const row = rows.get(value)
        return (
          row !== undefined &&
          props.rowCheckable?.(row) !== false &&
          !props.disabledReason?.(row)
        )
      })
      if (!valid) throw new Error('Selection is missing or no longer eligible')
      return rows
    } catch (cause) {
      if (!request.signal.aborted)
        error.value = { kind: validating ? 'invalid' : 'failed', cause }
      return undefined
    } finally {
      if (controller === request) {
        controller = undefined
        pending.value = false
      }
    }
  }
  return { pending, error, resolve, abort }
}
