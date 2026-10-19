import { ref, computed, nextTick, onBeforeUnmount } from 'vue'
import type { DraggableEvent } from 'vue-draggable-plus'
import type { DraggableItem, DragEvent, DraggableProps } from '../types'

type LayoutDragEvent = Partial<
  Pick<
    DraggableEvent<DraggableItem>,
    | 'data'
    | 'clonedData'
    | 'oldIndex'
    | 'newIndex'
    | 'oldDraggableIndex'
    | 'newDraggableIndex'
    | 'from'
    | 'to'
    | 'pullMode'
  >
>

type EmitFn = {
  (event: 'update:modelValue', value: DraggableItem[]): void
  (event: 'drag-start', dragEvent: DragEvent): void
  (event: 'drag-end', dragEvent: DragEvent): void
  (event: 'item-add', item: DraggableItem, index: number): void
  (event: 'item-remove', item: DraggableItem, index: number): void
  (event: 'list-change', list: DraggableItem[]): void
}

/**
 *
 */
export function useDraggableLayout(props: DraggableProps, emit: EmitFn) {
  const isDragging = ref(false)
  let draggingItem: DraggableItem | undefined
  let disposed = false
  onBeforeUnmount(() => {
    disposed = true
    isDragging.value = false
    draggingItem = undefined
  })

  const internalList = computed({
    get: () => props.modelValue ?? [],
    set: (value: DraggableItem[]) => {
      emit('update:modelValue', value)
      emit('list-change', value)
    },
  })

  const isEmpty = computed(() => (props.modelValue ?? []).length === 0)

  const listClasses = computed(() => [
    'c-draggable-list',
    props.listClass,
    `layout-${props.layout}`,
    {
      'flex-wrap':
        props.flexWrap &&
        (props.layout === 'horizontal' || props.layout === 'flex-wrap'),
    },
  ])

  const listStyles = computed(() => {
    const styles: Record<string, string | number> = {
      '--gap':
        typeof props.gap === 'number' ? `${props.gap}px` : (props.gap ?? '8px'),
      '--grid-columns': props.gridColumns ?? 4,
      '--justify-content': props.justifyContent ?? 'flex-start',
      '--align-items': props.alignItems ?? 'stretch',
      ...props.customStyles,
    }
    if (props.gridRows) {
      styles['--grid-rows'] = props.gridRows
    }
    return styles
  })

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
    }
    if (props.handle) {
      options.handle = props.handle
    } else if (props.showHandle) {
      options.handle = '.drag-handle'
    }
    return options
  })

  const getItemKey = (item: DraggableItem, index: number): string | number =>
    props.itemKey ? props.itemKey(item, index) : (item.id ?? index)

  const getItemTitle = (item: DraggableItem): string => {
    if (props.itemTitle) return props.itemTitle(item)
    return (
      item.title || item.name || item.label || String(item.id) || '未命名项目'
    )
  }

  const getItemDescription = (item: DraggableItem): string => {
    if (props.itemDescription) return props.itemDescription(item)
    return item.description || ''
  }

  const getItemClass = () => [
    'c-draggable-item',
    props.itemClass,
    { 'is-disabled': props.disabled },
  ]

  const validIndex = (index: number | undefined): index is number =>
    index !== undefined && Number.isInteger(index) && index >= 0

  const handleStart = (event: LayoutDragEvent) => {
    isDragging.value = true
    const oldIndex = event.oldDraggableIndex ?? event.oldIndex
    // 旧版本没有 data 时，仅在拖动开始前从来源列表保存真实业务项。
    draggingItem =
      event.data ??
      (validIndex(oldIndex) ? internalList.value[oldIndex] : undefined)
    if (draggingItem && validIndex(oldIndex)) {
      emit('drag-start', { oldIndex, newIndex: oldIndex, item: draggingItem })
    }
  }

  const handleEnd = (event: LayoutDragEvent) => {
    const oldIndex = event.oldDraggableIndex ?? event.oldIndex
    const newIndex = event.newDraggableIndex ?? event.newIndex
    const item = event.data ?? draggingItem
    draggingItem = undefined
    if (item && validIndex(oldIndex) && validIndex(newIndex)) {
      emit('drag-end', { oldIndex, newIndex, item })
    }
    nextTick(() => {
      if (!disposed) isDragging.value = false
    })
  }

  const handleAdd = (event: LayoutDragEvent) => {
    const newIndex = event.newDraggableIndex ?? event.newIndex
    // 跨列表新增实际插入 vendor 克隆的数据，不能按尚未更新的 props 下标猜测。
    const item = event.clonedData ?? event.data
    if (item && validIndex(newIndex)) emit('item-add', item, newIndex)
  }

  const handleRemove = (event: LayoutDragEvent) => {
    if (event.pullMode === 'clone') return
    const oldIndex = event.oldDraggableIndex ?? event.oldIndex
    // event.item 是 DOM；移除完成后该下标可能已经是相邻项。
    const item = event.data ?? draggingItem
    if (item && validIndex(oldIndex)) emit('item-remove', item, oldIndex)
  }

  const handleUpdate = () => {}

  const addItem = (item: DraggableItem, index?: number): void => {
    const list = [...internalList.value]
    if (typeof index === 'number' && index >= 0 && index <= list.length) {
      list.splice(index, 0, item)
    } else {
      list.push(item)
    }
    internalList.value = list
  }

  const removeItem = (index: number): DraggableItem | null => {
    if (index >= 0 && index < internalList.value.length) {
      const list = [...internalList.value]
      const [removed] = list.splice(index, 1)
      internalList.value = list
      return removed
    }
    return null
  }

  const moveItem = (fromIndex: number, toIndex: number): boolean => {
    const list = internalList.value
    if (
      fromIndex >= 0 &&
      fromIndex < list.length &&
      toIndex >= 0 &&
      toIndex < list.length &&
      fromIndex !== toIndex
    ) {
      const newList = [...list]
      const [item] = newList.splice(fromIndex, 1)
      newList.splice(toIndex, 0, item)
      internalList.value = newList
      return true
    }
    return false
  }

  const updateList = (newList: DraggableItem[]): void => {
    internalList.value = [...newList]
  }

  const clear = (): void => {
    internalList.value = []
  }

  const getItem = (index: number): DraggableItem | undefined =>
    internalList.value[index]

  const findIndex = (predicate: (item: DraggableItem) => boolean): number =>
    internalList.value.findIndex(predicate)

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
  }
}
