import { describe, expect, test } from 'bun:test'
import { createRenderer, h, nextTick, reactive } from 'vue'
import { useDraggableLayout } from '../src/components/C_Draggable/composables/useDraggableLayout'
import type {
  DraggableItem,
  DraggableProps,
} from '../src/components/C_Draggable/types'

const renderer = createRenderer({
  patchProp: () => {},
  insert: () => {},
  remove: () => {},
  createElement: () => ({}),
  createText: () => ({}),
  createComment: () => ({}),
  setText: () => {},
  setElementText: () => {},
  parentNode: () => null,
  nextSibling: () => null,
})
function setupDraggable(items: DraggableItem[]) {
  const events: Array<[string, ...unknown[]]> = []
  const props = reactive<DraggableProps>({ modelValue: items })
  let draggable!: ReturnType<typeof useDraggableLayout>
  const app = renderer.createApp({
    setup() {
      draggable = useDraggableLayout(props, ((
        event: string,
        ...args: unknown[]
      ) => {
        events.push([event, ...args])
      }) as Parameters<typeof useDraggableLayout>[1])
      return () => h('div')
    },
  })
  app.mount({})
  return { draggable, props, events, unmount: () => app.unmount() }
}

describe('C_Draggable business event data', () => {
  test('cross-list remove/end retain the original data rather than DOM or a neighboring item', () => {
    const moved = { id: 'moved', title: 'Original' }
    const neighbor = { id: 'neighbor' }
    const { draggable, props, events, unmount } = setupDraggable([
      moved,
      neighbor,
    ])
    const original = props.modelValue![0]
    draggable.handleStart({ data: original, oldIndex: 0 })
    props.modelValue = [neighbor]
    const event = {
      data: original,
      oldIndex: 0,
      newIndex: 0,
      item: { nodeType: 1, id: 'dom-element' },
    }
    draggable.handleRemove(event)
    draggable.handleEnd(event)
    expect(events.find(([name]) => name === 'item-remove')?.[1]).toBe(original)
    expect(
      (
        events.find(([name]) => name === 'drag-end')?.[1] as
          | {
              item: DraggableItem
            }
          | undefined
      )?.item
    ).toBe(original)
    unmount()
  })

  test('cross-list add reports the actual vendor clone before parent v-model catches up', () => {
    const { draggable, events, unmount } = setupDraggable([{ id: 'existing' }])
    const original = { id: 'source', nested: { value: 1 } }
    const cloned = structuredClone(original)
    draggable.handleAdd({ data: original, clonedData: cloned, newIndex: 0 })
    expect(events[0]).toEqual(['item-add', cloned, 0])
    expect(events[0][1]).toBe(cloned)
    expect(events[0][1]).not.toBe(original)
    unmount()
  })

  test('copying into another list does not emit a removal for the unchanged source', () => {
    const { draggable, props, events, unmount } = setupDraggable([
      { id: 'source' },
    ])
    draggable.handleStart({ data: props.modelValue![0], oldIndex: 0 })
    draggable.handleRemove({
      data: props.modelValue![0],
      oldIndex: 0,
      pullMode: 'clone',
    })
    expect(events.some(([name]) => name === 'item-remove')).toBe(false)
    expect(props.modelValue).toHaveLength(1)
    unmount()
  })

  test('legacy events reuse the captured start item after source mutation without guessing unknown items', () => {
    const { draggable, props, events, unmount } = setupDraggable([
      { id: 'first' },
      { id: 'second' },
    ])
    const original = props.modelValue![0]
    draggable.handleStart({ oldIndex: 0 })
    props.modelValue = [{ id: 'second' }]
    draggable.handleRemove({ oldIndex: 0 })
    draggable.handleEnd({ oldIndex: 0, newIndex: 1 })
    expect(events.find(([name]) => name === 'item-remove')?.[1]).toBe(original)
    expect(
      (
        events.find(([name]) => name === 'drag-end')?.[1] as
          | {
              item: DraggableItem
            }
          | undefined
      )?.item
    ).toBe(original)
    const count = events.length
    draggable.handleAdd({ newIndex: 0 })
    draggable.handleRemove({ oldIndex: 0 })
    draggable.handleEnd({ oldIndex: 0, newIndex: 0 })
    expect(events).toHaveLength(count)
    unmount()
  })

  test('draggable indices take precedence over DOM child indices and unmount cancels delayed state updates', async () => {
    const { draggable, props, events, unmount } = setupDraggable([
      { id: 'item' },
    ])
    draggable.handleStart({ oldIndex: 3, oldDraggableIndex: 0 })
    draggable.handleEnd({
      data: props.modelValue![0],
      oldIndex: 3,
      oldDraggableIndex: 0,
      newIndex: 4,
      newDraggableIndex: 1,
    })
    expect(events[0][1]).toEqual({
      oldIndex: 0,
      newIndex: 0,
      item: props.modelValue![0],
    })
    expect(events[1][1]).toEqual({
      oldIndex: 0,
      newIndex: 1,
      item: props.modelValue![0],
    })
    unmount()
    await nextTick()
    expect(draggable.isDragging.value).toBe(false)
  })
})

test('custom business items need no id or index signature and retain their object identity', () => {
  interface WorkItem {
    uuid: string
    salary: number
  }
  const item: WorkItem = { uuid: 'business-key', salary: 2000 }
  const events: Array<[string, ...unknown[]]> = []
  let draggable!: ReturnType<typeof useDraggableLayout<WorkItem>>
  const app = renderer.createApp({
    setup() {
      draggable = useDraggableLayout<WorkItem>(
        {
          modelValue: [item],
          itemKey: row => row.uuid,
          itemTitle: row => row.salary.toFixed(),
        },
        (name, ...args) => events.push([name, ...args])
      )
      return () => h('div')
    },
  })
  app.mount({})
  expect(draggable.getItemKey(item, 0)).toBe('business-key')
  expect(draggable.getItemTitle(item)).toBe('2000')
  expect(draggable.getItem(0)).toBe(item)
  draggable.handleStart({ data: item, oldIndex: 0 })
  draggable.handleEnd({ data: item, oldIndex: 0, newIndex: 1 })
  expect(events.find(([name]) => name === 'drag-end')?.[1]).toEqual({
    oldIndex: 0,
    newIndex: 1,
    item,
  })
  expect(draggable.removeItem(0)).toBe(item)
  app.unmount()
})
