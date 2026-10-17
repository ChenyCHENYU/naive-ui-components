import { getCurrentInstance, inject, toValue, type MaybeRefOrGetter } from 'vue'
import { COMPONENT_LOCALE_KEY } from '../context'
import { translateComponentMessage } from '../core/locale'
import type { ComponentLocale } from '../core/contracts'

/** Bind the UI-independent translator to this Vue application and local configuration. */
export function useComponentLocale(
  local?: MaybeRefOrGetter<ComponentLocale | undefined>
) {
  const global = getCurrentInstance() ? inject(COMPONENT_LOCALE_KEY, {}) : {}
  return {
    t: (key: string, params?: Record<string, string | number>): string =>
      translateComponentMessage(key, toValue(local), global, params),
  }
}
