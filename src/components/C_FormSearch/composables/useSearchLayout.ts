import { computed, ref, type CSSProperties } from 'vue'
import { useGridWidth } from '../../C_Form/layouts/Grid/useGridWidth'

interface SearchLayoutOptions {
  enabled: boolean
  minWidth: number
  gap: number
  columns?: number
}

/** 复用表单尺寸观测生命周期；按容器而非视口分栏，span 不产生隐式溢出轨道。 */
export function useSearchLayout(options: () => SearchLayoutOptions) {
  const root = ref<HTMLElement | null>(null)
  const layout = computed(options)
  const width = useGridWidth(root, () => layout.value.enabled)
  const minWidth = computed(() => {
    const value = layout.value.minWidth
    return Number.isFinite(value) ? Math.max(1, value) : 208
  })
  const columns = computed(() => {
    const { gap, columns: maximum } = layout.value
    const count =
      width.value > 0
        ? Math.max(1, Math.floor((width.value + gap) / (minWidth.value + gap)))
        : 1
    return maximum !== undefined && Number.isFinite(maximum)
      ? Math.min(count, Math.max(1, Math.floor(maximum)))
      : count
  })
  const style = computed<CSSProperties | undefined>(() =>
    layout.value.enabled
      ? {
          gridTemplateColumns: `repeat(${columns.value}, minmax(0, 1fr))`,
          columnGap: `${layout.value.gap}px`,
          '--c-search-layout-min-width': `${minWidth.value}px`,
        }
      : undefined
  )
  const fieldStyle = (field: {
    span?: number
    minWidth?: number
  }): CSSProperties | undefined => {
    const { enabled, gap } = layout.value
    if (!enabled) return undefined
    const track = (width.value + gap) / columns.value
    const minimum =
      field.minWidth && track > 0
        ? Math.ceil((field.minWidth + gap) / track)
        : 1
    const requested = Number.isFinite(field.span)
      ? Math.floor(field.span ?? 1)
      : 1
    return {
      gridColumn: `span ${Math.min(columns.value, Math.max(1, requested, minimum))}`,
    }
  }
  return { root, style, fieldStyle }
}
