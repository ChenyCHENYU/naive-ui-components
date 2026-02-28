import { ref, computed, nextTick } from "vue";
import type { DraggableItem, DragEvent, DraggableProps } from "../types";

type EmitFn = {
  (event: "update:modelValue", value: DraggableItem[]): void;
  (event: "drag-start", dragEvent: DragEvent): void;
  (event: "drag-end", dragEvent: DragEvent): void;
  (event: "item-add", item: DraggableItem, index: number): void;
  (event: "item-remove", item: DraggableItem, index: number): void;
  (event: "list-change", list: DraggableItem[]): void;
};

export function useDraggableLayout(props: DraggableProps, emit: EmitFn) {
  const isDragging = ref(false);

  const internalList = computed({
    get: () => props.modelValue ?? [],
    set: (value: DraggableItem[]) => {
      emit("update:modelValue", value);
      emit("list-change", value);
    },
  });

  const isEmpty = computed(() => (props.modelValue ?? []).length === 0);

  const listClasses = computed(() => [
    "c-draggable-list",
    props.listClass,
    `layout-${props.layout}`,
    {
      "flex-wrap":
        props.flexWrap &&
        (props.layout === "horizontal" || props.layout === "flex-wrap"),
    },
  ]);

  const listStyles = computed(() => {
    const styles: Record<string, string | number> = {
      "--gap":
        typeof props.gap === "number" ? `${props.gap}px` : (props.gap ?? "8px"),
      "--grid-columns": props.gridColumns ?? 4,
      "--justify-content": props.justifyContent ?? "flex-start",
      "--align-items": props.alignItems ?? "stretch",
      ...props.customStyles,
    };
    if (props.gridRows) {
      styles["--grid-rows"] = props.gridRows;
    }
    return styles;
  });

  const draggableOptions = computed(() => {
    const options: Record<string, any> = {
      disabled: props.disabled,
      group: props.group,
      sort: props.sort,
      animation: props.animation,
      delay: props.delay,
      ghostClass: props.ghostClass,
      chosenClass: props.chosenClass,
      dragClass: props.dragClass,
      swapThreshold: props.swapThreshold,
      invertSwap: props.invertSwap,
      direction: props.direction,
      forceFallback: false,
    };
    if (props.handle) {
      options.handle = props.handle;
    } else if (props.showHandle) {
      options.handle = ".drag-handle";
    }
    return options;
  });

  const getItemKey = (item: DraggableItem, index: number): string | number =>
    props.itemKey ? props.itemKey(item, index) : (item.id ?? index);

  const getItemTitle = (item: DraggableItem): string => {
    if (props.itemTitle) return props.itemTitle(item);
    return (
      item.title || item.name || item.label || String(item.id) || "未命名项目"
    );
  };

  const getItemDescription = (item: DraggableItem): string => {
    if (props.itemDescription) return props.itemDescription(item);
    return item.description || "";
  };

  const getItemClass = (_index: number) => [
    "c-draggable-item",
    props.itemClass,
    { "is-disabled": props.disabled },
  ];

  const handleStart = (event: any) => {
    isDragging.value = true;
    const item = internalList.value[event.oldIndex];
    if (item) {
      emit("drag-start", {
        oldIndex: event.oldIndex,
        newIndex: event.oldIndex,
        item,
      } as DragEvent);
    }
  };

  const handleEnd = (event: any) => {
    const item = internalList.value[event.newIndex];
    if (item) {
      emit("drag-end", {
        oldIndex: event.oldIndex,
        newIndex: event.newIndex,
        item,
      } as DragEvent);
    }
    nextTick(() => {
      isDragging.value = false;
    });
  };

  const handleAdd = (event: any) => {
    const item = internalList.value[event.newIndex];
    if (item) emit("item-add", item, event.newIndex);
  };

  const handleRemove = (event: any) => {
    if (event.item) emit("item-remove", event.item, event.oldIndex);
  };

  const handleUpdate = (_event: any) => {};

  const addItem = (item: DraggableItem, index?: number): void => {
    const list = [...internalList.value];
    if (typeof index === "number" && index >= 0 && index <= list.length) {
      list.splice(index, 0, item);
    } else {
      list.push(item);
    }
    internalList.value = list;
  };

  const removeItem = (index: number): DraggableItem | null => {
    if (index >= 0 && index < internalList.value.length) {
      const list = [...internalList.value];
      const [removed] = list.splice(index, 1);
      internalList.value = list;
      return removed;
    }
    return null;
  };

  const moveItem = (fromIndex: number, toIndex: number): boolean => {
    const list = internalList.value;
    if (
      fromIndex >= 0 &&
      fromIndex < list.length &&
      toIndex >= 0 &&
      toIndex < list.length &&
      fromIndex !== toIndex
    ) {
      const newList = [...list];
      const [item] = newList.splice(fromIndex, 1);
      newList.splice(toIndex, 0, item);
      internalList.value = newList;
      return true;
    }
    return false;
  };

  const updateList = (newList: DraggableItem[]): void => {
    internalList.value = [...newList];
  };

  const clear = (): void => {
    internalList.value = [];
  };

  const getItem = (index: number): DraggableItem | undefined =>
    internalList.value[index];

  const findIndex = (predicate: (item: DraggableItem) => boolean): number =>
    internalList.value.findIndex(predicate);

  return {
    isDragging,
    internalList,
    isEmpty,
    listClasses,
    listStyles,
    draggableOptions,
    getItemKey,
    getItemTitle,
    getItemDescription,
    getItemClass,
    handleStart,
    handleEnd,
    handleAdd,
    handleRemove,
    handleUpdate,
    addItem,
    removeItem,
    moveItem,
    updateList,
    clear,
    getItem,
    findIndex,
  };
}
