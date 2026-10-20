import { describe, expect, test, vi } from 'vitest'
import { DOMWrapper, flushPromises, mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import C_Breadcrumb from '../../src/components/C_Breadcrumb/index.vue'
import type {
  BreadcrumbItem,
  BreadcrumbMenuItem,
} from '../../src/components/C_Breadcrumb'

const routeView = { template: '<div />' }
const createNavigation = async (path = '/workspace/people/list') => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/workspace',
        component: routeView,
        meta: { title: 'Workspace', icon: 'mdi:folder-outline' },
        children: [
          {
            path: 'people',
            component: routeView,
            meta: { title: 'People' },
            children: [
              {
                path: 'list',
                component: routeView,
                meta: { title: 'People list' },
              },
              {
                path: 'teams',
                component: routeView,
                meta: { title: 'Teams' },
                children: [
                  {
                    path: 'members',
                    component: routeView,
                    meta: { title: 'Members' },
                  },
                  {
                    path: 'audit',
                    component: routeView,
                    meta: { title: 'Audit' },
                  },
                ],
              },
            ],
          },
          {
            path: 'reports',
            component: routeView,
            meta: { title: 'Reports' },
            children: [
              {
                path: 'daily',
                component: routeView,
                meta: { title: 'Daily report' },
              },
            ],
          },
          {
            path: 'private',
            component: routeView,
            meta: { title: 'Private route' },
          },
          {
            path: 'hidden',
            component: routeView,
            meta: { title: 'Hidden route', hidden: true },
          },
          {
            path: 'silent',
            component: routeView,
            meta: { title: 'Silent route', breadcrumb: false },
          },
          { path: 'untitled', component: routeView },
        ],
      },
    ],
  })
  await router.push(path)
  await router.isReady()
  return router
}

const menus: readonly BreadcrumbMenuItem[] = [
  {
    path: '/workspace',
    meta: { title: 'Workspace' },
    children: [
      {
        path: 'people',
        meta: { title: 'People' },
        children: [
          { path: 'list', meta: { title: 'People list' } },
          {
            path: 'teams',
            meta: { title: 'Teams' },
            children: [
              { path: 'members', meta: { title: 'Members' } },
              { path: 'audit', meta: { title: 'Audit' }, disabled: true },
            ],
          },
        ],
      },
      {
        path: 'reports',
        meta: { title: 'Reports' },
        children: [{ path: 'daily', meta: { title: 'Daily report' } }],
      },
      { path: 'hidden', meta: { title: 'Hidden menu', hidden: true } },
      { path: 'silent', meta: { title: 'Silent menu', breadcrumb: false } },
      { path: 'untitled' },
      { type: 'divider', key: 'divider' },
      {
        type: 'group',
        key: 'administration',
        label: 'Group title',
        children: [{ path: 'support', label: 'Support center' }],
      },
      {
        path: 'container',
        meta: { title: 'Container title', breadcrumb: false },
        children: [{ path: 'guide', meta: { title: 'Guide' } }],
      },
    ],
  },
]

const body = () => new DOMWrapper(document.body)
const settle = async () => {
  await nextTick()
  await flushPromises()
}
const panel = () => body().get('.c-breadcrumb-panel')
const treeButton = (label: string) => {
  const button = panel()
    .findAll<HTMLButtonElement>('button[role="treeitem"]')
    .find(item => item.attributes('title') === label)
  expect(button, `expected the visible menu entry ${label}`).toBeDefined()
  return button!
}
const expand = async (label: string) => {
  const button = treeButton(label)
  if (button.attributes('aria-expanded') === 'false') {
    await button.trigger('click')
    await settle()
  }
  return treeButton(label)
}
const firstTrigger = (wrapper: ReturnType<typeof mount>) =>
  wrapper.get<HTMLButtonElement>('button[aria-haspopup="tree"]')
const open = async (wrapper: ReturnType<typeof mount>) => {
  await firstTrigger(wrapper).trigger('click')
  await settle()
}

describe('breadcrumb navigation through real route and menu data', () => {
  test('uses matched route labels and recursively resolves relative route children', async () => {
    const router = await createNavigation()
    const push = vi.spyOn(router, 'push')
    const wrapper = mount(C_Breadcrumb, {
      attachTo: document.body,
      global: { plugins: [router] },
    })
    expect(wrapper.get('nav[aria-label="面包屑"]').text()).toContain(
      'Workspace'
    )
    expect(wrapper.text()).toContain('People')
    expect(wrapper.get('[aria-current="page"]').text()).toBe('People list')
    await open(wrapper)
    expect(firstTrigger(wrapper).attributes('aria-expanded')).toBe('true')
    expect(panel().get('header').text()).toContain('Workspace')
    expect(panel().get('header').text()).toContain('5 个页面')
    expect(panel().find('[role="tree"]').exists()).toBe(true)
    expect(panel().text()).not.toContain('Hidden route')
    expect(panel().text()).not.toContain('Silent route')
    expect(panel().text()).not.toContain('untitled')
    await expand('People')
    const current = treeButton('People list')
    expect(current.attributes('aria-current')).toBe('page')
    expect(current.element.disabled).toBe(true)
    await current.trigger('click')
    expect(wrapper.emitted('select')).toBeUndefined()
    await expand('Teams')
    await treeButton('Members').trigger('click')
    expect(wrapper.emitted('select')).toEqual([
      ['/workspace/people/teams/members'],
    ])
    expect(push).not.toHaveBeenCalled()
    expect(router.currentRoute.value.path).toBe('/workspace/people/list')
    expect(firstTrigger(wrapper).attributes('aria-expanded')).toBe('false')
  })

  test('authoritative menus filter unavailable destinations and preserve disabled leaves', async () => {
    const router = await createNavigation()
    const wrapper = mount(C_Breadcrumb, {
      attachTo: document.body,
      props: { menus },
      global: { plugins: [router] },
    })
    await open(wrapper)
    expect(panel().text()).not.toContain('Private route')
    expect(panel().text()).not.toContain('Hidden menu')
    expect(panel().text()).not.toContain('Silent menu')
    expect(panel().text()).not.toContain('untitled')
    await expand('People')
    await expand('Teams')
    expect(treeButton('Audit').element.disabled).toBe(true)
    await treeButton('Audit').trigger('click')
    expect(wrapper.emitted('select')).toBeUndefined()
    await treeButton('Members').trigger('click')
    expect(wrapper.emitted('select')).toEqual([
      ['/workspace/people/teams/members'],
    ])
    await wrapper.setProps({ menus: [] })
    expect(wrapper.find('button[aria-haspopup="tree"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('People list')
  })

  test('a breadcrumb-hidden current route keeps its last visible ancestor navigable', async () => {
    const router = await createNavigation('/workspace/silent')
    const wrapper = mount(C_Breadcrumb, {
      attachTo: document.body,
      props: { menus: [{ path: '/workspace', label: 'Workspace' }] },
      global: { plugins: [router] },
    })
    expect(wrapper.text()).not.toContain('Silent route')
    expect(wrapper.find('[aria-current="page"]').exists()).toBe(false)
    const ancestor = wrapper.get<HTMLButtonElement>('button[title="Workspace"]')
    expect(ancestor.element.disabled).toBe(false)
    await ancestor.trigger('click')
    expect(wrapper.emitted('select')).toEqual([['/workspace']])
    expect(router.currentRoute.value.path).toBe('/workspace/silent')
  })

  test('menu replacement closes the old popup and never retains revoked options', async () => {
    const router = await createNavigation()
    const wrapper = mount(C_Breadcrumb, {
      attachTo: document.body,
      props: { menus },
      global: { plugins: [router] },
    })
    await open(wrapper)
    await expand('Reports')
    expect(treeButton('Daily report').exists()).toBe(true)
    await wrapper.setProps({
      menus: [
        {
          path: '/workspace',
          meta: { title: 'Workspace' },
          children: [{ path: 'help', meta: { title: 'Help center' } }],
        },
      ],
    })
    await settle()
    expect(firstTrigger(wrapper).attributes('aria-expanded')).toBe('false')
    await open(wrapper)
    expect(panel().text()).toContain('Help center')
    expect(panel().text()).not.toContain('Reports')
    expect(panel().text()).not.toContain('Daily report')
    await treeButton('Help center').trigger('click')
    expect(wrapper.emitted('select')).toEqual([['/workspace/help']])
  })

  test('structural groups and breadcrumb-hidden containers expose only real child destinations', async () => {
    const router = await createNavigation()
    const wrapper = mount(C_Breadcrumb, {
      attachTo: document.body,
      props: { menus },
      global: { plugins: [router] },
    })
    await open(wrapper)
    expect(panel().text()).not.toContain('Group title')
    expect(panel().text()).not.toContain('Container title')
    await treeButton('Support center').trigger('click')
    expect(wrapper.emitted('select')).toEqual([['/workspace/support']])
    await open(wrapper)
    await treeButton('Guide').trigger('click')
    expect(wrapper.emitted('select')!.at(-1)).toEqual([
      '/workspace/container/guide',
    ])
  })

  test('reactive label formatting refreshes matched and nested menu labels', async () => {
    const router = await createNavigation()
    const locale = ref('en')
    const labelFormatter = (label: string) => `${locale.value}:${label}`
    const wrapper = mount(C_Breadcrumb, {
      attachTo: document.body,
      props: { menus, labelFormatter },
      global: { plugins: [router] },
    })
    expect(wrapper.text()).toContain('en:People list')
    await open(wrapper)
    await expand('en:People')
    expect(panel().text()).toContain('en:People list')
    locale.value = 'zh'
    await settle()
    expect(wrapper.text()).toContain('zh:People list')
    expect(wrapper.text()).not.toContain('en:People list')
    if (firstTrigger(wrapper).attributes('aria-expanded') !== 'true') {
      await open(wrapper)
    }
    await expand('zh:People')
    expect(panel().text()).toContain('zh:People list')
    expect(panel().text()).not.toContain('en:People list')
  })

  test('readonly manual items retain legacy select behavior without formatting or input mutation', async () => {
    const router = await createNavigation()
    const children = Object.freeze([
      Object.freeze({ key: '/legacy/one', label: 'Literal child' }),
      Object.freeze({
        key: '/legacy/disabled',
        label: 'Disabled child',
        disabled: true,
      }),
    ])
    const items: readonly BreadcrumbItem[] = Object.freeze([
      Object.freeze({
        key: '/legacy',
        label: 'Literal root',
        icon: 'mdi:folder-outline',
        children,
      }),
      Object.freeze({ key: '/legacy/current', label: 'Literal current' }),
    ])
    const before = JSON.stringify(items)
    const formatter = vi.fn((label: string) => `translated:${label}`)
    const wrapper = mount(C_Breadcrumb, {
      attachTo: document.body,
      props: {
        items,
        menus,
        labelFormatter: formatter,
        showIcon: false,
        iconSize: 20,
      },
      global: { plugins: [router] },
    })
    expect(wrapper.text()).toContain('Literal root')
    expect(wrapper.text()).toContain('Literal current')
    expect(wrapper.text()).not.toContain('Workspace')
    expect(wrapper.find('.c-icon').exists()).toBe(false)
    await open(wrapper)
    expect(treeButton('Disabled child').element.disabled).toBe(true)
    await treeButton('Disabled child').trigger('click')
    expect(wrapper.emitted('select')).toBeUndefined()
    await treeButton('Literal child').trigger('click')
    expect(wrapper.emitted('select')).toEqual([['/legacy/one']])
    expect(formatter).not.toHaveBeenCalled()
    expect(JSON.stringify(items)).toBe(before)
    await wrapper.setProps({ items: [] })
    expect(wrapper.text()).not.toContain('Workspace')
    expect(wrapper.find('button[aria-haspopup="tree"]').exists()).toBe(false)
  })

  test('manual items mount without a Router plugin and emit selections from ancestors and directories', async () => {
    const wrapper = mount(C_Breadcrumb, {
      attachTo: document.body,
      props: {
        items: [
          { key: '/manual', label: 'Manual root' },
          {
            key: '/manual/section',
            label: 'Manual section',
            children: [
              { key: '/manual/section/other', label: 'Other manual page' },
            ],
          },
          { key: '/manual/current', label: 'Manual current' },
        ],
      },
    })
    expect(wrapper.get('[aria-current="page"]').text()).toBe('Manual current')
    await wrapper.get('button[title="Manual root"]').trigger('click')
    expect(wrapper.emitted('select')).toEqual([['/manual']])
    await open(wrapper)
    await treeButton('Other manual page').trigger('click')
    expect(wrapper.emitted('select')).toEqual([
      ['/manual'],
      ['/manual/section/other'],
    ])
    expect(firstTrigger(wrapper).attributes('aria-expanded')).toBe('false')
  })

  test('keyboard navigation moves through enabled entries, collapses directories and restores trigger focus', async () => {
    const router = await createNavigation()
    const wrapper = mount(C_Breadcrumb, {
      attachTo: document.body,
      props: { menus },
      global: { plugins: [router] },
    })
    const trigger = firstTrigger(wrapper)
    trigger.element.focus()
    await open(wrapper)
    const enabledEntries = () =>
      panel().findAll<HTMLButtonElement>(
        'button[role="treeitem"]:not(:disabled)'
      )
    expect(document.activeElement).toBe(enabledEntries()[0].element)
    await new DOMWrapper(document.activeElement!).trigger('keydown', {
      key: 'End',
    })
    await settle()
    expect(document.activeElement).toBe(enabledEntries().at(-1)!.element)
    await new DOMWrapper(document.activeElement!).trigger('keydown', {
      key: 'Home',
    })
    await settle()
    expect(document.activeElement).toBe(enabledEntries()[0].element)
    await new DOMWrapper(document.activeElement!).trigger('keydown', {
      key: 'ArrowDown',
    })
    await settle()
    expect(document.activeElement).toBe(enabledEntries()[1].element)
    await new DOMWrapper(document.activeElement!).trigger('keydown', {
      key: 'ArrowUp',
    })
    await settle()
    expect(document.activeElement).toBe(enabledEntries()[0].element)
    const reports = treeButton('Reports')
    reports.element.focus()
    if (reports.attributes('aria-expanded') === 'true') {
      await reports.trigger('keydown', { key: 'ArrowLeft' })
    }
    await reports.trigger('keydown', { key: 'ArrowRight' })
    await settle()
    expect(treeButton('Reports').attributes('aria-expanded')).toBe('true')
    expect(treeButton('Daily report').exists()).toBe(true)
    await treeButton('Reports').trigger('keydown', { key: 'ArrowLeft' })
    await settle()
    expect(treeButton('Reports').attributes('aria-expanded')).toBe('false')
    expect(
      panel()
        .findAll('button')
        .some(button => button.text() === 'Daily report')
    ).toBe(false)
    await treeButton('Reports').trigger('keydown', { key: 'Escape' })
    await settle()
    expect(trigger.attributes('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(trigger.element)
    expect(wrapper.emitted('select')).toBeUndefined()
  })

  test('query changes close an open popup, and unmount leaves no live popup or document handler', async () => {
    const router = await createNavigation()
    const wrapper = mount(C_Breadcrumb, {
      attachTo: document.body,
      props: { menus },
      global: { plugins: [router] },
    })
    await open(wrapper)
    await router.push('/workspace/people/list?tab=details')
    await settle()
    expect(router.currentRoute.value.fullPath).toBe(
      '/workspace/people/list?tab=details'
    )
    expect(firstTrigger(wrapper).attributes('aria-expanded')).toBe('false')
    await open(wrapper)
    wrapper.unmount()
    await settle()
    expect(body().find('.c-breadcrumb-panel').exists()).toBe(false)
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    )
    expect(wrapper.emitted('select')).toBeUndefined()
  })

  test('moving keyboard focus outside the popup closes it and preserves the new focus target', async () => {
    const router = await createNavigation()
    const wrapper = mount(C_Breadcrumb, {
      attachTo: document.body,
      props: { menus },
      global: { plugins: [router] },
    })
    const outside = document.createElement('button')
    outside.textContent = 'Outside action'
    document.body.appendChild(outside)
    await open(wrapper)
    expect(panel().element.contains(document.activeElement)).toBe(true)
    outside.focus()
    await settle()
    expect(firstTrigger(wrapper).attributes('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(outside)
    expect(wrapper.emitted('select')).toBeUndefined()
  })

  test('narrow containers retain the current page and expose hidden ancestors through a complete-path button', async () => {
    const router = await createNavigation('/workspace/people/teams/members')
    let resizeRoot: ((width: number) => void) | undefined
    const disconnected = vi.fn()
    class ControlledResizeObserver implements ResizeObserver {
      private isRoot = false
      constructor(private callback: ResizeObserverCallback) {}
      observe(target: Element) {
        if (!target.matches('nav.c-breadcrumb')) return
        this.isRoot = true
        resizeRoot = width =>
          this.callback(
            [
              {
                target,
                contentRect: new DOMRect(0, 0, width, 40),
              } as ResizeObserverEntry,
            ],
            this
          )
      }
      unobserve() {
        return undefined
      }
      disconnect() {
        if (this.isRoot) disconnected()
      }
    }
    vi.stubGlobal('ResizeObserver', ControlledResizeObserver)
    const wrapper = mount(C_Breadcrumb, {
      attachTo: document.body,
      props: { menus },
      global: { plugins: [router] },
    })
    try {
      expect(resizeRoot).toBeTypeOf('function')
      resizeRoot!(200)
      await settle()
      expect(wrapper.get('[aria-current="page"]').text()).toBe('Members')
      expect(wrapper.text()).not.toContain('Workspace')
      expect(wrapper.text()).not.toContain('People')
      expect(wrapper.text()).not.toContain('Teams')
      const completePath = wrapper.get('button[aria-label="展开完整路径"]')
      await completePath.trigger('click')
      await settle()
      expect(treeButton('Workspace').exists()).toBe(true)
      expect(treeButton('People').exists()).toBe(true)
      expect(treeButton('Teams').exists()).toBe(true)
      resizeRoot!(800)
      await settle()
      expect(wrapper.find('button[aria-label="展开完整路径"]').exists()).toBe(
        false
      )
      expect(wrapper.text()).toContain('Workspace')
      expect(wrapper.text()).toContain('People')
      expect(wrapper.text()).toContain('Teams')
      resizeRoot!(200)
      await settle()
      expect(
        wrapper
          .get('button[aria-label="展开完整路径"]')
          .attributes('aria-expanded')
      ).toBe('false')
      wrapper.unmount()
      expect(disconnected).toHaveBeenCalledTimes(1)
    } finally {
      if (wrapper.exists()) wrapper.unmount()
      vi.unstubAllGlobals()
    }
  })
})
