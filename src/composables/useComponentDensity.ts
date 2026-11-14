import { computed, hasInjectionContext, inject } from 'vue'
import { COMPONENT_DENSITY_KEY } from '../context'
import type { ComponentDensity } from '../core/density'

/** 独立视觉上下文；缺省为 undefined，使领域控件继续保留自己的历史尺寸。 */
export function useComponentDensity(
  override?: () => ComponentDensity | undefined
) {
  const inherited = hasInjectionContext()
    ? inject(COMPONENT_DENSITY_KEY, undefined)
    : undefined
  return computed(() => override?.() ?? inherited?.value)
}
