import { describe, expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { NDropdown, NTag } from 'naive-ui'
import { createMemoryHistory, createRouter } from 'vue-router'
import C_Tabs from '../../src/components/C_Tabs/index.vue'
import C_TagsView from '../../src/components/C_TagsView/index.vue'

const tabItems = [
  { key: 'a', label: 'A' },
  { key: 'b', label: 'B' },
]

describe('tabs select a valid enabled fallback', () => {
  test('invalid defaults and removed defaults fall back to an existing enabled item', async () => {
    const wrapper = mount(C_Tabs, {
      props: { defaultValue: 'missing', items: tabItems },
    })
    expect(wrapper.vm.activeValue).toBe('a')
    await wrapper.setProps({ defaultValue: 'a', items: [tabItems[1]] })
    expect(wrapper.vm.activeValue).toBe('b')
    expect(wrapper.emitted('update:modelValue')!.at(-1)).toEqual(['b'])
  })

  test('in-place disabled changes, empty lists and repopulation reconcile without invalid repeated events', async () => {
    const wrapper = mount(C_Tabs, {
      props: { defaultValue: 'a', items: tabItems },
    })
    await wrapper.setProps({
      items: [{ ...tabItems[0], disabled: true }, tabItems[1]],
    })
    expect(wrapper.vm.activeValue).toBe('b')
    expect(wrapper.emitted('change')!.at(-1)![0]).toBe('b')
    await wrapper.setProps({ items: [] })
    expect(wrapper.vm.activeValue).toBeNull()
    expect(wrapper.find('.n-tab-pane').exists()).toBe(false)
    await wrapper.setProps({ items: [tabItems[1]] })
    expect(wrapper.vm.activeValue).toBe('b')
    await wrapper.setProps({ items: [{ ...tabItems[1], disabled: true }] })
    expect(wrapper.vm.activeValue).toBeNull()
    expect(wrapper.find('.n-tabs-tab--active').exists()).toBe(false)
  })

  test('explicit controlled null stays empty, and invalid controlled keys request an enabled fallback', async () => {
    const wrapper = mount(C_Tabs, {
      props: { modelValue: null, items: tabItems },
    })
    expect(wrapper.vm.activeValue).toBeNull()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    await wrapper.setProps({ modelValue: 'missing' })
    expect(wrapper.vm.activeValue).toBe('a')
    expect(wrapper.emitted('update:modelValue')!.at(-1)).toEqual(['a'])
  })

  test('real clicks invoke beforeChange, denied requests do not change active tabs', async () => {
    const beforeChange = vi.fn(() => false)
    const wrapper = mount(C_Tabs, { props: { items: tabItems, beforeChange } })
    await wrapper.findAll('.n-tabs-tab')[1].trigger('click')
    await flushPromises()
    expect(beforeChange).toHaveBeenCalledWith('b', 'a')
    expect(wrapper.vm.activeValue).toBe('a')
    expect(wrapper.emitted('change')).toBeUndefined()
  })

  test('removing a target while its asynchronous guard waits cancels the stale switch', async () => {
    let finish!: (allowed: boolean) => void
    const wrapper = mount(C_Tabs, {
      props: {
        items: tabItems,
        beforeChange: () =>
          new Promise<boolean>(resolve => {
            finish = resolve
          }),
      },
    })
    await wrapper.findAll('.n-tabs-tab')[1].trigger('click')
    await wrapper.setProps({ items: [tabItems[0]] })
    finish(true)
    await flushPromises()
    expect(wrapper.vm.activeValue).toBe('a')
    expect(wrapper.emitted('change')).toBeUndefined()
  })
})

const createTags = async (path: string, affix = false) => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: ['/home', '/a', '/b', '/c'].map(route => ({
      path: route,
      component: { template: '<div />' },
      meta: { title: route },
    })),
  })
  await router.push(path)
  await router.isReady()
  const wrapper = mount(C_TagsView, {
    props: { persistKey: '' },
    global: {
      plugins: [router],
      components: { NTag, NDropdown },
      stubs: { C_Icon: true },
    },
  })
  wrapper.vm.tags.initTags(
    ['/a', '/b', '/c'].map(route => ({
      path: route,
      title: route,
      meta: { affix: affix && route === '/a' },
    }))
  )
  await flushPromises()
  return { router, wrapper }
}
const closeFrom = async (
  wrapper: Awaited<ReturnType<typeof createTags>>['wrapper'],
  path: string,
  action: string
) => {
  await wrapper
    .get(`[data-path="${path}"]`)
    .trigger('contextmenu', { clientX: 10, clientY: 10 })
  wrapper.getComponent(NDropdown).vm.$emit('select', action)
  await flushPromises()
}

describe('tags bulk close keeps routing and active labels consistent', () => {
  test.each([
    ['/c', '/a', 'closeOthers', '/a', ['/a']],
    ['/b', '/c', 'closeLeft', '/c', ['/a', '/c']],
    ['/c', '/a', 'closeRight', '/a', ['/a']],
  ] as const)(
    '%s follows retained %s after %s',
    async (active, selected, action, fallback, retained) => {
      const { wrapper, router } = await createTags(active)
      await closeFrom(wrapper, selected, action)
      expect(router.currentRoute.value.path).toBe(fallback)
      expect(wrapper.vm.tags.tagsViewList.value.map(tag => tag.path)).toEqual(
        retained
      )
      expect(wrapper.vm.tags.activeTag.value).toBe(fallback)
    }
  )

  test('keeping the current route needs no navigation, and affix tags survive', async () => {
    const { wrapper, router } = await createTags('/b', true)
    const push = vi.spyOn(router, 'push')
    await closeFrom(wrapper, '/b', 'closeOthers')
    expect(push).not.toHaveBeenCalled()
    expect(wrapper.vm.tags.tagsViewList.value.map(tag => tag.path)).toEqual([
      '/a',
      '/b',
    ])
  })

  test('a navigation guard denying a bulk close preserves both tags and current route', async () => {
    const { wrapper, router } = await createTags('/c')
    router.beforeEach(to => (to.path === '/a' ? false : true))
    await closeFrom(wrapper, '/a', 'closeOthers')
    expect(router.currentRoute.value.path).toBe('/c')
    expect(wrapper.vm.tags.tagsViewList.value.map(tag => tag.path)).toEqual([
      '/a',
      '/b',
      '/c',
    ])
  })

  test('router redirects keep the actual destination visible', async () => {
    const { wrapper, router } = await createTags('/c')
    router.beforeEach(to => (to.path === '/a' ? '/b' : true))
    await closeFrom(wrapper, '/a', 'closeOthers')
    expect(router.currentRoute.value.path).toBe('/b')
    expect(wrapper.vm.tags.tagsViewList.value.map(tag => tag.path)).toEqual([
      '/a',
      '/b',
    ])
    expect(wrapper.vm.tags.activeTag.value).toBe('/b')
  })

  test('close-all navigates home even from an affix route and also works when already home', async () => {
    const { wrapper, router } = await createTags('/a', true)
    await closeFrom(wrapper, '/b', 'closeAll')
    expect(router.currentRoute.value.path).toBe('/home')
    expect(wrapper.vm.tags.tagsViewList.value.map(tag => tag.path)).toEqual([
      '/a',
      '/home',
    ])
    wrapper.vm.tags.addTag({ path: '/b', title: '/b' })
    await flushPromises()
    await closeFrom(wrapper, '/b', 'closeAll')
    expect(wrapper.vm.tags.tagsViewList.value.map(tag => tag.path)).toEqual([
      '/a',
      '/home',
    ])
    expect(wrapper.emitted('closeAll')).toHaveLength(2)
  })

  test('closing all retains affix tags and the destination tag', async () => {
    const { wrapper, router } = await createTags('/c', true)
    await closeFrom(wrapper, '/b', 'closeAll')
    expect(router.currentRoute.value.path).toBe('/home')
    expect(wrapper.vm.tags.tagsViewList.value.map(tag => tag.path)).toEqual([
      '/a',
      '/home',
    ])
    expect(wrapper.emitted('closeAll')).toHaveLength(1)
  })
})
