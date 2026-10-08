/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-08
 * @FilePath: \naive-ui-components\tests\components\table.component.ts
 * @Description: 根容器属性、原生属性转发、选择事件与加载切换
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */
import { describe, expect, test } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { NDataTable } from 'naive-ui'
import C_Table from '../../src/components/C_Table/index.vue'
import type { TableInstance } from '../../src/components/C_Table/types'

const props = {
  data: [
    { id: 'u1', name: 'Alice' },
    { id: 'u2', name: 'Bob' },
  ],
  columns: [{ type: 'selection' as const }, { title: '姓名', key: 'name' }],
  config: {
    toolbar: { show: false },
    pagination: false as const,
    selection: { enabled: true },
  },
}
describe('表格公开契约', () => {
  test('根 class 命中外层，原生 class/style 和 row-props 保持内部转发', async () => {
    const wrapper = mount(C_Table, {
      props: {
        ...props,
        wrapperClass: ['inventory', { compact: true }],
        flexHeight: true,
      },
      attrs: {
        class: 'native-table',
        style: { height: '320px' },
        rowProps: () => ({ 'data-row': 'record' }),
      },
    })
    await flushPromises()
    expect(wrapper.classes()).toContain('inventory')
    expect(wrapper.classes()).toContain('compact')
    expect(wrapper.classes()).toContain('c-table-wrapper--flex')
    expect(wrapper.classes()).not.toContain('native-table')
    const table = wrapper.getComponent(NDataTable)
    expect(table.classes()).toContain('native-table')
    expect(table.props('flexHeight')).toBe(true)
    expect(table.attributes('style')).toContain('height: 320px')
    expect(wrapper.findAll('tbody tr[data-row="record"]')).toHaveLength(2)
    expect(wrapper.text()).toContain('Alice')
    await wrapper.setProps({ flexHeight: false, wrapperClass: 'natural' })
    expect(wrapper.classes()).not.toContain('c-table-wrapper--flex')
    expect(wrapper.classes()).not.toContain('inventory')
    expect(wrapper.classes()).toContain('natural')
    expect(table.props('flexHeight')).toBe(false)
  })
  test('选择事件和公开清空方法包含真实行，数据实例互不影响', async () => {
    const first = mount(C_Table, { props })
    const second = mount(C_Table, { props })
    await flushPromises()
    const boxes = first.findAll('.n-checkbox')
    expect(boxes).toHaveLength(3)
    await boxes[1].trigger('click')
    await flushPromises()
    const selected = first.emitted('selection-change')?.at(-1)
    expect(selected?.[0]).toEqual(['u1'])
    expect(selected?.[1]).toEqual([{ id: 'u1', name: 'Alice' }])
    expect(second.emitted('selection-change')).toBeUndefined()
    ;(first.vm as unknown as TableInstance).clearSelection()
    await flushPromises()
    expect(first.emitted('selection-change')?.at(-1)?.[0]).toEqual([])
  })
  test('加载与错误状态切换保留外层契约，分页仍在根容器内', async () => {
    const wrapper = mount(C_Table, {
      props: {
        ...props,
        wrapperClass: 'fixed-table',
        flexHeight: true,
        loading: true,
        config: { ...props.config, pagination: { pageSize: 1 } },
      },
    })
    expect(wrapper.attributes('aria-busy')).toBe('true')
    expect(wrapper.find('.pagination-wrapper').exists()).toBe(true)
    await wrapper.setProps({
      loading: false,
      config: {
        ...props.config,
        pagination: { pageSize: 1 },
        error: { show: true, message: '加载失败' },
      },
    })
    expect(wrapper.attributes('aria-busy')).toBe('false')
    expect(wrapper.text()).toContain('加载失败')
    expect(wrapper.classes()).toContain('fixed-table')
    expect(wrapper.findComponent(NDataTable).exists()).toBe(false)
  })
})
