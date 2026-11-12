import { afterEach, describe, expect, test, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { h, KeepAlive, nextTick, ref } from 'vue'
import { NInput, NTree } from 'naive-ui'
import C_Tree from '../../src/components/C_Tree/index.vue'
import type {
  TreeExpose,
  TreeSearchSource,
} from '../../src/components/C_Tree/types'
import {
  projectTreePaths,
  validateTreePaths,
} from '../../src/components/C_Tree/searchProjection'

interface Node {
  id: number
  name: string
  children?: Node[]
  isLeaf?: boolean
  disabled?: boolean
}
type Paths = readonly (readonly Node[])[]
const api = (wrapper: ReturnType<typeof mount>) =>
  wrapper.vm as unknown as TreeExpose<Node>
// 挂载工具擦除了业务泛型，仅在原生回调适配边界还原一次。
const nativeLoad = (wrapper: ReturnType<typeof mount>) =>
  wrapper.getComponent(NTree).props('onLoad') as (
    node: object
  ) => Promise<unknown>
const frames: Array<ReturnType<typeof mount>> = []
const deferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
const settle = async () => {
  await vi.advanceTimersByTimeAsync(1)
  await flushPromises()
  await nextTick()
}
const create = (
  source: TreeSearchSource<Node>,
  data: readonly Node[] = [{ id: 0, name: 'Root', isLeaf: false }]
) => {
  vi.useFakeTimers()
  const wrapper = mount(C_Tree<Node>, {
    props: {
      data,
      searchSource: source,
      addable: false,
      treeProps: { animated: false },
    },
  })
  frames.push(wrapper)
  return wrapper
}
const query = async (wrapper: ReturnType<typeof mount>, value: string) => {
  await wrapper.getComponent(NInput).get('input').setValue(value)
  await settle()
}
afterEach(() => {
  frames.splice(0).forEach(wrapper => wrapper.unmount())
  vi.useRealTimers()
})

describe('remote Tree paths and native state ownership', () => {
  test('successful search previews all matching ancestors once without selecting a business node', async () => {
    const root: Node = { id: 0, name: 'Root', isLeaf: false }
    const wrapper = create(
      {
        debounce: 0,
        request: async () => [
          [root, { id: 1, name: 'First' }],
          [root, { id: 2, name: 'Second' }],
        ],
      },
      [root]
    )
    await query(wrapper, 'match')
    expect(wrapper.getComponent(NTree).text()).toContain('First')
    expect(wrapper.getComponent(NTree).text()).toContain('Second')
    expect(api(wrapper).selectedKeys).toEqual([])
    expect(wrapper.emitted('node-select')).toBeUndefined()
    const previews = wrapper
      .emitted('update:expandedKeys')
      ?.filter(event => (event[2] as { action: string }).action === 'filter')
    expect(previews).toHaveLength(1)
    expect(previews?.[0][0]).toEqual([0])
    expect(api(wrapper).searchMatchIndex).toBe(-1)
    expect(wrapper.text()).toContain('找到 2 个结果')
  })

  test('locate of an already projected match retains its path after clearing the query', async () => {
    const wrapper = create({
      debounce: 0,
      request: async () => [
        [
          { id: 0, name: 'Root' },
          { id: 1, name: 'Only remote' },
        ],
      ],
    })
    await query(wrapper, 'remote')
    expect(await api(wrapper).locate(1)).toBe(true)
    await query(wrapper, '')
    expect(api(wrapper).selectedKeys).toEqual([1])
    expect(api(wrapper).getSelectedNode()?.name).toBe('Only remote')
  })

  test('a pending native source load cannot toggle closed an ancestor opened by search preview', async () => {
    const pending = deferred<readonly Node[]>()
    const root: Node = { id: 0, name: 'Root', isLeaf: false }
    const child: Node = { id: 1, name: 'Search result' }
    const wrapper = create(
      {
        debounce: 0,
        request: async () => [[root, child]],
        load: () => pending.promise,
      },
      [root]
    )
    await wrapper.get('.n-tree-node-switcher').trigger('click')
    await query(wrapper, 'result')
    expect(api(wrapper).expandedKeys).toEqual([0])
    pending.resolve([child])
    await settle()
    expect(api(wrapper).expandedKeys).toEqual([0])
    expect(wrapper.getComponent(NTree).text()).toContain('Search result')
  })

  test('legacy load deduplication uses the original node across search projection replacements', async () => {
    const pending = deferred<void>()
    const original: Node = { id: 0, name: 'Root', isLeaf: false }
    const onLoad = vi.fn(async (node: Node) => {
      await pending.promise
      node.children = [{ id: 1, name: 'Complete' }]
    })
    const wrapper = create(
      {
        debounce: 0,
        request: async () => [[original, { id: 1, name: 'Match' }]],
      },
      [original]
    )
    await wrapper.setProps({ treeProps: { animated: false, onLoad } })
    await query(wrapper, 'first')
    const native = wrapper.getComponent(NTree)
    const load = nativeLoad(wrapper)
    const first = load(native.props('data')![0])
    await query(wrapper, 'second')
    const second = load(native.props('data')![0])
    expect(onLoad).toHaveBeenCalledExactlyOnceWith(original)
    pending.resolve()
    await first
    expect(await second).toBe(false)
    expect(original.children).toHaveLength(1)
  })

  test.each(['collapse all', 'collapse node'])(
    'source child loads may cache results but cannot re-expand after %s',
    async action => {
      const pending = deferred<readonly Node[]>()
      const root: Node = { id: 0, name: 'Root', isLeaf: false }
      const wrapper = create(
        { request: async () => [], load: () => pending.promise },
        [root]
      )
      const native = wrapper.getComponent(NTree)
      const loading = nativeLoad(wrapper)(root)
      await wrapper.get('.n-tree-node-switcher').trigger('click')
      await flushPromises()
      if (action === 'collapse all') api(wrapper).collapseAll()
      else
        native.vm.$emit('update:expandedKeys', [], [], {
          node: root,
          action: 'collapse',
        })
      pending.resolve([{ id: 1, name: 'Loaded child' }])
      expect(await loading).toBe(false)
      await settle()
      expect(api(wrapper).expandedKeys).toEqual([])
      expect(native.text()).not.toContain('Loaded child')
      expect(native.props('data')![0].children).toHaveLength(1)
    }
  )

  test('collapsing one node does not invalidate an unrelated sibling load', async () => {
    const first = deferred<readonly Node[]>()
    const second = deferred<readonly Node[]>()
    const roots: Node[] = [
      { id: 0, name: 'First', isLeaf: false },
      { id: 5, name: 'Second', isLeaf: false },
    ]
    const wrapper = create(
      {
        request: async () => [],
        load: node => (node.id === 0 ? first.promise : second.promise),
      },
      roots
    )
    const native = wrapper.getComponent(NTree)
    const load = nativeLoad(wrapper)
    const loadingFirst = load(roots[0])
    const loadingSecond = load(roots[1])
    await flushPromises()
    native.vm.$emit('update:expandedKeys', [], [], {
      node: roots[0],
      action: 'collapse',
    })
    first.resolve([{ id: 1, name: 'First child' }])
    second.resolve([{ id: 6, name: 'Second child' }])
    expect(await loadingFirst).toBe(false)
    expect(await loadingSecond).toBe(true)
  })

  test('an externally controlled collapse invalidates its pending child expansion', async () => {
    const pending = deferred<readonly Node[]>()
    const root: Node = { id: 0, name: 'Root', isLeaf: false }
    const wrapper = create(
      { request: async () => [], load: () => pending.promise },
      [root]
    )
    await wrapper.setProps({ expandedKeys: [0] })
    const loading = nativeLoad(wrapper)(root)
    await flushPromises()
    await wrapper.setProps({ expandedKeys: [] })
    pending.resolve([{ id: 1, name: 'Child' }])
    expect(await loading).toBe(false)
    expect(api(wrapper).expandedKeys).toEqual([])
  })

  test('search merges immutable paths, navigates numeric zero and never locally re-filters server matches', async () => {
    const data = Object.freeze([
      Object.freeze({ id: 0, name: 'Root', isLeaf: false }),
    ])
    const wrapper = create(
      {
        debounce: 0,
        request: async () => [
          [data[0], { id: 2, name: 'Server alias match' }],
          [data[0], { id: 3, name: 'Other match' }],
        ],
      },
      data
    )
    await query(wrapper, 'alias')
    expect(api(wrapper).searchMatchCount).toBe(2)
    expect(wrapper.getComponent(NTree).props('pattern')).toBe('')
    expect(data).toEqual([{ id: 0, name: 'Root', isLeaf: false }])
    expect(await api(wrapper).nextMatch()).toBe(true)
    expect(api(wrapper).selectedKeys).toEqual([2])
    expect(api(wrapper).expandedKeys).toEqual([0])
    expect(await api(wrapper).previousMatch()).toBe(true)
    expect(api(wrapper).selectedKeys).toEqual([3])
    await api(wrapper).locate(0)
    expect(api(wrapper).selectedKeys).toEqual([0])
    await query(wrapper, '')
    expect(api(wrapper).searchMatchCount).toBe(0)
    expect(api(wrapper).getSelectedNode()?.id).toBe(0)
  })

  test('query replacement, clear and minChars cancel requests even when transport ignores AbortSignal', async () => {
    const first = deferred<Paths>()
    const second = deferred<Paths>()
    const request = vi.fn(({ search }: { search: string }) =>
      search === 'old' ? first.promise : second.promise
    )
    const wrapper = create({ debounce: 0, minChars: 2, request })
    await query(wrapper, 'old')
    await query(wrapper, 'new')
    second.resolve([
      [
        { id: 0, name: 'Root' },
        { id: 2, name: 'New' },
      ],
    ])
    await settle()
    first.resolve([
      [
        { id: 0, name: 'Root' },
        { id: 1, name: 'Old' },
      ],
    ])
    await settle()
    await api(wrapper).nextMatch()
    expect(api(wrapper).selectedKeys).toEqual([2])
    await query(wrapper, 'x')
    expect(request).toHaveBeenCalledTimes(2)
    expect(api(wrapper).searchMatchCount).toBe(0)
  })

  test('failed queries retain original data and retry only the current query', async () => {
    const failure = new Error('offline')
    const request = vi
      .fn()
      .mockRejectedValueOnce(failure)
      .mockResolvedValue([[{ id: 0, name: 'Root' }]])
    const wrapper = create({ debounce: 0, request })
    await query(wrapper, 'root')
    expect(api(wrapper).searchError).toBe(failure)
    expect(wrapper.emitted('search-error')).toEqual([[failure]])
    await api(wrapper).retrySearch()
    expect(api(wrapper).searchError).toBeNull()
    expect(api(wrapper).searchMatchCount).toBe(1)
    expect(request).toHaveBeenCalledTimes(2)
  })

  test('source scope changes invalidate matches, overlays and stale resolution', async () => {
    const pending = deferred<readonly Node[] | null>()
    const source: TreeSearchSource<Node> = {
      debounce: 0,
      scope: 'one',
      request: async () => [
        [
          { id: 0, name: 'Root' },
          { id: 1, name: 'Old tenant' },
        ],
      ],
      resolve: () => pending.promise,
    }
    const wrapper = create(source)
    await query(wrapper, 'old')
    const locating = api(wrapper).locate(9)
    await wrapper.setProps({
      searchSource: { ...source, scope: 'two', request: async () => [] },
    })
    pending.resolve([
      { id: 0, name: 'Root' },
      { id: 9, name: 'Late tenant' },
    ])
    expect(await locating).toBe(false)
    await settle()
    expect(api(wrapper).searchMatchCount).toBe(0)
    expect(api(wrapper).getSelectedNode()).toBeNull()
    expect(wrapper.getComponent(NTree).text()).not.toContain('Old tenant')
  })

  test('controlled keys are emitted without taking ownership and disabled nodes are only positioned', async () => {
    const wrapper = create({
      debounce: 0,
      request: async () => [
        [
          { id: 0, name: 'Root' },
          { id: 1, name: 'Child' },
        ],
      ],
    })
    await wrapper.setProps({ selectedKeys: [], expandedKeys: [] })
    await query(wrapper, 'child')
    await api(wrapper).nextMatch()
    expect(wrapper.emitted('update:selectedKeys')?.at(-1)?.[0]).toEqual([1])
    expect(api(wrapper).selectedKeys).toEqual([])
    expect(api(wrapper).expandedKeys).toEqual([])
    const second = create({
      request: async () => [],
      resolve: async () => [
        { id: 0, name: 'Root' },
        { id: 4, name: 'Disabled', disabled: true },
      ],
    })
    expect(await api(second).locate(4)).toBe(true)
    expect(api(second).selectedKeys).toEqual([])
  })

  test('search paths stay partial until explicit source load returns complete children', async () => {
    const load = vi.fn(async () => [
      { id: 1, name: 'Matched child' },
      { id: 2, name: 'Other child' },
    ])
    const wrapper = create({
      debounce: 0,
      request: async () => [
        [
          { id: 0, name: 'Root' },
          { id: 1, name: 'Matched child' },
        ],
      ],
      load,
    })
    await query(wrapper, 'match')
    await api(wrapper).nextMatch()
    expect(load).not.toHaveBeenCalled()
    const tree = wrapper.getComponent(NTree)
    const root = tree.props('data')![0]
    tree.vm.$emit('update:expandedKeys', [], [], {
      node: root,
      action: 'collapse',
    })
    tree.vm.$emit('update:expandedKeys', [0], [root], {
      node: root,
      action: 'expand',
    })
    await settle()
    expect(load).toHaveBeenCalledTimes(1)
    expect(tree.text()).toContain('Other child')
    tree.vm.$emit('update:expandedKeys', [], [], {
      node: root,
      action: 'collapse',
    })
    tree.vm.$emit('update:expandedKeys', [0], [root], {
      node: root,
      action: 'expand',
    })
    await settle()
    expect(load).toHaveBeenCalledTimes(1)
  })

  test('partial paths can reuse the existing native onLoad mutation contract', async () => {
    const onLoad = vi.fn(async (node: Node) => {
      node.children = [
        { id: 1, name: 'Match' },
        { id: 2, name: 'Complete sibling' },
      ]
    })
    const wrapper = create({
      debounce: 0,
      request: async () => [
        [
          { id: 0, name: 'Root' },
          { id: 1, name: 'Match' },
        ],
      ],
    })
    await wrapper.setProps({ treeProps: { animated: false, onLoad } })
    await query(wrapper, 'match')
    const tree = wrapper.getComponent(NTree)
    const root = tree.props('data')![0]
    tree.vm.$emit('update:expandedKeys', [0], [root], {
      node: root,
      action: 'expand',
    })
    await settle()
    expect(onLoad).toHaveBeenCalledTimes(1)
    expect(tree.text()).toContain('Complete sibling')
  })

  test('unmount aborts in-flight requests and prevents late errors from emitting', async () => {
    const pending = deferred<Paths>()
    let signal: AbortSignal | undefined
    const wrapper = create({
      debounce: 0,
      request: ({ signal: requestSignal }) => {
        signal = requestSignal
        return pending.promise
      },
    })
    await query(wrapper, 'test')
    wrapper.unmount()
    expect(signal?.aborted).toBe(true)
    pending.reject(new Error('late'))
    await settle()
    expect(wrapper.emitted('search-error')).toBeUndefined()
  })

  test('custom fields preserve application shapes and native attribute precedence', async () => {
    interface Custom {
      code: number
      title: string
      items?: Custom[]
    }
    vi.useFakeTimers()
    const data: Custom[] = [{ code: 0, title: 'Root' }]
    const wrapper = mount(C_Tree<Custom>, {
      props: {
        data,
        keyField: 'code',
        labelField: 'title',
        childrenField: 'items',
        checkable: false,
        treeProps: { checkable: true, animated: false },
        searchSource: {
          debounce: 0,
          request: async () => [[data[0], { code: 2, title: 'Child' }]],
        },
      },
    })
    frames.push(wrapper)
    await query(wrapper, 'child')
    expect(wrapper.getComponent(NTree).props('checkable')).toBe(false)
    await wrapper.setProps({ checkable: undefined })
    expect(wrapper.getComponent(NTree).props('checkable')).toBe(true)
    expect(wrapper.getComponent(NTree).props('data')![0].items).toHaveLength(1)
    expect(data[0].items).toBeUndefined()
  })

  test('KeepAlive pauses remote work and restarts the current query on activation', async () => {
    vi.useFakeTimers()
    const visible = ref(true)
    const pending = deferred<Paths>()
    let signal: AbortSignal | undefined
    const request = vi.fn(context => {
      signal = context.signal as AbortSignal
      return pending.promise
    })
    const wrapper = mount({
      setup: () => () =>
        h(
          KeepAlive,
          {},
          {
            default: () =>
              visible.value
                ? h(C_Tree<Node>, {
                    data: [{ id: 0, name: 'Root' }],
                    searchPattern: 'test',
                    searchSource: { debounce: 0, request },
                  })
                : null,
          }
        ),
    })
    frames.push(wrapper)
    await settle()
    visible.value = false
    await nextTick()
    expect(signal?.aborted).toBe(true)
    pending.resolve([
      [
        { id: 0, name: 'Root' },
        { id: 1, name: 'Late' },
      ],
    ])
    await settle()
    visible.value = true
    await settle()
    expect(request).toHaveBeenCalledTimes(2)
  })
})

describe('remote path validation', () => {
  test.each([
    {
      paths: [
        [
          { id: 0, name: 'A' },
          { id: 0, name: 'Cycle' },
        ],
      ],
    },
    { paths: [[{ id: 0, name: 'A' }], [{ id: 0, name: 'Again' }]] },
    {
      paths: [
        [
          { id: 0, name: 'A' },
          { id: 2, name: 'C' },
        ],
        [
          { id: 1, name: 'B' },
          { id: 2, name: 'Conflict' },
        ],
      ],
    },
  ])(
    'rejects cyclic, duplicate or conflicting paths atomically',
    ({ paths }) => {
      expect(() => validateTreePaths(paths, 'id', 100)).toThrow(TypeError)
    }
  )
  test('rejects a path that reparents an existing node without mutating caller data', () => {
    const data: Node[] = [
      { id: 0, name: 'A', children: [{ id: 1, name: 'B' }] },
    ]
    const before = JSON.stringify(data)
    expect(() =>
      projectTreePaths(
        data,
        [
          [
            { id: 2, name: 'C' },
            { id: 1, name: 'B' },
          ],
        ],
        new Map(),
        { key: 'id', children: 'children' }
      )
    ).toThrow(TypeError)
    expect(JSON.stringify(data)).toBe(before)
  })
})
