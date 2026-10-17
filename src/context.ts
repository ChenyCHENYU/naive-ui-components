import type { InjectionKey } from 'vue'
import type { ComponentFeedback, ComponentLocale } from './core/contracts'

export const COMPONENT_FEEDBACK_KEY: InjectionKey<ComponentFeedback> = Symbol(
  'robot-component-feedback'
)
export const COMPONENT_LOCALE_KEY: InjectionKey<ComponentLocale> = Symbol(
  'robot-component-locale'
)
