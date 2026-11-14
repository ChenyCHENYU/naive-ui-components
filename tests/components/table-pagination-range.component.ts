import { flushPromises, mount } from '@vue/test-utils'
import { expect, test } from 'vitest'
import C_Table from '../../src/components/C_Table/index.vue'

test('native pagination renders inclusive first/last ranges and a real empty state', async () => {
  const wrapper = mount(C_Table<{ id: number }>, {
    props: {
      data: Array.from({ length: 12 }, (_, id) => ({ id })),
      columns: [{ key: 'id', title: '编号' }],
      config: { toolbar: { show: false }, pagination: { pageSize: 10 } },
    },
    global: { stubs: { C_Icon: true } },
  })
  try {
    await flushPromises()
    expect(wrapper.get('.pagination-wrapper').text()).toContain('第 1-10 条')
    const second = wrapper
      .findAll('.n-pagination-item')
      .find(item => item.text() === '2')!
    await second.trigger('click')
    await flushPromises()
    expect(wrapper.get('.pagination-wrapper').text()).toContain('第 11-12 条')
    expect(wrapper.findAll('tbody > tr')).toHaveLength(2)
    await wrapper.setProps({ data: [] })
    await flushPromises()
    expect(wrapper.get('.pagination-wrapper').text()).toContain('暂无数据')
  } finally {
    wrapper.unmount()
  }
})
