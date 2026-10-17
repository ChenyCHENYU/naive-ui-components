/** Compatibility entry: public protocols and Vue context, with the Naive UI adapter. */
export type {
  ConfirmOptions,
  ComponentFeedback,
  ComponentLocale,
  ComponentLocaleName,
} from './core/contracts'
export { COMPONENT_FEEDBACK_KEY, COMPONENT_LOCALE_KEY } from './context'
export { useComponentLocale } from './composables/useComponentLocale'
export { useComponentFeedback } from './adapters/naive/feedback'
