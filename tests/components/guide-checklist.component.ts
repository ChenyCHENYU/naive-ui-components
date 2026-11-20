import { flushPromises, mount } from '@vue/test-utils'
import { expect, test, vi } from 'vitest'
import C_Guide from '../../src/components/C_Guide/index.vue'
import type { GuideStep } from '../../src/components/C_Guide/types'

const steps: GuideStep[] = [
  {
    id: 'open',
    popover: { title: 'Open the plan', description: 'Find the plan' },
  },
  {
    id: 'find',
    action: 'found',
    popover: { title: 'Find a record', description: 'Run the query' },
  },
  {
    id: 'save',
    action: 'saved',
    popover: { title: 'Save changes', description: 'Save the record' },
  },
]

test('the checklist resumes a named step and only the matching business operation advances it', async () => {
  const wrapper = mount(C_Guide, {
    props: { steps, animate: false, checklist: { completedIds: ['open'] } },
    attachTo: document.body,
  })
  const driverTitle = () =>
    document.querySelector('.driver-popover-title')?.textContent
  const nextButton = () =>
    document.querySelector<HTMLButtonElement>('.driver-popover-next-btn')
  const [open, find] = wrapper.findAll('li button')
  expect(open?.text()).toContain('已完成')
  expect(wrapper.get('[role="status"]').text()).toBe('已完成 1 / 3 项')
  await find?.trigger('click')
  await vi.waitFor(() => expect(driverTitle()).toBe('Find a record'))
  expect(nextButton()?.disabled).toBe(true)
  nextButton()?.click()
  expect(driverTitle()).toBe('Find a record')
  expect(wrapper.vm.completeAction('saved')).toBe(false)
  expect(wrapper.vm.completeAction('found')).toBe(true)
  await flushPromises()
  expect(driverTitle()).toBe('Save changes')
  expect(wrapper.vm.completeAction('found')).toBe(false)
  expect(wrapper.vm.completeAction('saved')).toBe(true)
  await flushPromises()
  expect(wrapper.emitted('complete')).toHaveLength(1)
  expect(wrapper.vm.completeAction('saved')).toBe(false)
  await wrapper.setProps({
    checklist: { completedIds: ['open', 'find', 'save'] },
  })
  expect(wrapper.get('[role="status"]').text()).toBe('已完成 3 / 3 项')
})
