import { flushPromises, mount } from '@vue/test-utils'
import { expect, test, vi } from 'vitest'
import C_Descriptions from '../../src/components/C_Descriptions/index.vue'
import type { DescriptionField } from '../../src/components/C_Descriptions/types'

interface Order {
  code: string
  amount: number
  approved: boolean
  remarks: string | null
}

const order: Order = {
  code: '00091',
  amount: 0,
  approved: false,
  remarks: null,
}
const fields = [
  { key: 'code', label: 'Order number', copyable: true },
  {
    key: 'amount',
    label: 'Amount',
    group: 'Sales',
    format: row => `${row.amount} t`,
  },
  { key: 'approved', label: 'Approved', group: 'Sales' },
  { key: 'remarks', label: 'Remarks', show: row => row.remarks !== null },
] satisfies DescriptionField<Order>[]

test('details derive their display and grouping from the typed record without treating false or zero as missing', async () => {
  const wrapper = mount(C_Descriptions<Order>, {
    props: {
      data: order,
      fields,
      density: 'compact',
      locale: { locale: 'en-US' },
    },
  })
  expect(
    wrapper.findAll('dl').map(group => group.attributes('aria-label'))
  ).toEqual([undefined, 'Sales'])
  expect(wrapper.findAll('dt').map(term => term.text())).toEqual([
    'Order number',
    'Amount',
    'Approved',
  ])
  expect(wrapper.findAll('dd').map(value => value.text())).toEqual([
    '00091',
    '0 t',
    'false',
  ])
  expect(wrapper.classes()).toContain('c-descriptions--compact')

  await wrapper.setProps({
    data: { ...order, remarks: '' },
    emptyText: 'Not supplied',
  })
  expect(wrapper.findAll('dd').map(value => value.text())).toEqual([
    '00091',
    'Not supplied',
    '0 t',
    'false',
  ])
  await wrapper.setProps({ data: null })
  expect(wrapper.get('.c-descriptions__empty').text()).toBe(
    'No details to display'
  )
})

test('copy uses the displayed text and a stale copy request does not announce against a replacement record', async () => {
  let resolveWrite: (() => void) | undefined
  const writeText = vi
    .spyOn(navigator.clipboard, 'writeText')
    .mockImplementationOnce(
      () =>
        new Promise<void>(resolve => {
          resolveWrite = resolve
        })
    )
  const wrapper = mount(C_Descriptions<Order>, {
    props: { data: order, fields, locale: { locale: 'en-US' } },
  })
  const copyButton = () => wrapper.get('button[aria-label="Copy Order number"]')
  await copyButton().trigger('click')
  expect(writeText).toHaveBeenCalledWith('00091')
  await wrapper.setProps({ data: { ...order, code: '00092' } })
  resolveWrite?.()
  await flushPromises()
  expect(wrapper.find('[role="status"]').exists()).toBe(false)

  writeText.mockRejectedValueOnce(new Error('clipboard denied'))
  await copyButton().trigger('click')
  await flushPromises()
  expect(writeText).toHaveBeenLastCalledWith('00092')
  expect(wrapper.get('[role="status"]').text()).toContain(
    'Could not copy Order number'
  )
})
