import { expect, test, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ExcelViewer from '../../src/components/C_FilePreview/components/ExcelViewer/index.vue'
import type { ExcelSheet } from '../../src/components/C_FilePreview/types'

test('真实 Naive 页签显示工作表名称，点击后按需读取并切换数据', async () => {
  const loadReview = vi.fn(() => ({
    data: [{ A: { value: '跨表核对' } }],
    columns: [{ key: 'A', title: '工作项', width: 120 }],
  }))
  const sheets: ExcelSheet[] = [
    {
      name: '结算明细',
      merges: [],
      columns: [{ key: 'A', title: '业务编号', width: 120 }],
      data: [{ A: { value: '000042', displayValue: '000042' } }],
    },
    {
      name: '复核记录',
      merges: [],
      columns: [],
      data: [],
      load: loadReview,
    },
  ]
  const wrapper = mount(ExcelViewer, {
    props: { sheets },
    global: { stubs: { C_Icon: true } },
  })
  const tabs = wrapper.findAll('.n-tabs-tab')
  expect(tabs.map(tab => tab.text())).toEqual(['结算明细', '复核记录'])
  expect(loadReview).not.toHaveBeenCalled()
  expect(wrapper.get('.excel-table').text()).toContain('000042')

  await tabs[1].trigger('click')
  expect(loadReview).toHaveBeenCalledOnce()
  expect(wrapper.get('.excel-info').text()).toContain('当前工作表: 复核记录')
  expect(wrapper.get('.excel-table').text()).toContain('跨表核对')
  expect(wrapper.get('.excel-table').text()).not.toContain('000042')

  await tabs[0].trigger('click')
  expect(wrapper.get('.excel-table').text()).toContain('000042')
  expect(wrapper.get('.excel-table').text()).not.toContain('跨表核对')
})
