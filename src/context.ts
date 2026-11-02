import type { InjectionKey } from 'vue'
import type { FormConfig } from './components/C_Form/composables/useFormConfig'
import type { ComponentFeedback, ComponentLocale } from './core/contracts'
import type { DictionaryProvider } from './core/dictionary'

export type {
  DictionaryValue,
  DictionaryOption,
  DictionarySource,
  DictionaryState,
  DictionaryProvider,
  DictionaryBinding,
  DictionaryParseResult,
} from './core/dictionary'
export {
  createDictionaryLabelResolver,
  getDictionaryLabel,
  parseDictionaryValue,
} from './core/dictionary'

/** v1 只读 Provider 协议：跨独立插件/多副本共享 token，数据仍由各 Vue 应用持有。 */
export const DICTIONARY_PROVIDER_KEY: InjectionKey<DictionaryProvider> =
  Symbol.for('@robot-admin/dictionary/provider/v1')

// 按需安装只需共享注入协议，不加载组件或 Naive UI 反馈适配器。
export type {
  ConfirmOptions,
  ComponentFeedback,
  ComponentLocale,
  ComponentLocaleName,
} from './core/contracts'

export const COMPONENT_FEEDBACK_KEY: InjectionKey<ComponentFeedback> = Symbol(
  'robot-component-feedback'
)
export const COMPONENT_LOCALE_KEY: InjectionKey<ComponentLocale> = Symbol(
  'robot-component-locale'
)

/** 按需接入与全量安装共享同一个表单默认配置，不引入表单渲染依赖。 */
export const FORM_GLOBAL_CONFIG_KEY: InjectionKey<FormConfig> = Symbol(
  'c-form-global-config'
)

export type { FormConfig } from './components/C_Form/composables/useFormConfig'
