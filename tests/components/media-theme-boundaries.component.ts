import { expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { NConfigProvider, NSlider, darkTheme } from 'naive-ui'
import AudioPlayer from '../../src/components/C_AudioPlayer/index.vue'
import FormulaEditor from '../../src/components/C_FormulaEditor/index.vue'
import Cron from '../../src/components/C_Cron/index.vue'
import Upload from '../../src/components/C_Upload/index.vue'
import FilePreview from '../../src/components/C_FilePreview/index.vue'
import Captcha from '../../src/components/C_Captcha/index.vue'
import ImageCropper from '../../src/components/C_ImageCropper/index.vue'

vi.mock('altcha', () => ({}))
vi.mock('altcha/i18n/zh-cn', () => ({}))

vi.mock('vue3-puzzle-vcode', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    default: defineComponent({
      name: 'PuzzleVcode',
      emits: ['success', 'close', 'fail'],
      setup: () => () => h('div', { 'data-puzzle': '' }),
    }),
  }
})
vi.mock('vue-cropper', async () => {
  const { defineComponent, h } = await import('vue')
  return { VueCropper: defineComponent({ setup: () => () => h('div') }) }
})

test('standalone media surfaces receive the current scoped Provider palette and react without losing their elements', async () => {
  const dark = ref(true)
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(
          NConfigProvider,
          {
            theme: dark.value ? darkTheme : null,
            themeOverrides: {
              common: { cardColor: dark.value ? '#172839' : '#fbfcfd' },
            },
          },
          {
            default: () => [
              h(AudioPlayer, { tracks: [] }),
              h(FormulaEditor, { showPreview: false, modelValue: '1 + 2' }),
              h(Cron, { showPreview: false, modelValue: '0 30 8 * * ?' }),
              h(Upload),
              h(FilePreview, { url: '/unopened.pdf' }),
            ],
          }
        ),
    }),
    { global: { components: { NSlider } } }
  )
  const roots = wrapper.findAll<HTMLElement>(
    '.c-audio-player, .c-formula, .c-cron, .c-upload, .c-file-preview-wrapper'
  )
  expect(roots).toHaveLength(5)
  for (const root of roots)
    expect(root.element.style.getPropertyValue('--c-theme-bg-card')).toBe(
      '#172839'
    )
  dark.value = false
  await flushPromises()
  for (const root of roots) {
    expect(
      root.element.isConnected || wrapper.element.contains(root.element)
    ).toBe(true)
    expect(root.element.style.getPropertyValue('--c-theme-bg-card')).toBe(
      '#fbfcfd'
    )
  }
  expect(wrapper.getComponent(FormulaEditor).vm.getValue()).toBe('1 + 2')
  expect(wrapper.getComponent(Cron).vm.getValue()).toBe('0 30 8 * * ?')
})

test('Captcha follows Provider by default, preserves explicit dark and retains feedback through theme changes', async () => {
  const dark = ref(false)
  const explicit = ref<'light' | 'dark'>()
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(
          NConfigProvider,
          { theme: dark.value ? darkTheme : null },
          {
            default: () => h(Captcha, { theme: explicit.value }),
          }
        ),
    })
  )
  await flushPromises()
  const root = wrapper.get('.c-captcha-modern')
  expect(root.attributes('data-theme')).toBe('light')
  wrapper.getComponent({ name: 'PuzzleVcode' }).vm.$emit('fail')
  await flushPromises()
  expect(wrapper.find('.captcha-trigger.error').exists()).toBe(true)
  dark.value = true
  await flushPromises()
  expect(root.attributes('data-theme')).toBe('dark')
  expect(wrapper.find('.captcha-trigger.error').exists()).toBe(true)
  dark.value = false
  explicit.value = 'dark'
  await flushPromises()
  expect(root.attributes('data-theme')).toBe('dark')
  wrapper.getComponent({ name: 'PuzzleVcode' }).vm.$emit('success')
  await flushPromises()
  expect(wrapper.find('.captcha-trigger.verified').exists()).toBe(true)
})

test('crop modal carries semantic overrides and accessible tools to its real portal', async () => {
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(
          NConfigProvider,
          { theme: darkTheme },
          {
            default: () =>
              h(ImageCropper, {
                modal: true,
                showPreview: false,
                style: { '--c-border': '#b73a82' },
              }),
          }
        ),
    }),
    { attachTo: document.body }
  )
  wrapper.getComponent(ImageCropper).vm.open()
  await flushPromises()
  const card = document.querySelector<HTMLElement>('.n-card.n-modal')!
  expect(card).toBeTruthy()
  expect(wrapper.element.contains(card)).toBe(false)
  expect(card.style.getPropertyValue('--c-border')).toBe('#b73a82')
  expect(card.querySelector('button[aria-label="水平翻转"]')).toBeTruthy()
})

test('ALTCHA changes only its appearance when Provider mode changes, retaining the current challenge widget', async () => {
  class ThemeWidget extends HTMLElement {
    configure = vi.fn(async () => undefined)
    verify = vi.fn(async () => undefined)
    reset = vi.fn()
  }
  customElements.define('altcha-widget', ThemeWidget)
  const dark = ref(false)
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(
          NConfigProvider,
          { theme: dark.value ? darkTheme : null },
          {
            default: () =>
              h(Captcha, {
                provider: 'altcha',
                challengeUrl: '/theme-test-challenge',
              }),
          }
        ),
    })
  )
  await flushPromises()
  const widget = wrapper.get<ThemeWidget>('altcha-widget').element
  expect(widget.configure).toHaveBeenCalledOnce()
  widget.dataset.challenge = 'still-active'
  dark.value = true
  await flushPromises()
  expect(wrapper.get('altcha-widget').element).toBe(widget)
  expect(widget.getAttribute('theme')).toBe('dark')
  expect(widget.dataset.challenge).toBe('still-active')
  expect(widget.configure).toHaveBeenCalledOnce()
  expect(widget.reset).not.toHaveBeenCalled()
  expect(wrapper.getComponent(Captcha).emitted('change')).toBeUndefined()
  wrapper.unmount()
})
