import { expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, inject, nextTick, ref } from 'vue'
import C_Density from '../../src/components/C_Density/index.vue'
import C_SectionNav from '../../src/components/C_SectionNav/index.vue'
import { FORM_GLOBAL_CONFIG_KEY } from '../../src/context'
import { TABLE_GLOBAL_CONFIG_KEY } from '../../src/components/C_Table/composables/useTableGlobalConfig'

test('nested density is reactive and cannot mutate parent or sibling defaults', async () => {
  const density = ref<'compact' | 'comfortable'>('compact')
  const form = Object.freeze({
    density: 'default' as const,
    size: 'large' as const,
  })
  const table = Object.freeze({
    defaults: Object.freeze({ density: 'default' as const }),
  })
  const Probe = defineComponent({
    setup() {
      const form = inject(FORM_GLOBAL_CONFIG_KEY)!
      const table = inject(TABLE_GLOBAL_CONFIG_KEY)!
      return () =>
        h('span', `${form.density}/${table.defaults?.density}/${form.size}`)
    },
  })
  const Host = defineComponent({
    setup: () => () =>
      h('main', [
        h(
          C_Density,
          { density: density.value },
          {
            default: () => [
              h('div', { class: 'outer' }, h(Probe)),
              h(
                C_Density,
                { density: 'default' },
                { default: () => h('div', { class: 'inner' }, h(Probe)) }
              ),
            ],
          }
        ),
        h('div', { class: 'sibling' }, h(Probe)),
      ]),
  })
  const wrapper = mount(Host, {
    global: {
      provide: {
        [FORM_GLOBAL_CONFIG_KEY as symbol]: form,
        [TABLE_GLOBAL_CONFIG_KEY as symbol]: table,
      },
    },
  })
  expect(wrapper.get('.outer').text()).toBe('compact/compact/large')
  expect(wrapper.get('.inner').text()).toBe('default/default/large')
  expect(wrapper.get('.sibling').text()).toBe('default/default/large')
  density.value = 'comfortable'
  await nextTick()
  expect(wrapper.get('.outer').text()).toBe('comfortable/comfortable/large')
  expect(wrapper.get('.inner').text()).toBe('default/default/large')
  expect(form.density).toBe('default')
  expect(table.defaults.density).toBe('default')
  wrapper.unmount()
})

test('section navigation skips disabled entries without changing selection on focus alone', async () => {
  const wrapper = mount(C_SectionNav, {
    attachTo: document.body,
    props: {
      modelValue: 'header',
      locale: { locale: 'en-US' },
      items: [
        { key: 'header', label: 'Header' },
        { key: 'locked', label: 'Locked', disabled: true },
        { key: 'items', label: 'Items', errorCount: 3 },
      ],
    },
  })
  const buttons = wrapper.findAll('button')
  expect(wrapper.get('nav').attributes('aria-label')).toBe('Document sections')
  expect(buttons[0].attributes('aria-current')).toBe('location')
  await buttons[0].trigger('keydown', { key: 'ArrowDown' })
  expect(document.activeElement).toBe(buttons[2].element)
  expect(wrapper.emitted('select')).toBeUndefined()
  await buttons[2].trigger('click')
  expect(wrapper.emitted('select')?.[0]).toEqual(['items'])
  expect(wrapper.find('.c-section-nav__count').attributes('aria-label')).toBe(
    '3 errors'
  )
  wrapper.unmount()
})
