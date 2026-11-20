import { mount } from '@vue/test-utils'
import { expect, test } from 'vitest'
import C_Transfer from '../../src/components/C_Transfer/index.vue'
import type {
  TransferColumn,
  TransferItem,
} from '../../src/components/C_Transfer/types'

interface Device extends TransferItem {
  code: string
  organization: string[]
}

const devices: Device[] = [
  { key: 1, label: '成品秤', code: 'A-001', organization: ['华东', '一厂'] },
  {
    key: '1',
    label: '入口秤',
    code: 'A-002',
    organization: ['华东', '二厂'],
    disabled: true,
  },
  { key: 2, label: '出库秤', code: 'B-001', organization: ['华西', '一厂'] },
]
const columns: TransferColumn<Device>[] = [
  {
    key: 'code',
    title: '编号',
    width: 90,
    format: row => row.code.toLowerCase(),
  },
  { key: 'label', title: '设备' },
]

test('表格穿梭共用源与目标的字段筛选、禁用状态和受控移动', async () => {
  const wrapper = mount(C_Transfer<Device>, {
    props: { data: devices, columns, filterable: true, modelValue: [2] },
  })
  try {
    const source = wrapper.get('[role="table"][aria-label="可选列表"]')
    const target = wrapper.get('[role="table"][aria-label="已选列表"]')
    expect(
      source.findAll('[role="columnheader"]').map(cell => cell.text())
    ).toEqual(['', '编号', '设备'])
    expect(target.get('.c-transfer__item').text()).toContain('b-001')
    const filter = wrapper.get('input[aria-label="搜索可选列表"]')
    await filter.setValue('a-002')
    await source.get('.c-transfer__item').trigger('click')
    expect(
      wrapper.get('[aria-label="移至已选列表"]').attributes('disabled')
    ).toBeDefined()
    await filter.setValue('a-001')
    await source.get('.c-transfer__item').trigger('click')
    await wrapper.get('[aria-label="移至已选列表"]').trigger('click')
    expect(wrapper.emitted('change')).toEqual([[[2, 1], 'right', [1]]])
    await wrapper.setProps({ modelValue: [2, 1] })
    expect(target.findAll('.c-transfer__item').map(row => row.text())).toEqual([
      'b-001出库秤',
      'a-001成品秤',
    ])
  } finally {
    wrapper.unmount()
  }
})

test('按路径分组的来源可折叠，搜索临时展开，目标保持自己的受控顺序', async () => {
  const wrapper = mount(C_Transfer<Device>, {
    props: {
      data: devices,
      modelValue: [],
      filterable: true,
      groupBy: device => device.organization,
    },
  })
  try {
    const filter = wrapper.get('input[aria-label="搜索可选列表"]')
    const group = wrapper
      .findAll('.c-transfer__group-row button')
      .find(button => button.text() === '华东')!
    await group.trigger('click')
    expect(group.attributes('aria-expanded')).toBe('false')
    expect(wrapper.findAll('.c-transfer__item').map(row => row.text())).toEqual(
      ['出库秤']
    )
    await filter.setValue('成品秤')
    expect(
      wrapper.findAll('.c-transfer__group-row').map(row => row.text())
    ).toEqual(['华东', '一厂'])
    expect(wrapper.get('.c-transfer__item').text()).toBe('成品秤')
    await filter.setValue('no match')
    await filter.setValue('')
    expect(wrapper.findAll('.c-transfer__item').map(row => row.text())).toEqual(
      ['出库秤']
    )
    await filter.setValue('华东')
    await wrapper.findAll('.c-transfer__item')[0].trigger('click')
    await wrapper.get('[aria-label="移至已选列表"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([[[1]]])
    await wrapper.setProps({ modelValue: [2, 1] })
    const target = wrapper.findAll('.c-transfer__panel')[1]
    expect(target.findAll('.c-transfer__group-row')).toHaveLength(0)
    expect(
      target.findAll('.c-transfer__item').map(item => item.text())
    ).toEqual(['出库秤', '成品秤'])
  } finally {
    wrapper.unmount()
  }
})
