import {
  computed,
  getCurrentInstance,
  inject,
  toValue,
  type MaybeRefOrGetter,
} from 'vue'
import { COMPONENT_LOCALE_KEY } from '../../context'
import { translateComponentMessage } from '../../core/locale'
import type { ComponentLocale } from '../../core/contracts'

/** 私有词表随组件入口加载；翻译优先级仍由公共协议执行。 */
export function useScopedComponentLocale(
  chinese: Readonly<Record<string, string>>,
  english: Readonly<Record<string, string>>,
  local?: MaybeRefOrGetter<ComponentLocale | undefined>
) {
  const application = getCurrentInstance()
    ? inject(COMPONENT_LOCALE_KEY, {})
    : {}
  const locale = computed(
    () => toValue(local)?.locale ?? application.locale ?? 'zh-CN'
  )
  const messages = computed(() => ({
    ...(locale.value === 'en-US' ? english : chinese),
    ...application.messages,
    ...toValue(local)?.messages,
  }))
  const effective: ComponentLocale = {
    get locale() {
      return locale.value
    },
    get messages() {
      return messages.value
    },
    get t() {
      return toValue(local)?.t ?? application.t
    },
  }
  return {
    locale,
    // 旧登录翻译器仅在没有显式组件上下文时兜底，不跨应用覆盖配置。
    configured: computed(() =>
      Boolean(
        toValue(local) ||
        application.locale ||
        application.messages ||
        application.t
      )
    ),
    t: (key: string, params?: Record<string, string | number>) =>
      translateComponentMessage(key, effective, {}, params),
  }
}
