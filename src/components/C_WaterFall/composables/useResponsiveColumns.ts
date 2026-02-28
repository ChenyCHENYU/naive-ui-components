import { ref, readonly, watch, onMounted, onBeforeUnmount } from "vue";
import type { Ref } from "vue";
import type { WaterFallBreakpoint } from "../types";
import { DEFAULT_BREAKPOINTS } from "../constants";

export function useResponsiveColumns(
  containerRef: Ref<HTMLElement | undefined>,
  fixedColumns?: Ref<number | undefined>,
  breakpoints?: Ref<WaterFallBreakpoint[] | undefined>,
) {
  const columns = ref(4);
  const containerWidth = ref(0);

  function resolveColumns(width: number): number {
    if (fixedColumns?.value && fixedColumns.value > 0)
      return fixedColumns.value;
    const bps = breakpoints?.value?.length
      ? breakpoints.value
      : DEFAULT_BREAKPOINTS;
    const sorted = [...bps].sort((a, b) => b.minWidth - a.minWidth);
    for (const bp of sorted) {
      if (width >= bp.minWidth) return bp.columns;
    }
    return 1;
  }

  let resizeObserver: ResizeObserver | null = null;

  function startObserving() {
    const el = containerRef.value;
    if (!el) return;
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        containerWidth.value = width;
        columns.value = resolveColumns(width);
      }
    });
    resizeObserver.observe(el);
    const rect = el.getBoundingClientRect();
    containerWidth.value = rect.width;
    columns.value = resolveColumns(rect.width);
  }

  function stopObserving() {
    resizeObserver?.disconnect();
    resizeObserver = null;
  }

  onMounted(startObserving);
  onBeforeUnmount(stopObserving);

  watch(containerRef, () => {
    stopObserving();
    startObserving();
  });

  watch([() => fixedColumns?.value, () => breakpoints?.value], () => {
    if (containerWidth.value > 0) {
      columns.value = resolveColumns(containerWidth.value);
    }
  });

  return {
    columns: readonly(columns),
    containerWidth: readonly(containerWidth),
  };
}
