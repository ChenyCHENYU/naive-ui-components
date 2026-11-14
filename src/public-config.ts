/** 发布配置入口：保留既有协议符号，按需提供 Naive 主题工厂。内部上下文不依赖适配器。 */
export {
  COMPONENT_FEEDBACK_KEY,
  COMPONENT_LOCALE_KEY,
  FORM_GLOBAL_CONFIG_KEY,
} from './context'
export type {
  ComponentFeedback,
  ComponentLocale,
  ComponentLocaleName,
  ConfirmOptions,
  FormConfig,
} from './context'
export { createComponentTheme } from './adapters/naive/theme'
export type { ComponentThemeConfig } from './adapters/naive/theme'
export {
  COMPONENT_COLOR_PALETTES,
  COMPONENT_CONTROL_HEIGHTS,
} from './core/theme'
export type { ComponentColorMode, ComponentThemeOptions } from './core/theme'
