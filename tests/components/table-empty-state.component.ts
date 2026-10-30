/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-30
 * @Description: 表格内置插画空态、语言覆盖、自定义内容和加载边界
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */
import { expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import C_Table from '../../src/components/C_Table/index.vue'
import { TABLE_GLOBAL_CONFIG_KEY } from '../../src/components/C_Table/composables/useTableGlobalConfig'

const props = {
  columns: [{ key: 'id', title: 'ID' }],
  data: [] as { id: number }[],
  config: { toolbar: { show: false }, pagination: false as const },
}

test('默认空态有装饰插画、标题和说明，数据恢复后移除', async () => {
  const wrapper = mount(C_Table<{ id: number }>, { props })
  expect(wrapper.get('.c-table-empty__title').text()).toBe('没有可显示的行')
  expect(wrapper.get('.c-table-empty__hint').text()).toContain('暂无数据')
  expect(wrapper.get('.c-table-empty__icon').attributes('aria-hidden')).toBe(
    'true'
  )
  expect(wrapper.find('svg [id]').exists()).toBe(false)
  await wrapper.setProps({ data: [{ id: 1 }] })
  expect(wrapper.find('.c-table-empty').exists()).toBe(false)
})

test('应用文案与组件语言覆盖保持纯文本，默认插画不接收外部 HTML', () => {
  const wrapper = mount(C_Table<{ id: number }>, {
    props: {
      ...props,
      config: {
        ...props.config,
        locale: { messages: { 'table.emptyHint': 'Custom hint' } },
      },
    },
    global: {
      provide: {
        [TABLE_GLOBAL_CONFIG_KEY as symbol]: { emptyText: '<img src=x>' },
      },
    },
  })
  expect(wrapper.get('.c-table-empty__title').text()).toBe('<img src=x>')
  expect(wrapper.find('img').exists()).toBe(false)
  expect(wrapper.get('.c-table-empty__hint').text()).toBe('Custom hint')
})

test('empty 插槽完全替换默认空态，加载与错误不误报无数据', async () => {
  const custom = mount(C_Table<{ id: number }>, {
    props,
    slots: { empty: () => h('p', { class: 'custom-empty' }, '业务自定义') },
  })
  expect(custom.get('.custom-empty').text()).toBe('业务自定义')
  expect(custom.find('.c-table-empty').exists()).toBe(false)
  const wrapper = mount(C_Table<{ id: number }>, {
    props: { ...props, loading: true },
  })
  expect(wrapper.find('.c-table-empty').exists()).toBe(false)
  await wrapper.setProps({
    loading: false,
    config: { ...props.config, error: { show: true, message: '失败' } },
  })
  expect(wrapper.find('.c-table-empty').exists()).toBe(false)
  expect(wrapper.text()).toContain('失败')
})
