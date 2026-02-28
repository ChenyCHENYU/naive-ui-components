import { ref, readonly, watch } from "vue";
import type { Ref } from "vue";
import type {
  WaterFallItem,
  WaterFallLayoutItem,
  WaterFallColumn,
} from "../types";
import { DEFAULT_GAP } from "../constants";

export function useWaterFallLayout(
  items: Ref<WaterFallItem[]>,
  columns: Readonly<Ref<number>>,
  containerWidth: Readonly<Ref<number>>,
  gap: Ref<number>,
) {
  const layoutItems = ref<WaterFallLayoutItem[]>([]);
  const containerHeight = ref(0);
  const imageHeightCache = new Map<string | number, number>();

  function cacheImageHeight(id: string | number, realHeight: number) {
    imageHeightCache.set(id, realHeight);
  }

  function calculate() {
    const cols = columns.value;
    const width = containerWidth.value;
    const g = gap.value ?? DEFAULT_GAP;

    if (cols <= 0 || width <= 0 || items.value.length === 0) {
      layoutItems.value = [];
      containerHeight.value = 0;
      return;
    }

    const colWidth = (width - (cols - 1) * g) / cols;
    const columnState: WaterFallColumn[] = Array.from(
      { length: cols },
      (_, i) => ({ index: i, height: 0 }),
    );

    const result: WaterFallLayoutItem[] = [];

    for (const item of items.value) {
      const shortest = columnState.reduce((min, col) =>
        col.height < min.height ? col : min,
      );

      const cached = imageHeightCache.get(item.id);
      const itemHeight = cached
        ? cached
        : item.width > 0
          ? (item.height / item.width) * colWidth
          : colWidth;

      const x = shortest.index * (colWidth + g);
      const y = shortest.height;

      result.push({
        item,
        columnIndex: shortest.index,
        x,
        y,
        width: colWidth,
        height: itemHeight,
      });

      shortest.height = y + itemHeight + g;
    }

    layoutItems.value = result;
    containerHeight.value = Math.max(...columnState.map((c) => c.height)) - g;
  }

  watch(
    [items, () => items.value.length, columns, containerWidth, gap],
    calculate,
    { immediate: true },
  );

  return {
    layoutItems: readonly(layoutItems),
    containerHeight: readonly(containerHeight),
    cacheImageHeight,
    relayout: calculate,
  };
}
