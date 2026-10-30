/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-30
 * @Description: 保留 Naive 原生空态、Provider 配置和单表插槽
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */
import { expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import { NConfigProvider } from 'naive-ui'
import C_Table from '../../src/components/C_Table/index.vue'

const props = {
  columns: [{ key: 'id', title: 'ID' }],
  data: [] as { id: number }[],
  config: { toolbar: { show: false }, pagination: false as const },
}

test('默认采用 Naive 原生空态，数据恢复后移除', async () => {
  const wrapper = mount(C_Table<{ id: number }>, { props })
  expect(wrapper.find('.n-empty').exists()).toBe(true)
  expect(wrapper.find('.c-table-empty').exists()).toBe(false)
  await wrapper.setProps({ data: [{ id: 1 }] })
  expect(wrapper.find('.n-empty').exists()).toBe(false)
})

test('保留 Naive Provider 的全局 renderEmpty，并允许单表 empty 插槽覆盖', () => {
  const provider = mount(NConfigProvider, {
    props: {
      componentOptions: {
        DataTable: {
          renderEmpty: () => h('p', { class: 'provider-empty' }, '应用空态'),
        },
      },
    },
    slots: { default: () => h(C_Table, props) },
  })
  expect(provider.get('.provider-empty').text()).toBe('应用空态')
  const custom = mount(C_Table<{ id: number }>, {
    props,
    slots: { empty: () => h('p', { class: 'custom-empty' }, '业务自定义') },
  })
  expect(custom.get('.custom-empty').text()).toBe('业务自定义')
  expect(custom.find('.n-empty').exists()).toBe(false)
})
