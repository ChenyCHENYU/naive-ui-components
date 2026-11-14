import { afterEach, expect, test } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import {
  NButton,
  NCheckbox,
  NConfigProvider,
  NDataTable,
  NInput,
  NSkeleton,
  NSelect,
  NRadio,
  NRadioButton,
  NRadioGroup,
  NSwitch,
  NTabPane,
  NTabs,
} from 'naive-ui'
import { readFileSync } from 'node:fs'
import { compileString } from 'sass'
import Skeleton from '../../src/components/C_Skeleton/index.vue'
import { createComponentTheme } from '../../src/adapters/naive/theme'
import { COMPONENT_COLOR_PALETTES } from '../../src/core/theme'
import { useComponentTheme } from '../../src/composables/useComponentTheme'

const styles: HTMLStyleElement[] = []
function skeletonStyles() {
  const style = document.createElement('style')
  style.textContent = compileString(
    readFileSync('src/components/C_Skeleton/index.scss', 'utf8')
  ).css
  document.head.append(style)
  styles.push(style)
}
afterEach(() => styles.splice(0).forEach(style => style.remove()))

/** Compare real DOM color values despite Naive serializing composites as rgba(). */
function expectColor(actual: string, expected: string) {
  const channels = (value: string) => {
    if (/^#[\da-f]{6}$/i.test(value))
      return [1, 3, 5]
        .map(offset => Number.parseInt(value.slice(offset, offset + 2), 16))
        .concat(1)
    const parsed = (value.match(/[\d.]+/g) ?? []).map(Number)
    return parsed.length === 3 ? [...parsed, 1] : parsed
  }
  expect(channels(actual)).toEqual(channels(expected))
}

test.each(['light', 'dark'] as const)(
  '%s global semantic colors reach native control surfaces and custom skeletons',
  async mode => {
    skeletonStyles()
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(
            NConfigProvider,
            createComponentTheme({
              mode,
              primary: '#ffff00',
              onSolid: '#000000',
              warning: '#101010',
              bgCard: '#223344',
              bgMuted: '#334455',
              bgHover: '#445566',
              bgActive: '#556677',
              skeletonBg: '#667788',
              text2: '#aabbcc',
              text3: '#bbccdd',
              text4: '#ccddee',
              border: '#778899',
            }),
            () => [
              h(NInput, { class: 'native-input' }),
              h(NInput, { class: 'disabled-input', disabled: true }),
              h(NInput, { class: 'borderless-input', bordered: false }),
              h(NSelect, {
                class: 'native-select',
                options: [{ label: 'Ada', value: 1 }],
                value: 1,
              }),
              h(NSelect, {
                class: 'disabled-select',
                disabled: true,
                options: [{ label: 'Ada', value: 1 }],
                value: 1,
              }),
              h(NSelect, {
                class: 'borderless-select',
                bordered: false,
                options: [],
              }),
              h(
                NButton,
                { class: 'native-button', tertiary: true },
                () => 'Neutral'
              ),
              h(
                NButton,
                { class: 'brand-button', type: 'primary' },
                () => 'Brand'
              ),
              h(
                NButton,
                {
                  class: 'disabled-brand-button',
                  type: 'primary',
                  disabled: true,
                },
                () => 'Disabled brand'
              ),
              h(
                NButton,
                { class: 'warning-button', type: 'warning' },
                () => 'Warn'
              ),
              h(NDataTable, {
                class: 'native-table',
                columns: [{ key: 'name', title: 'Name' }],
                data: [{ key: 1, name: 'Ada' }],
                striped: true,
              }),
              h(
                NTabs,
                { class: 'native-tabs', type: 'segment', value: 'one' },
                () => h(NTabPane, { name: 'one', tab: 'One' }, () => 'Content')
              ),
              h(NSkeleton, { class: 'native-skeleton', animated: false }),
              h(Skeleton, { class: 'custom-skeleton', animation: false }),
            ]
          ),
      }),
      { attachTo: document.body }
    )
    await flushPromises()
    const style = (selector: string, name: string) =>
      wrapper.get<HTMLElement>(selector).element.style.getPropertyValue(name)
    expectColor(style('.native-input', '--n-color'), '#223344')
    expectColor(style('.native-input', '--n-text-color'), '#aabbcc')
    expect(style('.native-input', '--n-border')).toBe('1px solid #778899')
    expect(style('.disabled-input', '--n-border-disabled')).toBe(
      '1px solid #778899'
    )
    expect(style('.native-select .n-base-selection', '--n-border')).toBe(
      '1px solid #778899'
    )
    expect(style('.disabled-select .n-base-selection', '--n-border')).toBe(
      '1px solid #778899'
    )
    expect(wrapper.find('.native-input .n-input__border').exists()).toBe(true)
    expect(wrapper.find('.borderless-input .n-input__border').exists()).toBe(
      false
    )
    expect(
      wrapper.find('.native-select .n-base-selection__border').exists()
    ).toBe(true)
    expect(
      wrapper.find('.borderless-select .n-base-selection__border').exists()
    ).toBe(false)
    expectColor(style('.disabled-input', '--n-color-disabled'), '#334455')
    expectColor(style('.native-button', '--n-color'), '#334455')
    expectColor(style('.native-button', '--n-color-hover'), '#445566')
    expectColor(style('.native-button', '--n-color-pressed'), '#556677')
    expectColor(style('.brand-button', '--n-text-color'), '#000000')
    expectColor(
      style('.disabled-brand-button', '--n-text-color-disabled'),
      '#000000'
    )
    expect(
      wrapper.get<HTMLButtonElement>('.disabled-brand-button').element.disabled
    ).toBe(true)
    expectColor(style('.warning-button', '--n-text-color'), '#000000')
    expectColor(style('.native-table', '--n-td-color'), '#223344')
    expectColor(style('.native-table', '--n-th-color'), '#334455')
    expectColor(style('.native-table', '--n-td-color-hover'), '#445566')
    expectColor(style('.native-table', '--n-td-color-striped'), '#334455')
    expectColor(style('.native-tabs', '--n-color-segment'), '#334455')
    expectColor(style('.native-tabs', '--n-tab-color-segment'), '#223344')
    expectColor(style('.native-skeleton', '--n-color-start'), '#667788')
    expect(style('.custom-skeleton', '--c-theme-skeleton-bg')).toBe('#667788')
    expectColor(
      getComputedStyle(
        wrapper.get('.custom-skeleton .c-skeleton__item').element
      ).backgroundColor,
      getComputedStyle(wrapper.get('.native-skeleton').element).backgroundColor
    )
  }
)

test.each(['light', 'dark'] as const)(
  '%s filled controls use white foregrounds while text and ghost buttons retain their semantic color',
  async mode => {
    const foreground = ref('#ffffff')
    const types = ['primary', 'success', 'warning', 'error', 'info'] as const
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(
            NConfigProvider,
            createComponentTheme({
              mode,
              primary: '#409eff',
              onSolid: foreground.value,
            }),
            () => [
              ...types.map(type =>
                h(
                  NButton,
                  { class: `solid-${type}`, type },
                  {
                    default: () => type,
                    icon: () =>
                      h('svg', { viewBox: '0 0 16 16', fill: 'currentColor' }),
                  }
                )
              ),
              h(
                NButton,
                { class: 'text-primary', type: 'primary', text: true },
                () => 'Text'
              ),
              h(
                NButton,
                { class: 'ghost-primary', type: 'primary', ghost: true },
                () => 'Ghost'
              ),
              h(
                NCheckbox,
                { class: 'checked-checkbox', checked: true },
                () => 'Checked'
              ),
              h(
                NCheckbox,
                { class: 'disabled-checkbox', checked: true, disabled: true },
                () => 'Disabled'
              ),
              h(NRadio, { class: 'checked-radio', checked: true }),
              h(NRadioGroup, { value: 'one' }, () =>
                h(
                  NRadioButton,
                  { class: 'checked-radio-button', value: 'one' },
                  () => 'One'
                )
              ),
              h(
                NSwitch,
                { class: 'checked-switch', value: true },
                { checked: () => 'On' }
              ),
            ]
          ),
      }),
      { attachTo: document.body }
    )
    await flushPromises()
    const value = (selector: string, name: string) =>
      wrapper.get<HTMLElement>(selector).element.style.getPropertyValue(name)
    const checkSolid = (expected: string) => {
      for (const type of types)
        for (const state of ['', '-hover', '-pressed', '-focus', '-disabled'])
          expectColor(
            value(`.solid-${type}`, `--n-text-color${state}`),
            expected
          )
      expectColor(value('.checked-checkbox', '--n-check-mark-color'), expected)
      expectColor(
        value('.disabled-checkbox', '--n-check-mark-color-disabled-checked'),
        expected
      )
      expectColor(value('.checked-radio', '--n-dot-color-active'), expected)
      expectColor(
        value('.n-radio-group', '--n-button-text-color-active'),
        expected
      )
      expectColor(value('.checked-switch', '--n-text-color'), expected)
    }
    checkSolid('#ffffff')
    expectColor(value('.checked-radio', '--n-color-active'), '#409eff')
    expectColor(value('.n-radio-group', '--n-button-color-active'), '#409eff')
    expectColor(value('.text-primary', '--n-text-color'), '#409eff')
    expectColor(value('.ghost-primary', '--n-text-color'), '#409eff')
    expect(
      wrapper.findAll('.n-button__icon svg[fill="currentColor"]')
    ).toHaveLength(5)
    foreground.value = '#000000'
    await flushPromises()
    checkSolid('#000000')
    expectColor(value('.text-primary', '--n-text-color'), '#409eff')
    expectColor(value('.ghost-primary', '--n-text-color'), '#409eff')
  }
)

test('reactive nested providers and explicit local skeleton colors stay isolated', async () => {
  skeletonStyles()
  const mode = ref<'light' | 'dark'>('light')
  const color = ref('#112233')
  const localColor = ref('#aa44cc')
  const draft = ref('Before theme change')
  const ExplicitDark = defineComponent({
    setup() {
      const style = useComponentTheme(() => 'dark')
      return () => h('div', { class: 'explicit-dark', style: style.value })
    },
  })
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(
          NConfigProvider,
          createComponentTheme({ mode: mode.value, skeletonBg: color.value }),
          () => [
            h(NInput, {
              class: 'outer-input',
              value: draft.value,
              'onUpdate:value': (value: string) => {
                draft.value = value
              },
            }),
            h(NSkeleton, { class: 'outer-native' }),
            h(Skeleton, { class: 'outer-custom' }),
            h(Skeleton, {
              class: 'local-custom',
              style: { '--c-skeleton-bg': localColor.value },
            }),
            h(ExplicitDark),
            h(
              NConfigProvider,
              createComponentTheme({ skeletonBg: '#abcdef' }),
              () => [
                h(NSkeleton, { class: 'inner-native' }),
                h(Skeleton, { class: 'inner-custom' }),
              ]
            ),
          ]
        ),
    }),
    { attachTo: document.body }
  )
  await flushPromises()
  const outerElement = wrapper.get('.outer-custom').element
  const inputElement = wrapper.get('.outer-input input').element
  await wrapper.get('.outer-input input').setValue('Preserve this draft')
  expect(
    wrapper
      .get<HTMLElement>('.explicit-dark')
      .element.style.getPropertyValue('--c-theme-skeleton-bg')
  ).toBe(COMPONENT_COLOR_PALETTES.dark.skeletonBg)
  color.value = '#445566'
  localColor.value = '#cc44aa'
  mode.value = 'dark'
  await flushPromises()
  expect(wrapper.get('.outer-custom').element).toBe(outerElement)
  expect(wrapper.get('.outer-input input').element).toBe(inputElement)
  expect(
    wrapper.get<HTMLInputElement>('.outer-input input').element.value
  ).toBe('Preserve this draft')
  expect(
    wrapper
      .get<HTMLElement>('.outer-native')
      .element.style.getPropertyValue('--n-color-start')
  ).toBe('#445566')
  expect(
    wrapper
      .get<HTMLElement>('.outer-custom')
      .element.style.getPropertyValue('--c-theme-skeleton-bg')
  ).toBe('#445566')
  expect(
    wrapper
      .get<HTMLElement>('.inner-native')
      .element.style.getPropertyValue('--n-color-start')
  ).toBe('#abcdef')
  expect(
    wrapper
      .get<HTMLElement>('.inner-custom')
      .element.style.getPropertyValue('--c-theme-skeleton-bg')
  ).toBe('#abcdef')
  expect(
    wrapper
      .get<HTMLElement>('.explicit-dark')
      .element.style.getPropertyValue('--c-theme-skeleton-bg')
  ).toBe('#445566')
  expectColor(
    getComputedStyle(wrapper.get('.local-custom .c-skeleton__item').element)
      .backgroundColor,
    '#cc44aa'
  )
})
