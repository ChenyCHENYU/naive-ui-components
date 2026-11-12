import { expect, test } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { NTag, NDropdown } from 'naive-ui'
import C_TagsView from '../../src/components/C_TagsView/index.vue'

test('query changes update one tag and closing another restores its saved query/hash address', async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: ['/home', '/order', '/list'].map(path => ({
      path,
      component: { template: '<div />' },
      meta: { title: path },
    })),
  })
  await router.push('/order?id=1#detail')
  await router.isReady()
  const wrapper = mount(C_TagsView, {
    props: { persistKey: '' },
    global: {
      plugins: [router],
      components: { NTag, NDropdown },
      stubs: { C_Icon: true },
    },
  })
  try {
    await router.push('/order?id=2#items')
    await flushPromises()
    expect(wrapper.vm.tags.tagsViewList.value).toHaveLength(1)
    expect(wrapper.vm.tags.tagsViewList.value[0].fullPath).toBe(
      '/order?id=2#items'
    )
    await router.push('/list?status=open')
    await flushPromises()
    await wrapper.get('[data-path="/order"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/order?id=2#items')
    await router.push('/list?status=closed')
    await flushPromises()
    wrapper
      .findAllComponents(NTag)
      .find(tag => tag.attributes('data-path') === '/list')!
      .vm.$emit('close', new MouseEvent('click'))
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/order?id=2#items')
    expect(wrapper.vm.tags.tagsViewList.value.map(tag => tag.path)).toEqual([
      '/order',
    ])
  } finally {
    wrapper.unmount()
  }
})
