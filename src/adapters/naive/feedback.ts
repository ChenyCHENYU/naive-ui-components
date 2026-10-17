import { getCurrentInstance, inject, toValue, type MaybeRefOrGetter } from 'vue'
import { useDialog, useMessage } from 'naive-ui'
import { COMPONENT_FEEDBACK_KEY } from '../../context'
import type { ComponentFeedback, ConfirmOptions } from '../../core/contracts'

/** Reuse Naive providers when present and safely degrade to injected/no-op feedback. */
export function useComponentFeedback(
  local?: MaybeRefOrGetter<ComponentFeedback | undefined>
): Required<ComponentFeedback> {
  const instance = getCurrentInstance()
  const global = instance ? inject(COMPONENT_FEEDBACK_KEY, {}) : {}
  let message: ReturnType<typeof useMessage> | null = null
  let dialog: ReturnType<typeof useDialog> | null = null

  if (instance) {
    try {
      message = useMessage()
    } catch {
      message = null
    }
    try {
      dialog = useDialog()
    } catch {
      dialog = null
    }
  }

  const adapter = () => toValue(local) ?? global
  const notify = (
    type: 'success' | 'error' | 'warning' | 'info',
    text: string,
    cause?: unknown
  ) => {
    const handler = adapter()[type]
    if (handler) handler(text, cause)
    else message?.[type](text)
  }

  const confirm = async (options: ConfirmOptions): Promise<boolean> => {
    const customConfirm = adapter().confirm
    if (customConfirm) return (await customConfirm(options)) !== false
    if (!dialog) {
      return typeof window !== 'undefined' &&
        typeof window.confirm === 'function'
        ? window.confirm(`${options.title}\n${options.content}`)
        : false
    }

    return new Promise(resolve => {
      let settled = false
      const finish = (value: boolean) => {
        if (settled) return
        settled = true
        resolve(value)
      }
      const method = options.type ?? 'warning'
      dialog[method]({
        title: options.title,
        content: options.content,
        positiveText: options.positiveText,
        negativeText: options.negativeText,
        onPositiveClick: () => finish(true),
        onNegativeClick: () => finish(false),
        onClose: () => finish(false),
      })
    })
  }

  return {
    success: text => notify('success', text),
    error: (text, cause) => notify('error', text, cause),
    warning: text => notify('warning', text),
    info: text => notify('info', text),
    confirm,
  }
}
