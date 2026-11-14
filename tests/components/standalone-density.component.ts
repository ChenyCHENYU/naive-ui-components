import { expect, test } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { NAutoComplete, NForm, NFormItem, NInput, NSelect } from 'naive-ui'
import Density from '../../src/components/C_Density/index.vue'
import Select from '../../src/components/C_Select/index.vue'
import AutoComplete from '../../src/components/C_AutoComplete/index.vue'
import Cascade from '../../src/components/C_Cascade/index.vue'
import City from '../../src/components/C_City/index.vue'
import type { CascadeValue } from '../../src/components/C_Cascade/types'

const options = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
]
const cascadeData = [
  {
    value: 1,
    label: 'One',
    children: [
      {
        value: 2,
        label: 'Two',
        children: [
          { value: 3, label: 'East' },
          { value: 4, label: 'West' },
        ],
      },
    ],
  },
]
const cascadeValue = (): CascadeValue => ({
  primary: { value: 1, label: 'One' },
  secondary: { value: 2, label: 'Two' },
  tertiary: { value: 3, label: 'East' },
})

test('standalone fields follow a changing density scope without losing input or selection', async () => {
  const density = ref<'compact' | 'comfortable'>('compact')
  const selected = ref<string | null>('a')
  const text = ref('Ada')
  const city = ref('杭州市')
  const cascaded = ref(cascadeValue())
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(
          Density,
          { density: density.value },
          {
            default: () => [
              h(Select, {
                modelValue: selected.value,
                options,
                'onUpdate:modelValue': value => {
                  selected.value = typeof value === 'string' ? value : null
                },
              }),
              h(AutoComplete, {
                modelValue: text.value,
                options: ['Ada', 'Alice'],
                'onUpdate:modelValue': value => {
                  text.value = value
                },
              }),
              h(Cascade, {
                modelValue: cascaded.value,
                data: cascadeData,
                'onUpdate:modelValue': value => {
                  cascaded.value = value
                },
              }),
              h(City, {
                modelValue: city.value,
                'onUpdate:modelValue': value => {
                  city.value = value
                },
              }),
            ],
          }
        ),
    })
  )
  const select = wrapper.getComponent(Select).getComponent(NSelect)
  const auto = wrapper.getComponent(AutoComplete).getComponent(NAutoComplete)
  const cascade = wrapper.getComponent(Cascade)
  const trigger = wrapper
    .getComponent(City)
    .get<HTMLElement>('.city-selector-trigger')
  expect(select.props('size')).toBe('small')
  expect(auto.props('size')).toBe('small')
  expect(
    cascade
      .findAllComponents(NSelect)
      .every(item => item.props('size') === 'small')
  ).toBe(true)
  expect(trigger.element.style.getPropertyValue('--c-city-height')).toContain(
    'height-small'
  )

  select.vm.$emit('update:value', 'b')
  await wrapper.getComponent(AutoComplete).get('input').setValue('Ada draft')
  cascade.findAllComponents(NSelect)[2].vm.$emit('update:value', 4)
  await nextTick()
  const input = wrapper.getComponent(AutoComplete).get('input').element
  density.value = 'comfortable'
  await nextTick()
  expect(select.props('size')).toBe('large')
  expect(auto.props('size')).toBe('large')
  expect(
    cascade.findAllComponents(NSelect).map(item => item.props('size'))
  ).toEqual(['large', 'large', 'large'])
  expect(trigger.element.style.getPropertyValue('--c-city-height')).toContain(
    'height-large'
  )
  expect(select.props('value')).toBe('b')
  expect(
    wrapper.getComponent(AutoComplete).get<HTMLInputElement>('input').element
      .value
  ).toBe('Ada draft')
  expect(wrapper.getComponent(AutoComplete).get('input').element).toBe(input)
  expect(
    cascade.findAllComponents(NSelect).map(item => item.props('value'))
  ).toEqual([1, 2, 4])
  expect(trigger.text()).toBe('杭州市')
})

test.each(['compact', 'comfortable'] as const)(
  'explicit sizes stay authoritative in a %s scope',
  scope => {
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(
            Density,
            { density: scope },
            {
              default: () => [
                h(Select, { size: 'medium', options }),
                h(AutoComplete, { size: 'medium', options: ['Ada'] }),
                h(Cascade, { size: 'medium', data: cascadeData }),
                h(City, { size: 'medium', modelValue: '杭州市' }),
              ],
            }
          ),
      })
    )
    expect(
      wrapper.getComponent(Select).getComponent(NSelect).props('size')
    ).toBe('medium')
    expect(wrapper.getComponent(NAutoComplete).props('size')).toBe('medium')
    expect(
      wrapper
        .getComponent(Cascade)
        .findAllComponents(NSelect)
        .map(item => item.props('size'))
    ).toEqual(['medium', 'medium', 'medium'])
    expect(
      wrapper
        .get<HTMLElement>('.city-selector-trigger')
        .element.style.getPropertyValue('--c-city-height')
    ).toContain('height-medium')
  }
)

test('without a density scope native controls continue inheriting the surrounding FormItem size', async () => {
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(
          NForm,
          { size: 'large' },
          {
            default: () =>
              h(
                NFormItem,
                { label: 'Fields' },
                {
                  default: () => [
                    h(Select, { modelValue: 'a', options }),
                    h(AutoComplete, { modelValue: 'Ada', options: ['Ada'] }),
                    h(Cascade, {
                      modelValue: cascadeValue(),
                      data: cascadeData,
                    }),
                    h(City, { modelValue: '杭州市' }),
                  ],
                }
              ),
          }
        ),
    }),
    { attachTo: document.body }
  )
  expect(
    wrapper
      .findAllComponents(NSelect)
      .every(item => item.props('size') === undefined)
  ).toBe(true)
  expect(wrapper.getComponent(NAutoComplete).props('size')).toBeUndefined()
  expect(
    wrapper.getComponent(AutoComplete).getComponent(NInput).attributes('style')
  ).toContain('--n-height: 40px')
  for (const input of wrapper.findAll('.n-base-selection'))
    expect(
      (input.element as HTMLElement).style.getPropertyValue('--n-height')
    ).toBe('40px')

  await wrapper.get('.city-selector-trigger').trigger('click')
  await flushPromises()
  const nativeCitySearch = wrapper.getComponent(City).getComponent(NSelect)
  expect(nativeCitySearch.props('size')).toBeUndefined()
  expect(
    nativeCitySearch
      .get<HTMLElement>('.n-base-selection')
      .element.style.getPropertyValue('--n-height')
  ).toBe('40px')
})
