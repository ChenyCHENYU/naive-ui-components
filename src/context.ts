import type { InjectionKey, ComputedRef } from 'vue'
import type { ComponentDensity } from './core/density'
import type { FormConfig } from './components/C_Form/composables/useFormConfig'
import type { ComponentFeedback, ComponentLocale } from './core/contracts'
import type { TableGlobalConfig } from './components/C_Table/composables/useTableGlobalConfig'
// 按需安装共享组件自身配置，不加载组件或 Naive UI 反馈适配器。
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

/** 只表达视觉密度，不依赖表单或表格的业务配置。 */
export const COMPONENT_DENSITY_KEY: InjectionKey<
  ComputedRef<ComponentDensity>
> = Symbol('robot-component-density')

/** 按需接入与全量安装共享同一个表单默认配置，不引入表单渲染依赖。 */
export const FORM_GLOBAL_CONFIG_KEY: InjectionKey<FormConfig> = Symbol(
  'c-form-global-config'
)

export type { FormConfig } from './components/C_Form/composables/useFormConfig'

/** 表格默认配置与独立入口共享同一协议，不加载表格渲染代码。 */
export const TABLE_GLOBAL_CONFIG_KEY: InjectionKey<TableGlobalConfig> = Symbol(
  'C_TABLE_GLOBAL_CONFIG'
)
export type { TableGlobalConfig } from './components/C_Table/composables/useTableGlobalConfig'
