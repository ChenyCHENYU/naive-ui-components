import { mount } from '@vue/test-utils'
import { expect, test, vi } from 'vitest'
import C_RecordList from '../../src/components/C_RecordList/index.vue'

interface Task {
  id: number
  label: string
  unavailable: boolean
}

test('cards reuse the controlled selection of the list and pass typed records to the actions slot', async () => {
  const items = [
    { id: 11, label: 'Order A', unavailable: false },
    { id: 12, label: 'Order B', unavailable: true },
  ]
  const itemView = vi.fn((task: Task) => ({
    title: task.label,
    disabled: task.unavailable,
  }))
  const wrapper = mount(C_RecordList<Task, number>, {
    props: {
      items,
      itemKey: task => task.id,
      itemView,
      modelValue: null,
      selectable: true,
    },
    slots: {
      actions:
        '<template #default="{ item }">Action for {{ item.id }}</template>',
    },
  })
  const [enabled, disabled] = wrapper.findAll('button')
  expect(disabled?.attributes('disabled')).toBeDefined()
  await disabled?.trigger('click')
  expect(wrapper.emitted('select')).toBeUndefined()
  await enabled?.trigger('click')
  expect(wrapper.emitted('update:modelValue')).toEqual([[11]])
  expect(wrapper.emitted('select')).toEqual([[items[0], 11]])
  expect(wrapper.text()).toContain('Action for 11')

  await wrapper.setProps({ modelValue: 11, layout: 'cards' })
  expect(wrapper.get('ul').classes()).toContain('is-cards')
  expect(enabled?.attributes('aria-pressed')).toBe('true')
  expect(itemView).toHaveBeenCalledTimes(2)
})

test('loading and empty states remain distinct without requiring a source controller', async () => {
  const wrapper = mount(C_RecordList<Task, number>, {
    props: {
      items: [],
      itemKey: task => task.id,
      itemView: task => ({ title: task.label }),
      loading: true,
      locale: { locale: 'en-US' },
    },
  })
  expect(wrapper.attributes('aria-busy')).toBe('true')
  expect(wrapper.get('[role="status"]').text()).toBe('Loading records')
  await wrapper.setProps({ loading: false })
  expect(wrapper.find('[role="status"]').exists()).toBe(false)
  expect(wrapper.text()).toBe('No records')
})
