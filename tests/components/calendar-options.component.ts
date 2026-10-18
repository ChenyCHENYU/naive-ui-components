import { expect, test } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import C_FullCalendar from '../../src/components/C_FullCalendar/index.vue'

test('changing filtered events retains an active calendar event source and custom callbacks', async () => {
  const wrapper = mount(C_FullCalendar, {
    attachTo: document.body,
    props: {
      events: [
        { id: 'one', title: 'One', start: '2026-10-18' },
        { id: 'two', title: 'Two', start: '2026-10-19' },
      ],
      config: { headerToolbar: false, initialDate: '2026-10-18' },
    },
  })
  await flushPromises()
  expect(wrapper.vm.getApi()!.getEvents()).toHaveLength(2)
  await wrapper.setProps({
    events: [{ id: 'two', title: 'Two', start: '2026-10-19' }],
  })
  await flushPromises()
  expect(
    wrapper.vm
      .getApi()!
      .getEvents()
      .map(event => event.id)
  ).toEqual(['two'])
  expect(wrapper.vm.getApi()!.getEventSources()).toHaveLength(1)
  await wrapper.setProps({
    editable: false,
    config: { headerToolbar: false, weekends: false },
  })
  await flushPromises()
  expect(wrapper.vm.getApi()!.getEvents()).toHaveLength(1)
  wrapper.unmount()
})
