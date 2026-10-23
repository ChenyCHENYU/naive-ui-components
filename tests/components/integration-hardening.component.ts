import { expect, test } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import C_CollapsePanel from '../../src/components/C_CollapsePanel/index.vue'

test('受控折叠面板原地追加键也渲染懒内容', async () => {
  const keys = ref<string[]>([])
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(C_CollapsePanel, {
          items: [{ key: 'a', title: 'A', lazy: true, content: 'Lazy body' }],
          activeKeys: keys.value,
        }),
    })
  )
  expect(wrapper.text()).not.toContain('Lazy body')
  keys.value.push('a')
  await nextTick()
  expect(wrapper.text()).toContain('Lazy body')
})

import {
  NMenu,
  NInput,
  NButton,
  NTooltip,
  NDropdown,
  NPopover,
  NScrollbar,
  NTag,
  NAvatar,
  NSkeleton,
  NSpin,
} from 'naive-ui'
import C_Menu from '../../src/components/C_Menu/index.vue'
import C_Chat from '../../src/components/C_Chat/index.vue'
import C_Tree from '../../src/components/C_Tree/index.vue'
import C_Transfer from '../../src/components/C_Transfer/index.vue'
import C_SplitPane from '../../src/components/C_SplitPane/index.vue'
import C_Theme from '../../src/components/C_Theme/index.vue'
import C_Skeleton from '../../src/components/C_Skeleton/index.vue'
import C_Timeline from '../../src/components/C_Timeline/index.vue'
import C_NotificationCenter from '../../src/components/C_NotificationCenter/index.vue'
import { useNotificationCore } from '../../src/components/C_NotificationCenter/composables/useNotificationCore'
import { COMPONENT_LOCALE_KEY } from '../../src/context'
import type { ComponentLocale } from '../../src/core/contracts'

const components = {
  NMenu,
  NInput,
  NButton,
  NTooltip,
  NDropdown,
  NPopover,
  NScrollbar,
  NTag,
  NAvatar,
  NSkeleton,
  NSpin,
}

test('原生菜单的数字0、数字父键及字符串同名键保持身份', async () => {
  const value = ref<string | number | null>(null)
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(C_Menu, {
          modelValue: value.value,
          options: [
            {
              key: 10,
              label: 'Parent',
              children: [
                { key: 0, label: 'Zero' },
                { key: '0', label: 'String zero' },
              ],
            },
          ],
          'onUpdate:modelValue': key => {
            value.value = key
          },
        }),
    }),
    { global: { components } }
  )
  const native = wrapper.getComponent(NMenu)
  native.vm.$emit('update:value', 0)
  await nextTick()
  expect(value.value).toBe(0)
  expect(native.props('expandedKeys')).toContain(10)
  expect(native.props('value')).toBe(0)
  native.vm.$emit('update:value', '0')
  await nextTick()
  expect(value.value).toBe('0')
  expect(native.props('value')).toBe('0')
})

test('聊天草稿跟随联系人，删除联系人清理草稿，发送只清理当前草稿', async () => {
  const contacts = [
    { id: 'a', name: 'A' },
    { id: 'b', name: 'B' },
  ]
  const wrapper = mount(C_Chat, {
    props: { contacts, currentContactId: 'a' },
    global: { components },
  })
  await wrapper.get('textarea').setValue('for A')
  await wrapper.setProps({ currentContactId: 'b' })
  expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe(
    ''
  )
  await wrapper.get('textarea').setValue('for B')
  await wrapper.setProps({ currentContactId: 'a' })
  expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe(
    'for A'
  )
  await wrapper.get('.c-chat__send-btn').trigger('click')
  expect(wrapper.emitted('send')).toEqual([['for A']])
  await wrapper.setProps({ contacts: [contacts[0]] })
  await wrapper.setProps({ contacts, currentContactId: 'b' })
  expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe(
    ''
  )
})

test('聊天长期切换只保留最近50个非空草稿', async () => {
  const contacts = Array.from({ length: 52 }, (_, i) => ({
    id: String(i),
    name: String(i),
  }))
  const wrapper = mount(C_Chat, {
    props: { contacts, currentContactId: '0' },
    global: { components },
  })
  // 会话切换必须逐次提交到视图，不能并发改变同一实例。
  /* eslint-disable no-await-in-loop */
  for (let i = 0; i < 51; i++) {
    await wrapper.get('textarea').setValue(`draft ${i}`)
    await wrapper.setProps({ currentContactId: String(i + 1) })
  }
  /* eslint-enable no-await-in-loop */
  await wrapper.setProps({ currentContactId: '0' })
  expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe(
    ''
  )
  await wrapper.setProps({ currentContactId: '50' })
  expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe(
    'draft 50'
  )
})

test('通用控件内置文案响应应用语言，同时保留显式业务文案', async () => {
  const locale = ref<ComponentLocale>({ locale: 'en-US' })
  const host = defineComponent({
    setup: () => () =>
      h('div', [
        h(C_Tree, { data: [], addText: 'Add department' }),
        h(C_Transfer, {
          data: [],
          modelValue: [],
          titles: ['My source', 'My target'] as const,
        }),
        h(C_SplitPane),
        h(C_Theme),
        h(C_Skeleton),
        h(C_Timeline, { items: [], pending: true }),
      ]),
  })
  // Context 使用响应式对象；此处 getter 保持与应用 provide 契约一致。
  const config = {
    get locale() {
      return locale.value.locale
    },
  }
  const wrapper = mount(host, {
    global: {
      components,
      provide: { [COMPONENT_LOCALE_KEY as symbol]: config },
    },
  })
  expect(wrapper.text()).toContain('Expand all')
  expect(wrapper.text()).toContain('Add department')
  expect(wrapper.text()).toContain('My source')
  expect(wrapper.get('[role="separator"]').attributes('aria-label')).toBe(
    'Resize panels'
  )
  expect(wrapper.get('.c-skeleton').attributes('aria-label')).toBe('Loading')
  locale.value = { locale: 'zh-CN' }
  await nextTick()
  expect(wrapper.text()).toContain('展开全部')
  expect(wrapper.text()).toContain('Add department')
  expect(wrapper.get('[role="separator"]').attributes('aria-label')).toBe(
    '调整面板大小'
  )
})

test('通知预览保留内置协议并允许类别标签、业务筛选和操作插槽', async () => {
  const core = useNotificationCore({ autoStart: false })
  await core.fetchMessages(true)
  const wrapper = mount(C_NotificationCenter, {
    props: {
      controller: core,
      categoryOptions: [{ key: 'all', label: 'Inbox' }],
    },
    global: {
      components,
      provide: { [COMPONENT_LOCALE_KEY as symbol]: { locale: 'en-US' } },
    },
    slots: {
      filters: ({ controller }) =>
        h(
          'p',
          { class: 'business-filter' },
          `Business filter ${controller.unreadCount.value}`
        ),
      'item-actions': ({ message, read, busy }) =>
        h(
          'button',
          { class: 'business-read', disabled: busy, onClick: read },
          `Read ${message.id}`
        ),
    },
    attachTo: document.body,
  })
  core.popoverVisible.value = true
  await nextTick()
  await flushPromises()
  expect(document.body.textContent).toContain('Notification center')
  expect(document.body.textContent).toContain('Inbox')
  expect(document.body.textContent).toContain('Business filter')
  const target = core.messages.value[0]
  const button = document.querySelector<HTMLButtonElement>('.business-read')!
  button.click()
  await flushPromises()
  expect(core.messages.value.find(item => item.id === target.id)?.status).toBe(
    'read'
  )
  wrapper.unmount()
  core.dispose()
})
