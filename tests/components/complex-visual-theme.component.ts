import { expect, test } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import {
  NButton,
  NCheckbox,
  NConfigProvider,
  NInput,
  NSpin,
  NPopover,
  NTooltip,
  NScrollbar,
  NSkeleton,
  NTag,
  NAvatar,
  darkTheme,
} from 'naive-ui'
import Chat from '../../src/components/C_Chat/index.vue'
import Transfer from '../../src/components/C_Transfer/index.vue'
import WaterFall from '../../src/components/C_WaterFall/index.vue'
import Workflow from '../../src/components/C_WorkFlow/index.vue'
import NotificationCenter from '../../src/components/C_NotificationCenter/index.vue'
import Icon from '../../src/components/C_Icon/index.vue'
import { COMPONENT_COLOR_PALETTES } from '../../src/core/theme'

const native = {
  NButton,
  NInput,
  NSpin,
  NPopover,
  NTooltip,
  NScrollbar,
  NSkeleton,
  NTag,
  NAvatar,
}
const transferProps = { data: [{ key: 1, label: '成员' }], modelValue: [] }
const variable = (element: Element, name: string) =>
  (element as HTMLElement).style.getPropertyValue(name)

test('self-drawn complex surfaces follow their nearest Provider without defining public theme overrides', async () => {
  const dark = ref(true)
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h('div', [
          h(
            NConfigProvider,
            {
              theme: dark.value ? darkTheme : undefined,
              themeOverrides: {
                common: {
                  cardColor: dark.value ? '#121314' : '#f1f2f3',
                  primaryColor: '#cc2244',
                },
              },
            },
            () => [
              h(Chat, { showContacts: false }),
              h(Transfer, transferProps),
              h(WaterFall, { items: [] }),
              h(
                NConfigProvider,
                {
                  theme: null,
                  themeOverrides: {
                    common: { cardColor: '#ffffff', primaryColor: '#2255aa' },
                  },
                },
                () =>
                  h(Transfer, { ...transferProps, class: 'nested-transfer' })
              ),
            ]
          ),
          h(Transfer, {
            ...transferProps,
            class: 'outside-transfer',
            style: { '--c-primary': '#123456', '--tf-accent': '#abcdef' },
          }),
        ]),
    }),
    { global: { components: native } }
  )
  await flushPromises()
  for (const selector of [
    '.c-chat',
    '.c-waterfall',
    '.c-transfer:not(.nested-transfer):not(.outside-transfer)',
  ]) {
    const surface = wrapper.get(selector).element
    expect(variable(surface, '--c-theme-bg-card')).toBe('#121314')
    expect(variable(surface, '--c-theme-primary')).toBe('#cc2244')
    expect(variable(surface, '--c-primary')).toBe('')
  }
  expect(
    variable(wrapper.get('.nested-transfer').element, '--c-theme-bg-card')
  ).toBe('#ffffff')
  expect(
    variable(wrapper.get('.nested-transfer').element, '--c-theme-primary')
  ).toBe('#2255aa')
  expect(
    variable(wrapper.get('.outside-transfer').element, '--c-primary')
  ).toBe('#123456')
  expect(
    variable(wrapper.get('.outside-transfer').element, '--tf-accent')
  ).toBe('#abcdef')
  dark.value = false
  await flushPromises()
  expect(variable(wrapper.get('.c-chat').element, '--c-theme-bg-card')).toBe(
    '#f1f2f3'
  )
  expect(
    variable(wrapper.get('.nested-transfer').element, '--c-theme-bg-card')
  ).toBe('#ffffff')
  wrapper.unmount()
})

test.each(['small', 'medium', 'large'] as const)(
  'Transfer %s keeps filters, header checks and row checks in its declared size',
  size => {
    const wrapper = mount(Transfer, {
      props: { ...transferProps, size, filterable: true },
    })
    expect(
      wrapper.findAllComponents(NInput).map(control => control.props('size'))
    ).toEqual([size, size])
    expect(
      wrapper.findAllComponents(NCheckbox).map(control => control.props('size'))
    ).toEqual([size, size, size])
    wrapper.unmount()
  }
)

test('workflow Teleport retains explicit dark mode, semantic overrides and readable text without copying layout styles', async () => {
  const wrapper = mount(Workflow, {
    props: { theme: 'dark' },
    attrs: { style: { '--c-primary': '#e11d48', width: '900px' } },
    attachTo: document.body,
  })
  await flushPromises()
  expect(
    wrapper.get('.start-node .node-icon').getComponent(Icon).props('name')
  ).toBe('mdi:play-circle-outline')
  await wrapper.get('.start-node .add-node-btn').trigger('click')
  const menu = document.querySelector<HTMLElement>('.add-node-menu')!
  expect(menu.style.color).toBe('var(--workflow-text)')
  expect(variable(menu, '--c-theme-bg-card')).toBe(
    COMPONENT_COLOR_PALETTES.dark.bgCard
  )
  expect(variable(menu, '--c-primary')).toBe('#e11d48')
  expect(menu.style.width).toBe('')
  wrapper.unmount()
})

test('notification popup carries the local Provider palette and explicit semantic colors through Teleport', async () => {
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(
          NConfigProvider,
          {
            theme: darkTheme,
            themeOverrides: {
              common: { cardColor: '#151719', popoverColor: '#202426' },
            },
          },
          () =>
            h(NotificationCenter, {
              autoStart: false,
              pollingInterval: 0,
              style: { '--c-primary': '#f472b6', width: '200px' },
            })
        ),
    }),
    { attachTo: document.body, global: { components: native } }
  )
  await wrapper.get('button.notification-badge__trigger').trigger('click')
  await flushPromises()
  const panel = document.querySelector<HTMLElement>(
    '.c-notification-center__panel'
  )!
  expect(variable(panel, '--c-theme-bg-card')).toBe('#151719')
  expect(variable(panel, '--c-theme-bg-surface')).toBe('#202426')
  expect(variable(panel, '--c-primary')).toBe('#f472b6')
  expect(panel.style.width).toBe('')
  wrapper.unmount()
})

test('explicit chat bubble styles still override defaults and message interaction remains intact', async () => {
  const wrapper = mount(Chat, {
    props: {
      showContacts: false,
      messages: [
        {
          id: 'self',
          type: 'text',
          sender: 'self',
          content: '已完成审批',
          timestamp: Date.now(),
        },
      ],
    },
    attrs: {
      style: {
        '--chat-bubble-self': 'hsl(220 40% 20%)',
        '--chat-text-self': 'rgb(240, 245, 255)',
      },
    },
    global: { components: native },
  })
  expect(wrapper.get('.c-chat__bubble').text()).toBe('已完成审批')
  expect(variable(wrapper.element, '--chat-bubble-self')).toBe(
    'hsl(220 40% 20%)'
  )
  expect(variable(wrapper.element, '--chat-text-self')).toBe(
    'rgb(240, 245, 255)'
  )
  await wrapper.get('textarea').setValue('下一步')
  await wrapper.get('.c-chat__send-btn').trigger('click')
  expect(wrapper.emitted('send')).toEqual([['下一步']])
  wrapper.unmount()
})
