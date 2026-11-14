import { expect, test } from 'vitest'
import { mount, flushPromises, DOMWrapper } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { NConfigProvider, darkTheme } from 'naive-ui'
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

test('calendar native dialogs follow scoped theme changes while retaining an in-progress edit', async () => {
  const dark = ref(true)
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(
          NConfigProvider,
          {
            theme: dark.value ? darkTheme : null,
            themeOverrides: {
              common: { cardColor: dark.value ? '#263241' : '#fdfcfa' },
            },
          },
          {
            default: () =>
              h(C_FullCalendar, {
                events: [{ id: 'one', title: 'Original', start: '2026-11-14' }],
                config: { initialDate: '2026-11-14', headerToolbar: false },
              }),
          }
        ),
    }),
    { attachTo: document.body }
  )
  await flushPromises()
  await wrapper.get('.fc-daygrid-event').trigger('click')
  await flushPromises()
  const edit = [
    ...document.querySelectorAll<HTMLButtonElement>('.n-dialog button'),
  ].find(button => button.textContent?.trim() === '编辑')!
  edit.click()
  await flushPromises()
  const input = new DOMWrapper(
    document.querySelector<HTMLInputElement>('input[aria-label="事件标题"]')!
  )
  await input.setValue('Unfinished draft')
  dark.value = false
  await flushPromises()
  expect(input.element.value).toBe('Unfinished draft')
  const dialog = input.element.closest<HTMLElement>('.n-dialog')!
  expect(dialog.style.getPropertyValue('--c-theme-bg-card')).toBe('#fdfcfa')
  const save = [...dialog.querySelectorAll<HTMLButtonElement>('button')].find(
    button => button.textContent?.trim() === '保存'
  )!
  save.click()
  await flushPromises()
  expect(wrapper.getComponent(C_FullCalendar).vm.getEvents()[0].title).toBe(
    'Unfinished draft'
  )
  wrapper.unmount()
})
