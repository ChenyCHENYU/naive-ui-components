import { expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import WaterFall from '../../src/components/C_WaterFall/index.vue'

test('the footer exposes the same camel-case loadMore action as its public slot type', () => {
  let context: unknown
  const wrapper = mount(WaterFall, {
    props: { items: [], infinite: true },
    slots: {
      footer: props => {
        context = props
        return h('span', 'Footer')
      },
    },
  })
  expect(context).toMatchObject({
    status: 'idle',
    paused: false,
    loadMore: expect.any(Function),
  })
  expect(wrapper.text()).toContain('Footer')
})
