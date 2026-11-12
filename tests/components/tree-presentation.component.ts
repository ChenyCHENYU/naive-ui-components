import { describe, expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { h, nextTick, reactive, ref } from 'vue'
import { NButton, NInput, NPopconfirm, NTree } from 'naive-ui'
import C_Tree from '../../src/components/C_Tree/index.vue'
import C_Icon from '../../src/components/C_Icon/index.vue'
import type {
  TreeNodeRenderContext,
  TreeProps,
} from '../../src/components/C_Tree/types'

interface Department {
  code: number
  title: string
  category?: string
  symbol?: string
  isLeaf?: boolean
  inactive?: boolean
  items?: Department[]
}
const roots: readonly Department[] = Object.freeze([
  Object.freeze({
    code: 0,
    title: 'Company',
    category: 'department',
    isLeaf: false,
  }),
])
const fields = { keyField: 'code', labelField: 'title', childrenField: 'items' }
const defer = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
const stateNode = (context: TreeNodeRenderContext<Department>, part: string) =>
  h(
    'span',
    {
      'data-part': part,
      'data-key': context.option.code,
      'data-expanded': String(context.expanded),
      'data-leaf': String(context.isLeaf),
      'data-loading': String(context.loading),
      'data-selected': String(context.selected),
      'data-checked': String(context.checked),
    },
    context.option.title
  )

describe('Tree node presentation and action contracts', () => {
  test('all node slots receive controlled key zero and custom child-field state without changing defaults', async () => {
    const data: Department[] = [
      { ...roots[0], items: [{ code: 1, title: 'Member' }] },
    ]
    const wrapper = mount(C_Tree<Department>, {
      props: {
        data,
        ...fields,
        expandedKeys: [],
        selectedKeys: [0],
        checkedKeys: [0],
        checkable: true,
      },
      slots: {
        prefix: context => stateNode(context, 'prefix'),
        label: context => stateNode(context, 'label'),
        suffix: context => stateNode(context, 'suffix'),
      },
    })
    for (const part of ['prefix', 'label', 'suffix']) {
      expect(
        wrapper.get(`[data-part="${part}"][data-key="0"]`).attributes()
      ).toMatchObject({
        'data-expanded': 'false',
        'data-selected': 'true',
        'data-checked': 'true',
        'data-leaf': 'false',
        'data-loading': 'false',
      })
    }
    await wrapper.setProps({
      expandedKeys: [0],
      selectedKeys: [],
      checkedKeys: [],
    })
    expect(
      wrapper
        .get('[data-part="prefix"][data-key="0"]')
        .attributes('data-expanded')
    ).toBe('true')
    expect(
      wrapper.get('[data-part="label"][data-key="1"]').attributes('data-leaf')
    ).toBe('true')
    expect(
      wrapper.getComponent(NTree).props('themeOverrides')?.nodeHeight
    ).toBe('34px')
    await wrapper.setProps({ expandedKeys: [] })
    expect(
      wrapper
        .get('[data-part="suffix"][data-key="0"]')
        .attributes('data-expanded')
    ).toBe('false')
  })

  test('native renderers receive the enriched state and explicit leaf flags match native semantics', () => {
    const renderPrefix = vi.fn((context: TreeNodeRenderContext<Department>) =>
      stateNode(context, 'prefix')
    )
    const renderLabel = vi.fn((context: TreeNodeRenderContext<Department>) =>
      stateNode(context, 'label')
    )
    const renderSuffix = vi.fn((context: TreeNodeRenderContext<Department>) =>
      stateNode(context, 'suffix')
    )
    const wrapper = mount(C_Tree<Department>, {
      props: {
        data: [
          { code: 0, title: 'Empty branch', items: [] },
          { code: 1, title: 'Explicit leaf', isLeaf: true },
        ],
        ...fields,
        treeProps: { renderPrefix, renderLabel, renderSuffix },
      },
    })
    for (const render of [renderPrefix, renderLabel, renderSuffix]) {
      expect(render).toHaveBeenCalledWith(
        expect.objectContaining({
          expanded: false,
          loading: false,
          checked: false,
          selected: false,
        })
      )
    }
    expect(
      wrapper.get('[data-part="label"][data-key="0"]').attributes('data-leaf')
    ).toBe('false')
    expect(
      wrapper.get('[data-part="label"][data-key="1"]').attributes('data-leaf')
    ).toBe('true')
  })

  test('native node prefix/suffix remain no-argument fallbacks before icon resolver and preset actions', async () => {
    const prefix = vi.fn(() => h('i', 'Node prefix'))
    const suffix = vi.fn(() => h('i', 'Node suffix'))
    const resolve = vi.fn(() => 'mdi:star')
    const data = [{ id: 0, name: 'Native node', prefix, suffix }]
    const wrapper = mount(C_Tree, {
      props: { data, mode: 'org', iconConfig: { resolve } },
    })
    expect(wrapper.text()).toContain('Node prefix')
    expect(wrapper.text()).toContain('Node suffix')
    expect(prefix).toHaveBeenCalledWith()
    expect(suffix).toHaveBeenCalledWith()
    expect(resolve).not.toHaveBeenCalled()
    expect(wrapper.find('.tree-actions').exists()).toBe(false)
    await wrapper.setProps({
      treeProps: {
        renderPrefix: () => h('b', 'Renderer prefix'),
        renderSuffix: () => h('b', 'Renderer suffix'),
      },
    })
    expect(wrapper.text()).toContain('Renderer prefix')
    expect(wrapper.text()).not.toContain('Node prefix')
    expect(wrapper.text()).toContain('Renderer suffix')
  })

  test('org icons use configurable type/icon fields and retain field > map > default precedence', async () => {
    const data: Department[] = [
      { code: 0, title: 'Department', category: 'department' },
      { code: 1, title: 'User', category: 'user' },
      { code: 2, title: 'Manager', category: 'manager' },
      { code: 3, title: 'Custom', category: 'user', symbol: 'mdi:star' },
      { code: 4, title: 'Other', category: 'unknown' },
    ]
    const wrapper = mount(C_Tree<Department>, {
      props: {
        data,
        ...fields,
        mode: 'org',
        typeField: 'category',
        iconField: 'symbol',
        actions: [],
        iconConfig: { resolve: () => undefined },
      },
    })
    const icons = () =>
      wrapper
        .findAllComponents(C_Icon)
        .filter(icon => icon.classes().includes('c-tree-node-icon'))
    expect(icons().map(icon => icon.props('name'))).toEqual([
      'mdi:domain',
      'mdi:account',
      'mdi:account-tie',
      'mdi:star',
      'mdi:circle-outline',
    ])
    await wrapper.setProps({
      iconConfig: {
        default: 'mdi:help',
        typeMap: { user: 'mdi:account-group' },
        colorMap: { user: '#f00' },
      },
    })
    expect(icons()[1].props()).toMatchObject({
      name: 'mdi:account-group',
      size: 16,
      color: '#f00',
    })
    expect(icons()[3].props('name')).toBe('mdi:star')
    expect(icons()[4].props('name')).toBe('mdi:help')
    expect(wrapper.getComponent(NTree).props('draggable')).toBe(false)
    expect(wrapper.getComponent(NTree).props('showLine')).toBe(true)
  })

  test('icon resolver reacts to controlled expansion/selection, accepts a narrow descriptor and null hides', async () => {
    const data: Department[] = [
      { ...roots[0], items: [{ code: 1, title: 'Member' }] },
    ]
    const resolve = vi.fn(
      ({ expanded, selected }: TreeNodeRenderContext<Department>) =>
        selected
          ? { name: 'mdi:check', size: '18px', color: '#00f' }
          : expanded
            ? 'mdi:folder-open'
            : 'mdi:folder'
    )
    const wrapper = mount(C_Tree<Department>, {
      props: {
        data,
        ...fields,
        expandedKeys: [],
        selectedKeys: [],
        iconConfig: { resolve },
        actions: [],
      },
    })
    const icons = () =>
      wrapper
        .findAllComponents(C_Icon)
        .filter(icon => icon.classes().includes('c-tree-node-icon'))
    const icon = () => icons()[0]
    expect(icon().props('name')).toBe('mdi:folder')
    await wrapper.setProps({ expandedKeys: [0] })
    expect(icon().props('name')).toBe('mdi:folder-open')
    await wrapper.setProps({ selectedKeys: [0] })
    expect(icon().props()).toMatchObject({
      name: 'mdi:check',
      size: '18px',
      color: '#00f',
    })
    await wrapper.setProps({ iconConfig: { resolve: () => null } })
    expect(icons()).toHaveLength(0)
  })

  test.each(['resolve', 'reject'] as const)(
    'native lazy %s updates all renderer loading states and clears the indicator',
    async outcome => {
      const work = defer<void>()
      const wrapper = mount(C_Tree<Department>, {
        props: {
          data: roots,
          ...fields,
          treeProps: { onLoad: () => work.promise, animated: false },
        },
        slots: {
          prefix: context => stateNode(context, 'prefix'),
          label: context => stateNode(context, 'label'),
          suffix: context => stateNode(context, 'suffix'),
        },
      })
      await wrapper.get('.n-tree-node-switcher').trigger('click')
      for (const part of ['prefix', 'label', 'suffix'])
        expect(
          wrapper.get(`[data-part="${part}"]`).attributes('data-loading')
        ).toBe('true')
      expect(wrapper.find('.c-tree-node-loading').exists()).toBe(true)
      if (outcome === 'resolve') {
        // 原生 onLoad 的数据更新仍由调用方负责，避免无子项的成功结果反复触发加载。
        await wrapper.setProps({
          data: [{ ...roots[0], items: [{ code: 1, title: 'Loaded child' }] }],
        })
        work.resolve()
      } else work.reject(new Error('offline'))
      await flushPromises()
      expect(
        wrapper.get('[data-part="suffix"]').attributes('data-loading')
      ).toBe('false')
      expect(wrapper.find('.c-tree-node-loading').exists()).toBe(false)
      expect(roots[0]).not.toHaveProperty('items')
    }
  )

  test('remote partial paths and source load use the same state without mutating readonly custom-field data', async () => {
    const work = defer<readonly Department[]>()
    const child: Department = { code: 1, title: 'Remote member' }
    const source = {
      debounce: 0,
      request: async () => [[roots[0], child]],
      load: () => work.promise,
    }
    const wrapper = mount(C_Tree<Department>, {
      props: {
        data: roots,
        ...fields,
        searchSource: source,
        searchPattern: 'member',
        treeProps: { animated: false },
      },
      slots: { label: context => stateNode(context, 'label') },
    })
    await vi.waitFor(() => expect(wrapper.text()).toContain('Remote member'))
    const node = wrapper.getComponent(NTree).props('data')![0]
    const loading = wrapper.getComponent(NTree).props('onLoad')!(node)
    await nextTick()
    expect(
      wrapper.get('[data-part="label"][data-key="0"]').attributes()
    ).toMatchObject({
      'data-expanded': 'true',
      'data-leaf': 'false',
      'data-loading': 'true',
    })
    work.resolve([child])
    await loading
    await flushPromises()
    expect(
      wrapper
        .get('[data-part="label"][data-key="0"]')
        .attributes('data-loading')
    ).toBe('false')
    expect(roots[0]).not.toHaveProperty('items')
    expect(Object.isFrozen(roots[0])).toBe(true)
  })

  test('busy/disabled actions block clicks and confirmation rechecks latest predicates, config and node', async () => {
    const disabled = ref(false)
    const busy = ref(false)
    const action = {
      key: 'edit',
      text: 'Edit',
      icon: 'mdi:pencil',
      confirm: 'Confirm edit?',
      disabled: () => disabled.value,
      loading: () => busy.value,
    }
    const wrapper = mount(C_Tree<Department>, {
      props: { data: roots, ...fields, showToolbar: false, actions: [action] },
    })
    const positive = wrapper.getComponent(NPopconfirm).props('onPositiveClick')!
    await wrapper.get('.tree-actions button').trigger('click')
    disabled.value = true
    await nextTick()
    positive(new MouseEvent('click'))
    expect(wrapper.emitted('node-action')).toBeUndefined()
    disabled.value = false
    busy.value = true
    await nextTick()
    expect(wrapper.getComponent(NButton).props('loading')).toBe(true)
    expect(wrapper.get('.tree-actions button').attributes()).toHaveProperty(
      'disabled'
    )
    positive(new MouseEvent('click'))
    await wrapper.get('.tree-actions button').trigger('click')
    expect(wrapper.emitted('node-action')).toBeUndefined()
    busy.value = false
    const current = { ...roots[0], title: 'Updated company' }
    await wrapper.setProps({ data: [current] })
    // 复用同 key 的新对象不是原弹层的业务对象。
    positive(new MouseEvent('click'))
    positive(new MouseEvent('click'))
    expect(wrapper.emitted('node-action')).toBeUndefined()
    const currentPositive = wrapper
      .getComponent(NPopconfirm)
      .props('onPositiveClick')!
    currentPositive(new MouseEvent('click'))
    currentPositive(new MouseEvent('click'))
    expect(wrapper.emitted('node-action')).toEqual([['edit', current]])
    await nextTick()
    await wrapper.setProps({ actions: [{ ...action, show: () => false }] })
    positive(new MouseEvent('click'))
    expect(wrapper.emitted('node-action')).toHaveLength(1)
  })

  test('global and custom node disabling override action predicates and direct dispatch remains single', async () => {
    const props: TreeProps<Department> = {
      data: [{ ...roots[0], inactive: true }],
      ...fields,
      showToolbar: false,
      treeProps: { disabledField: 'inactive' },
      actions: [
        {
          key: 'add',
          text: 'Add',
          icon: 'mdi:plus',
          disabled: false,
          loading: false,
        },
      ],
    }
    const wrapper = mount(C_Tree<Department>, { props: { ...props } })
    const click = () =>
      wrapper.getComponent(NButton).vm.$emit('click', new MouseEvent('click'))
    click()
    expect(wrapper.emitted('add')).toBeUndefined()
    await wrapper.setProps({ data: roots, disabled: true })
    click()
    expect(wrapper.emitted('add')).toBeUndefined()
    await wrapper.setProps({ disabled: false })
    click()
    click()
    expect(wrapper.emitted('add')).toEqual([[roots[0]]])
    expect(wrapper.emitted('node-select')).toBeUndefined()
  })

  test('same reactive node updates are rechecked but source-scope changes invalidate an open confirmation', async () => {
    const source = { scope: 'company-a', request: async () => [] }
    const node = reactive({ ...roots[0], inactive: false })
    const action = {
      key: 'edit',
      text: 'Edit',
      icon: 'mdi:pencil',
      confirm: 'Confirm?',
      disabled: (node: Department) => Boolean(node.inactive),
    }
    const wrapper = mount(C_Tree<Department>, {
      props: {
        data: [node],
        ...fields,
        searchSource: source,
        actions: [action],
      },
    })
    const positive = wrapper.getComponent(NPopconfirm).props('onPositiveClick')!
    node.inactive = true
    await nextTick()
    positive(new MouseEvent('click'))
    expect(wrapper.emitted('node-action')).toBeUndefined()
    node.inactive = false
    await nextTick()
    positive(new MouseEvent('click'))
    expect(wrapper.emitted('node-action')).toEqual([['edit', node]])
    await wrapper.setProps({ searchSource: { ...source, scope: 'company-b' } })
    positive(new MouseEvent('click'))
    expect(wrapper.emitted('node-action')).toHaveLength(1)
    wrapper.getComponent(NPopconfirm).props('onPositiveClick')!(
      new MouseEvent('click')
    )
    expect(wrapper.emitted('node-action')).toEqual([
      ['edit', node],
      ['edit', node],
    ])
  })

  test.each([false, true])(
    'local filtering uses native actual expansion with controlled=%s',
    async controlled => {
      const wrapper = mount(C_Tree<Department>, {
        props: {
          data: [{ ...roots[0], items: [{ code: 1, title: 'Find member' }] }],
          ...fields,
          ...(controlled ? { expandedKeys: [] } : {}),
          treeProps: { animated: false, showIrrelevantNodes: false },
        },
        slots: { label: context => stateNode(context, 'label') },
      })
      await wrapper.getComponent(NInput).get('input').setValue('Find member')
      await flushPromises()
      expect(
        wrapper
          .get('[data-part="label"][data-key="0"]')
          .attributes('data-expanded')
      ).toBe(String(!controlled))
      expect(wrapper.find('[data-part="label"][data-key="1"]').exists()).toBe(
        !controlled
      )
      if (controlled) {
        await wrapper.setProps({ expandedKeys: [0] })
        expect(
          wrapper
            .get('[data-part="label"][data-key="0"]')
            .attributes('data-expanded')
        ).toBe('true')
        expect(wrapper.find('[data-part="label"][data-key="1"]').exists()).toBe(
          true
        )
      } else {
        await wrapper.getComponent(NInput).get('input').setValue('')
        await flushPromises()
        expect(
          wrapper
            .get('[data-part="label"][data-key="0"]')
            .attributes('data-expanded')
        ).toBe('false')
      }
    }
  )

  test('filtered ancestor actions use their original identity and stale remote projection confirmations are rejected', async () => {
    const root: Department = {
      ...roots[0],
      items: [{ code: 1, title: 'Match member' }],
    }
    const action = {
      key: 'edit',
      text: 'Edit',
      icon: 'mdi:pencil',
      confirm: 'Confirm?',
    }
    const wrapper = mount(C_Tree<Department>, {
      props: {
        data: [root],
        ...fields,
        actions: [action],
        treeProps: { showIrrelevantNodes: false, animated: false },
      },
    })
    await wrapper.getComponent(NInput).get('input').setValue('Match member')
    await flushPromises()
    wrapper.findAllComponents(NPopconfirm)[0].props('onPositiveClick')!(
      new MouseEvent('click')
    )
    expect(wrapper.emitted('node-action')).toEqual([['edit', root]])

    const source = {
      debounce: 0,
      request: async () => [[roots[0], { code: 1, title: 'Remote match' }]],
    }
    const remote = mount(C_Tree<Department>, {
      props: {
        data: [{ code: 0, title: 'Company' }],
        ...fields,
        searchSource: source,
        searchPattern: 'one',
        actions: [action],
      },
    })
    await vi.waitFor(() => expect(remote.text()).toContain('Remote match'))
    const positive = remote
      .findAllComponents(NPopconfirm)[0]
      .props('onPositiveClick')!
    const oldProjection = remote.getComponent(NTree).props('data')![0]
    await remote.setProps({ searchPattern: 'two' })
    await vi.waitFor(() => {
      expect(remote.text()).toContain('Remote match')
      expect(remote.getComponent(NTree).props('data')![0]).not.toBe(
        oldProjection
      )
    })
    positive(new MouseEvent('click'))
    expect(remote.emitted('node-action')).toBeUndefined()
  })

  test('legacy onLoad loading follows original root identity across remote projection rebuilds', async () => {
    const work = defer<boolean>()
    const source = {
      debounce: 0,
      request: async () => [[roots[0], { code: 1, title: 'Remote match' }]],
    }
    const onLoad = vi.fn(() => work.promise)
    const wrapper = mount(C_Tree<Department>, {
      props: {
        data: roots,
        ...fields,
        searchSource: source,
        searchPattern: 'one',
        treeProps: { onLoad, animated: false },
      },
      slots: { label: context => stateNode(context, 'label') },
    })
    await vi.waitFor(() => expect(wrapper.text()).toContain('Remote match'))
    const oldProjection = wrapper.getComponent(NTree).props('data')![0]
    const first = wrapper.getComponent(NTree).props('onLoad')!(oldProjection)
    await nextTick()
    expect(wrapper.get('[data-key="0"]').attributes('data-loading')).toBe(
      'true'
    )
    await wrapper.setProps({ searchPattern: 'two' })
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Remote match')
      expect(wrapper.getComponent(NTree).props('data')![0]).not.toBe(
        oldProjection
      )
    })
    expect(wrapper.get('[data-key="0"]').attributes('data-loading')).toBe(
      'true'
    )
    const second = wrapper.getComponent(NTree).props('onLoad')!(
      wrapper.getComponent(NTree).props('data')![0]
    )
    expect(onLoad).toHaveBeenCalledTimes(1)
    work.resolve(false)
    await Promise.all([first, second])
    await flushPromises()
    expect(onLoad).toHaveBeenCalledTimes(1)
    expect(wrapper.get('[data-key="0"]').attributes('data-loading')).toBe(
      'false'
    )
  })
})
