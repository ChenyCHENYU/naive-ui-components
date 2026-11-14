import { afterEach, expect, test } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import {
  NBadge,
  NButton,
  NCard,
  NCheckbox,
  NConfigProvider,
  NDivider,
  NForm,
  NFormItem,
  NInput,
  NProgress,
  NRadio,
  NRadioGroup,
  NSlider,
  NSwitch,
  NText,
  NTooltip,
} from 'naive-ui'
import Login from '../../src/components/C_Login/index.vue'
import CardLayout from '../../src/components/C_Form/layouts/Card/index.vue'
import Guide from '../../src/components/C_Guide/index.vue'

const native = {
  NBadge,
  NButton,
  NCard,
  NCheckbox,
  NDivider,
  NForm,
  NFormItem,
  NInput,
  NProgress,
  NRadio,
  NRadioGroup,
  NSlider,
  NSwitch,
  NText,
  NTooltip,
}

afterEach(() => {
  document
    .querySelectorAll('.driver-popover, .driver-overlay')
    .forEach(e => e.remove())
})

test('Login inherits the scoped brand, retains explicit glass hooks and drafts, and submits through the native form', async () => {
  const primary = ref('#ffff00')
  const gradient = 'linear-gradient(90deg, #123456, #654321)'
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(
          NConfigProvider,
          {
            themeOverrides: {
              common: { primaryColor: primary.value },
              Button: { textColorPrimary: '#000000' },
            },
          },
          () =>
            h(Login, {
              defaultUsername: 'operator',
              defaultPassword: 'secret',
              features: {
                captchaVerify: false,
                qrcodeLogin: false,
                socialLogin: false,
                rememberMe: false,
              },
              style: { '--cl-btn-bg': gradient, '--cl-tab-bar': '#abcdef' },
            })
        ),
    }),
    { global: { components: native } }
  )
  const login = wrapper.getComponent(Login)
  const panel = login.get<HTMLElement>('.c-login-panel').element
  const submit = login.get<HTMLButtonElement>('.c-login__submit-btn').element
  expect(panel.style.getPropertyValue('--c-theme-primary')).toBe('#ffff00')
  expect(panel.style.getPropertyValue('--cl-btn-bg')).toBe(gradient)
  expect(panel.style.getPropertyValue('--cl-tab-bar')).toBe('#abcdef')
  expect(submit.style.getPropertyValue('--n-text-color')).toBe('#000000')
  const firstInput = login.get<HTMLInputElement>('.c-login__form input').element
  primary.value = '#7c3aed'
  await flushPromises()
  expect(panel.style.getPropertyValue('--c-theme-primary')).toBe('#7c3aed')
  expect(panel.style.getPropertyValue('--cl-btn-bg')).toBe(gradient)
  expect(login.get<HTMLInputElement>('.c-login__form input').element).toBe(
    firstInput
  )
  expect(firstInput.value).toBe('operator')
  await login.get('.c-login__submit-btn').trigger('click')
  await flushPromises()
  expect(login.emitted('submit')?.[0]?.[0]).toEqual({
    username: 'operator',
    password: 'secret',
  })
  await login.get('.c-login__mode-btn').trigger('click')
  expect(login.get('.c-login__submit-btn').text()).toBe('登 录')
  await login.get('.c-login__back-btn').trigger('click')
  expect(
    login.get<HTMLInputElement>('.c-login__form input').element.value
  ).toBe('operator')
})

test('Card layout completion uses native semantic progress and reacts to provider colors without rewriting its fields', async () => {
  const filled = ref(false)
  const primary = ref('#a020d0')
  const success = ref('#176060')
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(
          NConfigProvider,
          {
            themeOverrides: {
              common: {
                primaryColor: primary.value,
                successColor: success.value,
              },
            },
          },
          () =>
            h(CardLayout, {
              formItems: [h('input', { value: filled.value ? 'ready' : '' })],
              options: [
                { type: 'input', prop: 'name', layout: { group: 'basic' } },
              ],
              formData: { name: filled.value ? 'ready' : '' },
              layoutConfig: {
                card: {
                  showLayoutConfig: false,
                  groups: [{ key: 'basic', title: 'Details' }],
                },
              },
            })
        ),
    }),
    { global: { components: native } }
  )
  const progress = () => wrapper.findAllComponents(NProgress)
  expect(progress()).toHaveLength(2)
  expect(progress()[0].props('color')).toBe(primary.value)
  expect(
    progress()[0].get<HTMLElement>('.n-progress-graph-line-fill').element.style
      .background
  ).toBe(primary.value)
  filled.value = true
  await flushPromises()
  expect(progress().every(item => item.props('color') === success.value)).toBe(
    true
  )
  expect(
    progress()[0].get<HTMLElement>('.n-progress-graph-line-fill').element.style
      .background
  ).toBe(success.value)
  success.value = '#772244'
  await flushPromises()
  expect(
    progress()[0].get<HTMLElement>('.n-progress-graph-line-fill').element.style
      .background
  ).toBe('#772244')
  expect(wrapper.get<HTMLInputElement>('input').element.value).toBe('ready')
})

test('Guide carries direct semantic styles into its real body popover, removes withdrawn overrides and keeps the active guide', async () => {
  const primary = ref('#225588')
  const steps = [
    { popover: { title: 'Welcome', description: 'Theme context' } },
  ]
  const local = ref<Record<string, string>>({
    '--c-primary': '#ee4455',
    '--c-guide-text': '#16384f',
    width: '777px',
  })
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(
          NConfigProvider,
          {
            themeOverrides: { common: { primaryColor: primary.value } },
          },
          () =>
            h(Guide, {
              autoStart: false,
              animate: false,
              showSkipButton: false,
              steps,
              style: local.value,
            })
        ),
    }),
    { attachTo: document.body, global: { components: native } }
  )
  const guide = wrapper.getComponent(Guide)
  await guide.vm.startGuide(true)
  await flushPromises()
  const popover = document.querySelector<HTMLElement>('.driver-popover')
  expect(popover).not.toBeNull()
  expect(popover!.style.getPropertyValue('--c-primary')).toBe('#ee4455')
  expect(popover!.style.getPropertyValue('--c-guide-text')).toBe('#16384f')
  expect(popover!.style.width).not.toBe('777px')
  local.value = {}
  primary.value = '#8844aa'
  await flushPromises()
  expect(document.querySelector('.driver-popover')).toBe(popover)
  expect(popover!.style.getPropertyValue('--c-primary')).toBe('')
  expect(popover!.style.getPropertyValue('--c-theme-primary')).toBe('#8844aa')
  expect(popover!.style.getPropertyValue('--c-guide-text')).not.toBe('#16384f')
  guide.vm.stopGuide()
})
