/*
 * @Description: 菜单图标尺寸的原生转发与默认行为回归
 */
import { expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import { NMenu } from 'naive-ui'
import C_Menu from '../../src/components/C_Menu/index.vue'

const options = [{ key: 'home', label: '首页', icon: () => h('span', '图标') }]

test('常态图标尺寸转发至真实 NMenu，收起态继续使用独立尺寸', async () => {
  const wrapper = mount(C_Menu, {
    props: { options, iconSize: 18 },
    global: { components: { NMenu } },
  })
  const native = wrapper.getComponent(NMenu)
  expect(native.props('iconSize')).toBe(18)
  expect(native.props('collapsedIconSize')).toBe(22)
  expect(
    wrapper.get('.n-menu-item-content__icon').attributes('style')
  ).toContain('font-size: 18px')

  await wrapper.setProps({ collapsed: true })
  expect(
    wrapper.get('.n-menu-item-content__icon').attributes('style')
  ).toContain('font-size: 22px')

  await wrapper.setProps({ iconSize: 20, collapsedIconSize: 18 })
  expect(native.props('iconSize')).toBe(20)
  expect(native.props('collapsedIconSize')).toBe(18)
  expect(
    wrapper.get('.n-menu-item-content__icon').attributes('style')
  ).toContain('font-size: 18px')
})

test('未传常态图标尺寸时保留 NMenu 默认值，清除显式值后恢复默认', async () => {
  const baseline = mount(NMenu, { props: { options } })
  const wrapper = mount(C_Menu, {
    props: { options },
    global: { components: { NMenu } },
  })
  const native = wrapper.getComponent(NMenu)
  expect(native.props('iconSize')).toBe(baseline.props('iconSize'))

  await wrapper.setProps({ iconSize: 18 })
  expect(native.props('iconSize')).toBe(18)
  await wrapper.setProps({ iconSize: undefined })
  expect(native.props('iconSize')).toBe(baseline.props('iconSize'))
})
