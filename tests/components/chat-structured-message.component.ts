import { mount } from '@vue/test-utils'
import { expect, test } from 'vitest'
import { h } from 'vue'
import C_Chat from '../../src/components/C_Chat/index.vue'
import type { ChatMessage } from '../../src/components/C_Chat/types'

test('a typed message slot can render business data while the default content and source actions still work', async () => {
  const ordinary: ChatMessage = {
    id: 'plain',
    sender: 'self',
    type: 'text',
    content: 'Please check the order',
    timestamp: 1000,
  }
  const assistant: ChatMessage = {
    id: 'assistant',
    sender: 'other',
    type: 'text',
    content: 'Found one order',
    timestamp: 2000,
    activities: [
      {
        id: 'lookup',
        title: 'Find order',
        status: 'succeeded',
        detail: '1 result',
      },
    ],
    sources: [{ id: 'so-021', label: 'Order register' }],
  }
  const orders = new Map([[assistant.id, 'SO-021']])
  const wrapper = mount(C_Chat, {
    props: { showContacts: false, messages: [ordinary, assistant] },
    slots: {
      message: ({ message }) =>
        orders.has(message.id)
          ? h('strong', `Order ${orders.get(message.id)}`)
          : [],
    },
  })
  expect(wrapper.get('[data-message-id="plain"] .c-chat__bubble').text()).toBe(
    ordinary.content
  )
  expect(wrapper.get('[data-message-id="assistant"] strong').text()).toBe(
    'Order SO-021'
  )
  const [activity, sources] = wrapper.findAll('details')
  expect(activity?.get('[data-status="succeeded"]').text()).toBe('已完成')
  await sources?.get('button').trigger('click')
  expect(wrapper.emitted('source-click')).toEqual([
    [assistant.sources?.[0], assistant],
  ])
})
