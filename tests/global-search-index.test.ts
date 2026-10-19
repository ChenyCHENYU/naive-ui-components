import { afterEach, describe, expect, test } from 'bun:test'
import { createRenderer, h, nextTick, ref, type MaybeRefOrGetter } from 'vue'
import { useGlobalSearch } from '../src/components/C_GlobalSearch/composables/useGlobalSearch'
import {
  createMenuSearchIndex,
  searchMenuIndex,
} from '../src/components/C_GlobalSearch/composables/searchIndex'
import type {
  GlobalSearchOptions,
  SearchMenuItem,
} from '../src/components/C_GlobalSearch/types'

const cleanup: (() => void)[] = []
afterEach(() => {
  while (cleanup.length) cleanup.pop()!()
})

function mountSearch(options: MaybeRefOrGetter<GlobalSearchOptions>) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document')
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { addEventListener: () => {}, removeEventListener: () => {} },
  })
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
  let search!: ReturnType<typeof useGlobalSearch>
  const app = renderer.createApp({
    setup() {
      search = useGlobalSearch(options)
      return () => h('div')
    },
  })
  app.mount({})
  cleanup.push(() => {
    app.unmount()
    if (previous) Object.defineProperty(globalThis, 'document', previous)
    else Reflect.deleteProperty(globalThis, 'document')
  })
  return search
}

function keyEvent(key: string, extra: Partial<KeyboardEvent> = {}) {
  return {
    key,
    defaultPrevented: false,
    isComposing: false,
    keyCode: 0,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    preventDefault() {
      this.defaultPrevented = true
    },
    ...extra,
  } as KeyboardEvent
}

describe('global search cached source index', () => {
  test('keeps source order/identity and the literal label/display-path search rules', () => {
    const items: SearchMenuItem[] = [
      { key: '/', label: 'Home' },
      { key: '/OPS/Users', label: 'USER settings' },
      { key: '/OPS/Archive', label: 'Archive [2026]' },
      { key: '/Other', label: ' user ' },
    ]
    const index = createMenuSearchIndex(items)
    expect(searchMenuIndex(index, 'USER')).toEqual([items[1], items[3]])
    expect(searchMenuIndex(index, 'USER')[0]).toBe(items[1])
    expect(searchMenuIndex(index, 'ops >')).toEqual([items[1], items[2]])
    expect(searchMenuIndex(index, '/OPS/Users')).toEqual([])
    expect(searchMenuIndex(index, '首页')).toEqual([items[0]])
    expect(searchMenuIndex(index, '[2026]')).toEqual([items[2]])
    expect(searchMenuIndex(index, ' user ')).toEqual([items[3]])
    expect(searchMenuIndex(index, '   ')).toEqual([])
  })

  test('reads searchable menu fields once across query edits and rebuilds for reactive source edits', async () => {
    let labelReads = 0
    let keyReads = 0
    let sourceReads = 0
    const items = ref(
      Array.from(
        { length: 10_000 },
        (_, index) =>
          new Proxy(
            { key: `/entry/${index}`, label: `Entry ${index}` },
            {
              get(target, property, receiver) {
                if (property === 'label') labelReads++
                if (property === 'key') keyReads++
                return Reflect.get(target, property, receiver)
              },
            }
          )
      )
    )
    const search = mountSearch({
      menuItems: () => {
        sourceReads++
        return items.value
      },
    })
    expect(sourceReads).toBe(0)
    for (const query of ['entry', 'entry 9', 'entry 99', 'entry 999']) {
      search.searchValue.value = query
      expect(search.filteredMenuItems.value.length).toBeGreaterThan(0)
    }
    expect(sourceReads).toBe(1)
    expect(labelReads).toBe(10_000)
    expect(keyReads).toBe(10_000)
    items.value[0].label = 'New label'
    search.searchValue.value = 'new label'
    expect(search.filteredMenuItems.value).toEqual([items.value[0]])
    items.value[0].key = '/changed/path'
    search.searchValue.value = 'changed > path'
    expect(search.filteredMenuItems.value).toEqual([items.value[0]])
    items.value.push({ key: '/added', label: 'Newly added' })
    search.searchValue.value = 'newly added'
    expect(search.filteredMenuItems.value).toEqual([items.value.at(-1)!])
    items.value.reverse()
    search.searchValue.value = 'entry'
    expect(search.filteredMenuItems.value[0]).toBe(items.value[1])
    items.value = [{ key: '/replacement', label: 'Replacement' }]
    await nextTick()
    expect(search.filteredMenuItems.value).toEqual([])
    search.searchValue.value = 'replacement'
    expect(search.filteredMenuItems.value[0]).toBe(items.value[0])
  })

  test('allows a reactive options source to replace menus, theme and callbacks', () => {
    const selected: string[] = []
    const options = ref<GlobalSearchOptions>({
      menuItems: () => [{ key: '/old', label: 'Old' }],
      onSelect: key => selected.push(`old:${key}`),
    })
    const search = mountSearch(() => options.value)
    search.searchValue.value = 'old'
    expect(search.filteredMenuItems.value).toHaveLength(1)
    options.value = {
      menuItems: () => [{ key: '/new', label: 'New' }],
      isDark: () => true,
      onSelect: key => selected.push(`new:${key}`),
    }
    search.searchValue.value = 'new'
    expect(search.isDark.value).toBe(true)
    search.handleEnter()
    expect(selected).toEqual(['new:/new'])
  })
})

describe('global search keyboard selection', () => {
  test('navigates all results without truncation and clamps when matches disappear', async () => {
    const selected: string[] = []
    const items = ref(
      Array.from({ length: 10_000 }, (_, index) => ({
        key: `/entry/${index}`,
        label: `Entry ${index}`,
      }))
    )
    const search = mountSearch({
      menuItems: () => items.value,
      onSelect: key => selected.push(key),
    })
    search.searchValue.value = 'entry'
    for (let index = 0; index < 10_050; index++) search.focusNext()
    expect(search.filteredMenuItems.value).toHaveLength(10_000)
    expect(search.selectedIndex.value).toBe(9_999)
    search.handleEnter()
    expect(selected).toEqual(['/entry/9999'])
    search.searchValue.value = 'missing'
    const next = keyEvent('ArrowDown')
    search.handleInputKeydown(next)
    expect(next.defaultPrevented).toBe(true)
    expect(search.selectedIndex.value).toBe(0)
    search.handleInputKeydown(keyEvent('Enter'))
    expect(selected).toHaveLength(1)
    expect(search.hasContent.value).toBe(true)
    search.searchValue.value = 'entry'
    await nextTick()
    for (let index = 0; index < 20; index++) search.focusNext()
    expect(search.selectedIndex.value).toBe(20)
    items.value = [items.value[0]]
    await nextTick()
    expect(search.selectedIndex.value).toBe(0)
  })

  test('preserves IME, modified and already-consumed events while preventing handled key defaults', async () => {
    const selected: string[] = []
    const search = mountSearch({
      menuItems: () => [
        { key: '/first', label: 'Result first' },
        { key: '/second', label: 'Result second' },
      ],
      onSelect: key => selected.push(key),
    })
    await search.openDialog()
    search.searchValue.value = 'result'
    search.handleCompositionStart()
    search.handleInputKeydown(keyEvent('ArrowDown'))
    search.handleInputKeydown(keyEvent('Enter'))
    search.handleDialogKeydown(keyEvent('Escape'))
    expect(search.selectedIndex.value).toBe(0)
    expect(search.showDialog.value).toBe(true)
    expect(selected).toEqual([])
    search.handleCompositionEnd()
    for (const event of [
      keyEvent('Enter', { isComposing: true }),
      keyEvent('Enter', { keyCode: 229 }),
      keyEvent('ArrowDown', { ctrlKey: true }),
      keyEvent('ArrowDown', { defaultPrevented: true }),
    ])
      search.handleInputKeydown(event)
    expect(search.selectedIndex.value).toBe(0)
    expect(selected).toEqual([])
    const down = keyEvent('ArrowDown')
    search.handleInputKeydown(down)
    expect(down.defaultPrevented).toBe(true)
    expect(search.selectedIndex.value).toBe(1)
    const enter = keyEvent('Enter')
    search.handleInputKeydown(enter)
    expect(enter.defaultPrevented).toBe(true)
    expect(selected).toEqual(['/second'])
    expect(search.showDialog.value).toBe(false)
  })
})
