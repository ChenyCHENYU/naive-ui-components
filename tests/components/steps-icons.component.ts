import { expect, test } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { addIcon } from '@iconify/vue'
import Steps from '../../src/components/C_Steps/index.vue'
import Icon from '../../src/components/C_Icon/index.vue'

test('single Iconify names and their i- prefixed forms render the shared real SVG', async () => {
  addIcon('steps-test:approval', {
    width: 24,
    height: 24,
    body: '<path data-steps-icon="approval" fill="currentColor" d="M4 4h16v16H4z"/>',
  })
  const wrapper = mount(Steps, {
    props: {
      steps: [
        { title: 'Iconify', icon: 'steps-test:approval' },
        { title: 'Prefixed', icon: 'i-steps-test:approval' },
      ],
    },
  })
  await flushPromises()
  const icons = wrapper.findAllComponents(Icon)
  expect(icons.map(icon => icon.props('name'))).toEqual([
    'steps-test:approval',
    'steps-test:approval',
  ])
  expect(wrapper.findAll('svg path[data-steps-icon="approval"]')).toHaveLength(
    2
  )
  expect(icons.every(icon => icon.attributes('aria-hidden') === 'true')).toBe(
    true
  )
  expect(icons.every(icon => icon.vm.hasError === false)).toBe(true)
})

test('legacy CSS names and combined classes retain their original elements and the finish check', () => {
  const classes = [
    'legacy-step-icon',
    'fa fa-user',
    'i-mdi:account text-red-500',
  ]
  const wrapper = mount(Steps, {
    props: {
      current: 4,
      steps: [
        ...classes.map(icon => ({ title: icon, icon })),
        { title: 'Finished' },
      ],
    },
  })
  const icons = wrapper.findAll('.step-icon > i')
  expect(icons.map(icon => icon.attributes('class'))).toEqual([
    ...classes,
    'i-mdi:check',
  ])
  expect(icons.every(icon => icon.attributes('aria-hidden') === 'true')).toBe(
    true
  )
  expect(wrapper.findComponent(Icon).exists()).toBe(false)
})

test('custom icons leave controlled current, disabled clicks and non-clickable behavior unchanged', async () => {
  const wrapper = mount(Steps, {
    props: {
      current: 0,
      clickable: true,
      steps: [
        { title: 'First', icon: 'mdi:account' },
        { title: 'Disabled', icon: 'i-mdi:account', disabled: true },
        { title: 'Last', icon: 'legacy-step-icon' },
      ],
    },
  })
  await flushPromises()
  const items = () => wrapper.findAll('.step-item')
  expect(items()[0].attributes('aria-current')).toBe('step')
  await items()[1].trigger('click')
  expect(wrapper.emitted('change')).toBeUndefined()
  await items()[2].trigger('click')
  expect(wrapper.emitted('update:current')).toEqual([[2]])
  expect(wrapper.emitted('change')).toEqual([[2]])
  expect(items()[0].attributes('aria-current')).toBe('step')
  await wrapper.setProps({ current: 2 })
  expect(items()[2].attributes('aria-current')).toBe('step')
  expect(items()[0].classes()).toContain('step-finish')
  await wrapper.setProps({ clickable: false })
  expect(items().every(item => item.element.tagName === 'DIV')).toBe(true)
  await items()[0].trigger('click')
  expect(wrapper.emitted('change')).toEqual([[2]])
})
