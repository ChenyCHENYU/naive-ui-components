/** 组件内部 Vue/Naive 适配入口；公开 /config 由 public-config.ts 维护。 */
export type {
  ConfirmOptions,
  ComponentFeedback,
  ComponentLocale,
  ComponentLocaleName,
} from './core/contracts'
export { COMPONENT_FEEDBACK_KEY, COMPONENT_LOCALE_KEY } from './context'
export { useComponentLocale } from './composables/useComponentLocale'
export { useComponentFeedback } from './adapters/naive/feedback'
