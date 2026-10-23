import { test, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { NInput, NButton, NSpin } from 'naive-ui'
import C_Chat from '../../src/components/C_Chat/index.vue'

const global = { components: { NInput, NButton, NSpin } }

test('打开最旧的缓存草稿时先恢复目标，不会因保存当前草稿而淘汰它', async () => {
  const contacts = Array.from({ length: 51 }, (_, i) => ({
    id: String(i),
    name: String(i),
  }))
  const wrapper = mount(C_Chat, {
    props: { contacts, currentContactId: '0' },
    global,
  })
  /* eslint-disable no-await-in-loop -- 按实际会话切换顺序填满草稿缓存。 */
  for (let i = 0; i < 50; i++) {
    await wrapper.get('textarea').setValue(`draft ${i}`)
    await wrapper.setProps({ currentContactId: String(i + 1) })
  }
  /* eslint-enable no-await-in-loop */
  await wrapper.get('textarea').setValue('draft 50')
  await wrapper.setProps({ currentContactId: '0' })
  expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe(
    'draft 0'
  )
  await wrapper.setProps({ currentContactId: '50' })
  expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe(
    'draft 50'
  )
})

test('从空会话进入具名会话不携带输入，删除当前联系人后也不恢复旧草稿', async () => {
  const wrapper = mount(C_Chat, { props: { showContacts: false }, global })
  await wrapper.get('textarea').setValue('unassigned')
  await wrapper.setProps({ currentContactId: 'a' })
  expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe(
    ''
  )
  await wrapper.setProps({
    showContacts: true,
    contacts: [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
    ],
  })
  await wrapper.get('textarea').setValue('removed A')
  await wrapper.setProps({
    currentContactId: 'b',
    contacts: [{ id: 'b', name: 'B' }],
  })
  await wrapper.setProps({
    currentContactId: 'a',
    contacts: [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
    ],
  })
  expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe(
    ''
  )
})
