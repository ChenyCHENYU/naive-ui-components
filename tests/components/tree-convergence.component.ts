import { describe, expect, test, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { h, isRef, reactive, toRaw } from 'vue'
import { NConfigProvider, NTree, NInput, darkTheme } from 'naive-ui'
import C_Tree from '../../src/components/C_Tree/index.vue'
import type {
  TreeExpose,
  TreeNodeData,
} from '../../src/components/C_Tree/types'

const nodes = (): TreeNodeData[] => [
  {
    id: 0,
    name: 'Root',
    children: [
      { id: 1, name: 'First' },
      { id: 2, name: 'Disabled', disabled: true },
    ],
  },
]
const api = (wrapper: ReturnType<typeof mount>) =>
  wrapper.vm as unknown as TreeExpose

describe('C_Tree state and native capability contracts', () => {
  test('controlled empty search stays empty and external changes update the input', async () => {
    const wrapper = mount(C_Tree, {
      props: { data: nodes(), searchPattern: '' },
    })
    expect(
      wrapper.getComponent(NInput).get('input').attributes('aria-label')
    ).toBe('搜索树节点')
    await wrapper.getComponent(NInput).get('input').setValue('First')
    expect(wrapper.emitted('update:searchPattern')).toEqual([['First']])
    expect(wrapper.getComponent(NTree).props('pattern')).toBe('')
    await wrapper.setProps({ searchPattern: 'Root' })
    expect(wrapper.getComponent(NInput).props('value')).toBe('Root')
    expect(wrapper.getComponent(NTree).props('pattern')).toBe('Root')
    await wrapper.setProps({ searchPattern: '' })
    expect(wrapper.getComponent(NInput).props('value')).toBe('')
  })

  test('uncontrolled search filters through NTree without mutating data', async () => {
    const source = nodes()
    const before = JSON.stringify(source)
    const wrapper = mount(C_Tree, {
      props: {
        data: source,
        treeProps: { showIrrelevantNodes: false, animated: false },
      },
    })
    await wrapper.getComponent(NInput).get('input').setValue('First')
    await flushPromises()
    expect(wrapper.getComponent(NTree).text()).toContain('First')
    expect(wrapper.getComponent(NTree).text()).not.toContain('Disabled')
    expect(JSON.stringify(source)).toBe(before)
    await wrapper.getComponent(NInput).get('input').setValue('')
    await flushPromises()
    expect(wrapper.getComponent(NTree).props('pattern')).toBe('')
  })

  test('native selection supplies full metadata once and controlled values remain authoritative', async () => {
    const listener = vi.fn()
    const wrapper = mount(C_Tree, {
      props: {
        data: nodes(),
        selectedKeys: [],
        treeProps: { onUpdateSelectedKeys: listener },
      },
    })
    await wrapper.get('.c-tree-node-title').trigger('click')
    await flushPromises()
    const event = wrapper.emitted('update:selectedKeys')![0]
    expect(event[0]).toEqual([0])
    expect((event[1] as TreeNodeData[])[0].id).toBe(0)
    expect(event[2]).toMatchObject({ action: 'select', node: { id: 0 } })
    expect(listener).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('node-select')).toHaveLength(1)
    expect(wrapper.getComponent(NTree).props('selectedKeys')).toEqual([])
    await wrapper.setProps({ selectedKeys: [0] })
    expect(api(wrapper).getSelectedNode()?.id).toBe(0)
    api(wrapper).clearSelection()
    expect(wrapper.emitted('update:selectedKeys')!.at(-1)![0]).toEqual([])
    expect(wrapper.getComponent(NTree).props('selectedKeys')).toEqual([0])
  })

  test('native checkbox cascade and disabled semantics remain unchanged', async () => {
    const listener = vi.fn()
    const wrapper = mount(C_Tree, {
      props: {
        data: nodes(),
        defaultExpandAll: true,
        treeProps: {
          checkable: true,
          cascade: true,
          checkStrategy: 'child',
          animated: false,
          onUpdateCheckedKeys: listener,
        },
      },
    })
    await flushPromises()
    await wrapper.findAll('.n-checkbox')[0].trigger('click')
    await flushPromises()
    expect(wrapper.emitted('update:checkedKeys')![0][0]).toEqual([1])
    expect(listener).toHaveBeenCalledTimes(1)
    expect(new Set(api(wrapper).getCheckedData().keys)).toEqual(new Set([0, 1]))
    expect(wrapper.findAll('.n-checkbox').at(-1)!.classes()).toContain(
      'n-checkbox--disabled'
    )
    await wrapper.findAll('.n-checkbox').at(-1)!.trigger('click')
    expect(wrapper.emitted('update:checkedKeys')).toHaveLength(1)
    api(wrapper).clearChecked()
    await flushPromises()
    expect(api(wrapper).getCheckedData().keys).toEqual([])
    api(wrapper).setCheckedKeys([1])
    await flushPromises()
    expect(new Set(api(wrapper).getCheckedData().keys)).toEqual(new Set([0, 1]))
  })

  test('custom identity fields, immutable input and external data replacement retain keys', async () => {
    const data = [
      {
        uuid: 'a',
        title: 'Group',
        nodes: [{ uuid: 'b', title: 'Member', inactive: true }],
      },
    ]
    Object.freeze(data[0].nodes[0])
    Object.freeze(data[0].nodes)
    Object.freeze(data[0])
    Object.freeze(data)
    const wrapper = mount(C_Tree, {
      props: {
        data,
        defaultExpandAll: true,
        treeProps: {
          keyField: 'uuid',
          labelField: 'title',
          childrenField: 'nodes',
          disabledField: 'inactive',
          checkable: true,
          animated: false,
        },
      },
    })
    expect(wrapper.getComponent(NTree).props('expandedKeys')).toEqual(['a'])
    api(wrapper).selectNode('a')
    await flushPromises()
    expect(api(wrapper).getSelectedNode()).toEqual(data[0])
    await wrapper.setProps({ data: [{ uuid: 'a', title: 'Updated' }] })
    expect(api(wrapper).getSelectedNode()?.title).toBe('Updated')
    expect(wrapper.getComponent(NTree).props('selectedKeys')).toEqual(['a'])
  })

  test('ordinary business interfaces with custom fields need no index signature or data conversion', async () => {
    interface BusinessNode {
      code: string
      title: string
      items?: BusinessNode[]
    }
    const source: BusinessNode[] = [
      { code: 'a', title: 'Business', items: [{ code: 'b', title: 'Child' }] },
    ]
    const wrapper = mount(C_Tree, {
      props: {
        data: source,
        defaultExpandAll: true,
        treeProps: {
          keyField: 'code',
          labelField: 'title',
          childrenField: 'items',
          animated: false,
        },
      },
    })
    expect(toRaw(wrapper.getComponent(NTree).props('data'))).toBe(source)
    await wrapper.findAll('.c-tree-node-title')[1].trigger('click')
    expect(wrapper.emitted('update:selectedKeys')![0][0]).toEqual(['b'])
    expect(toRaw(wrapper.emitted('node-select')![0][0])).toBe(
      source[0].items![0]
    )
  })

  test('mode defaults work while explicit false and empty actions override them', async () => {
    const wrapper = mount(C_Tree, { props: { data: nodes(), mode: 'menu' } })
    expect(wrapper.getComponent(NTree).props('draggable')).toBe(true)
    expect(wrapper.findAll('.tree-actions button')).toHaveLength(3)
    await wrapper.setProps({ draggable: false, showLine: false, actions: [] })
    expect(wrapper.getComponent(NTree).props('draggable')).toBe(false)
    expect(wrapper.getComponent(NTree).props('showLine')).toBe(false)
    expect(wrapper.find('.tree-actions').exists()).toBe(false)
  })

  test('slots override native renderers and nodeProps reach native nodes', async () => {
    const render = vi.fn(() => h('b', 'native label'))
    const wrapper = mount(C_Tree, {
      props: {
        data: nodes(),
        treeProps: {
          renderLabel: render,
          nodeProps: ({ option }) => ({ 'data-node-id': option.id }),
        },
      },
      slots: {
        label: ({ option }) => h('strong', `slot ${option.name}`),
        prefix: () => h('i', 'prefix'),
        suffix: () => h('i', 'suffix'),
      },
    })
    expect(wrapper.get('strong').text()).toBe('slot Root')
    expect(wrapper.find('[data-node-id="0"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('prefix')
    expect(wrapper.text()).toContain('suffix')
    expect(render).not.toHaveBeenCalled()
    const nativeWrapper = mount(C_Tree, {
      props: { data: nodes(), treeProps: { renderLabel: render } },
    })
    expect(nativeWrapper.get('b').text()).toBe('native label')
  })

  test('empty slot and density respect theme and virtual node height', async () => {
    const wrapper = mount(NConfigProvider, {
      props: { theme: darkTheme },
      slots: {
        default: () =>
          h(
            C_Tree,
            {
              data: [],
              density: 'compact',
              treeProps: { virtualScroll: true },
              style: { height: '240px' },
            },
            { empty: () => h('p', 'No records') }
          ),
      },
    })
    expect(wrapper.text()).toContain('No records')
    const tree = wrapper.getComponent(C_Tree)
    expect(tree.classes()).toContain('c-tree--compact')
    expect(tree.getComponent(NTree).props('themeOverrides')).toMatchObject({
      nodeHeight: '28px',
      nodeWrapperPadding: '0',
    })
    expect(tree.attributes('style')).toContain('--c-tree-border')
    expect(tree.getComponent(NInput).props('size')).toBe('small')
  })

  test('virtual mode shows the official empty slot for zero search matches and restores virtualization', async () => {
    const wrapper = mount(C_Tree, {
      props: {
        data: nodes(),
        treeProps: {
          virtualScroll: true,
          showIrrelevantNodes: false,
          animated: false,
        },
      },
      slots: { empty: () => h('p', 'Nothing matched') },
    })
    expect(wrapper.getComponent(NTree).props('virtualScroll')).toBe(true)
    await wrapper.getComponent(NInput).get('input').setValue('missing')
    await flushPromises()
    expect(wrapper.text()).toContain('Nothing matched')
    expect(wrapper.getComponent(NTree).props('virtualScroll')).toBe(false)
    await wrapper.getComponent(NInput).get('input').setValue('')
    await flushPromises()
    expect(wrapper.getComponent(NTree).props('virtualScroll')).toBe(true)
    await wrapper.setProps({
      treeProps: {
        virtualScroll: true,
        showIrrelevantNodes: false,
        animated: false,
        filter: (pattern, node) => pattern === 'UPPER' && node.id === 1,
      },
    })
    await wrapper.getComponent(NInput).get('input').setValue('upper')
    await flushPromises()
    expect(wrapper.text()).toContain('Nothing matched')
    await wrapper.getComponent(NInput).get('input').setValue('UPPER')
    await flushPromises()
    expect(wrapper.getComponent(NTree).props('virtualScroll')).toBe(true)
    expect(wrapper.text()).not.toContain('Nothing matched')
  })

  test('expand and collapse commands emit updates and include newly loaded parents until collapsed', async () => {
    const nativeUpdate = vi.fn()
    const wrapper = mount(C_Tree, {
      props: {
        data: nodes(),
        defaultExpandAll: true,
        treeProps: { animated: false, onUpdateExpandedKeys: nativeUpdate },
      },
    })
    api(wrapper).collapseAll()
    await flushPromises()
    expect(wrapper.emitted('update:expandedKeys')).toEqual([
      [[], [], { node: null, action: 'collapse' }],
    ])
    expect(nativeUpdate).toHaveBeenCalledExactlyOnceWith([], [], {
      node: null,
      action: 'collapse',
    })
    await wrapper.setProps({
      data: [
        ...nodes(),
        { id: 3, name: 'New parent', children: [{ id: 4, name: 'Child' }] },
      ],
    })
    expect(wrapper.getComponent(NTree).props('expandedKeys')).toEqual([])
    api(wrapper).expandAll()
    await flushPromises()
    expect(wrapper.getComponent(NTree).props('expandedKeys')).toEqual([0, 3])
    await wrapper.setProps({
      data: [
        ...nodes(),
        {
          id: 3,
          name: 'New parent',
          children: [
            { id: 4, name: 'Child', children: [{ id: 5, name: 'Last' }] },
          ],
        },
      ],
    })
    expect(wrapper.getComponent(NTree).props('expandedKeys')).toEqual([0, 3, 4])
  })

  test('lazy load is native, fails visibly to the caller and retries without bulk-loading all nodes', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const failure = new Error('offline')
    let calls = 0
    const onLoad = vi.fn(async (node: TreeNodeData) => {
      calls++
      if (calls === 1) throw failure
      node.children = [{ id: 1, name: 'Loaded' }]
    })
    const source = reactive<TreeNodeData[]>([
      { id: 0, name: 'Lazy', isLeaf: false },
    ])
    const wrapper = mount(C_Tree, {
      props: { data: source, treeProps: { onLoad, animated: false } },
    })
    api(wrapper).expandAll()
    await flushPromises()
    expect(onLoad).not.toHaveBeenCalled()
    await wrapper.get('.n-tree-node-switcher').trigger('click')
    await flushPromises()
    expect(onLoad).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('load-error')![0][0]).toBe(failure)
    // Native retry: collapse the failed branch, then expand it again.
    await wrapper.get('.n-tree-node-switcher').trigger('click')
    await wrapper.get('.n-tree-node-switcher').trigger('click')
    await flushPromises()
    expect(onLoad).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('Loaded')
  })

  test('mounted native loading preserves a current sibling failure across immutable root replacement', async () => {
    const source: TreeNodeData[] = [
      { id: 'a', name: 'Branch A' },
      { id: 'b', name: 'Branch B' },
    ]
    const failure = new Error('B failed')
    let resolveA!: () => void
    let rejectB!: (error: Error) => void
    const onLoad = vi.fn((node: TreeNodeData) =>
      node.id === 'a'
        ? new Promise<void>(resolve => {
            resolveA = resolve
          })
        : new Promise<void>((_resolve, reject) => {
            rejectB = reject
          })
    )
    const wrapper = mount(C_Tree, {
      props: { data: source, treeProps: { onLoad, animated: false } },
    })
    const nativeLoad = wrapper.getComponent(NTree).props('onLoad')!
    const pendingA = nativeLoad(source[0])
    const pendingB = nativeLoad(source[1])
    // A commits a new root, while B's node still belongs to the current tree.
    resolveA()
    await pendingA
    await wrapper.setProps({
      data: [
        { ...source[0], children: [{ id: 'a-child', name: 'Loaded A' }] },
        source[1],
      ],
    })
    rejectB(failure)
    await expect(pendingB).resolves.toBe(false)
    expect(wrapper.emitted('load-error')).toEqual([[failure, source[1]]])
    // An actual replacement with the same key is a different request scope.
    const staleB = nativeLoad(source[1])
    await wrapper.setProps({ data: [{ id: 'b', name: 'New B' }] })
    rejectB(new Error('obsolete B failed'))
    await expect(staleB).resolves.toBe(false)
    expect(wrapper.emitted('load-error')).toHaveLength(1)
  })

  test('pending native load is deduplicated and late failure after replacement or unmount emits nothing', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    let reject!: (reason: Error) => void
    const onLoad = vi.fn(
      () =>
        new Promise((_resolve, rejectPromise) => {
          reject = rejectPromise
        })
    )
    const wrapper = mount(C_Tree, {
      props: {
        data: [{ id: 0, name: 'Old', isLeaf: false }],
        treeProps: { onLoad, animated: false },
      },
    })
    await wrapper.get('.n-tree-node-switcher').trigger('click')
    await wrapper.get('.n-tree-node-switcher').trigger('click')
    expect(onLoad).toHaveBeenCalledTimes(1)
    await wrapper.setProps({ data: [{ id: 10, name: 'Replacement' }] })
    reject(new Error('stale'))
    await flushPromises()
    expect(wrapper.emitted('load-error')).toBeUndefined()
    expect(wrapper.getComponent(NTree).props('expandedKeys')).toEqual([])
    expect(wrapper.text()).toContain('Replacement')
    const second = mount(C_Tree, {
      props: {
        data: [{ id: 1, name: 'Unmounted', isLeaf: false }],
        treeProps: { onLoad },
      },
    })
    await second.get('.n-tree-node-switcher').trigger('click')
    second.unmount()
    reject(new Error('disposed'))
    await flushPromises()
    expect(second.emitted('load-error')).toBeUndefined()
  })
})

test('tree public state is unwrapped and stays current after instance operations', async () => {
  const wrapper = mount(C_Tree, {
    props: {
      data: nodes(),
      defaultSelectedKeys: [1],
      defaultExpandedKeys: [0],
      defaultCheckedKeys: [1],
      treeProps: { checkable: true },
    },
  })
  const tree = api(wrapper)
  expect(isRef(tree.selectedKeys)).toBe(false)
  expect(tree.selectedKeys).toEqual([1])
  expect(tree.expandedKeys).toEqual([0])
  expect(tree.checkedKeys).toEqual([1])
  tree.clearSelection()
  tree.collapseAll()
  tree.clearChecked()
  await flushPromises()
  expect(tree.selectedKeys).toEqual([])
  expect(tree.expandedKeys).toEqual([])
  expect(tree.checkedKeys).toEqual([])
  tree.selectNode(1)
  tree.expandAll()
  tree.setCheckedKeys([1])
  await flushPromises()
  expect(tree.selectedKeys).toEqual([1])
  expect(tree.expandedKeys).toEqual([0])
  expect(tree.checkedKeys).toEqual([1])
})
