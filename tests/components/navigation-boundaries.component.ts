import { expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { h, nextTick, reactive } from 'vue'
import {
  NAvatar,
  NButton,
  NCheckbox,
  NDivider,
  NDropdown,
  NForm,
  NFormItem,
  NInput,
  NTag,
  NText,
  NTooltip,
} from 'naive-ui'
import { createMemoryHistory, createRouter } from 'vue-router'
import Collapse from '../../src/components/C_CollapsePanel/index.vue'
import ContextMenu from '../../src/components/C_ContextMenu/index.vue'
import Captcha from '../../src/components/C_Captcha/index.vue'
import Login from '../../src/components/C_Login/index.vue'
import Search from '../../src/components/C_GlobalSearch/index.vue'
import Tags from '../../src/components/C_TagsView/index.vue'
import Notice from '../../src/components/C_NotificationCenter/components/NotificationItem.vue'
import { COMPONENT_LOCALE_KEY } from '../../src/context'
import type { ComponentLocale } from '../../src/core/contracts'
import type { CaptchaVerificationRequest } from '../../src/components/C_Captcha/types'

vi.mock('altcha', () => ({}))
vi.mock('altcha/i18n/zh-cn', () => ({}))
vi.mock('vue3-puzzle-vcode', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    default: defineComponent({
      name: 'PuzzleVcode',
      emits: ['success', 'close', 'fail'],
      setup: () => () => h('div'),
    }),
  }
})
const components = {
  NAvatar,
  NButton,
  NCheckbox,
  NDivider,
  NDropdown,
  NForm,
  NFormItem,
  NInput,
  NTag,
  NText,
  NTooltip,
}
class AuditWidget extends HTMLElement {
  configure = vi.fn(async () => undefined)
  verify = vi.fn(async () => undefined)
  reset = vi.fn()
}
customElements.define('altcha-navigation-test', AuditWidget)
// The SDK adapter is mocked; the custom element still receives real DOM events/configuration.
if (!customElements.get('altcha-widget'))
  customElements.define('altcha-widget', class extends AuditWidget {})

test('collapse owns header keys but leaves extra action activation intact', async () => {
  const action = vi.fn()
  const wrapper = mount(Collapse, {
    props: { items: [{ key: 'a', title: 'A' }] },
    slots: {
      'extra-a': () =>
        h('button', { type: 'button', onClick: action }, 'Business action'),
    },
  })
  const button = wrapper.get('button')
  const key = new KeyboardEvent('keydown', {
    key: 'Enter',
    bubbles: true,
    cancelable: true,
  })
  button.element.dispatchEvent(key)
  await nextTick()
  expect(key.defaultPrevented).toBe(false)
  expect(wrapper.emitted('update:activeKeys')).toBeUndefined()
  await button.trigger('click')
  expect(action).toHaveBeenCalledOnce()
  expect(wrapper.emitted('update:activeKeys')).toBeUndefined()
  await wrapper
    .get('.collapse-item__header')
    .trigger('keydown', { key: 'Enter' })
  expect(wrapper.emitted('update:activeKeys')).toEqual([[['a']]])
})

test('challenge identity changes cancel the old proof and accept only the new challenge', async () => {
  let finish!: (value: { valid: boolean; token: string }) => void
  let signal!: AbortSignal
  const verifier = vi.fn((request: CaptchaVerificationRequest) => {
    ;({ signal } = request)
    return new Promise<{ valid: boolean; token: string }>(resolve => {
      finish = resolve
    })
  })
  const wrapper = mount(Captcha, {
    props: {
      provider: 'altcha',
      challengeUrl: '/a',
      verifier,
      requireServerVerification: true,
    },
  })
  await flushPromises()
  wrapper
    .get('altcha-widget')
    .element.dispatchEvent(
      new CustomEvent('verified', { detail: { payload: 'old-a' } })
    )
  await wrapper.setProps({ challengeUrl: '/b' })
  await flushPromises()
  expect(signal.aborted).toBe(true)
  expect(wrapper.emitted('visible-change')?.at(-1)).toEqual([false])
  finish({ valid: true, token: 'old-a-token' })
  await flushPromises()
  expect(wrapper.vm.validate()).toBe(false)
  expect(wrapper.vm.getToken()).toBe('')
  expect(wrapper.emitted('success')).toBeUndefined()
  verifier.mockImplementation(async () => ({
    valid: true,
    token: 'new-b-token',
  }))
  wrapper
    .get('altcha-widget')
    .element.dispatchEvent(
      new CustomEvent('verified', { detail: { payload: 'new-b' } })
    )
  await flushPromises()
  expect(wrapper.vm.getToken()).toBe('new-b-token')
  expect(wrapper.emitted('success')).toHaveLength(1)
})

test('ALTCHA inherits live application language without replacing the current challenge', async () => {
  const locale = reactive<ComponentLocale>({ locale: 'en-US' })
  const wrapper = mount(Captcha, {
    props: { provider: 'altcha', challengeUrl: '/locale' },
    global: { provide: { [COMPONENT_LOCALE_KEY as symbol]: locale } },
  })
  await flushPromises()
  const widget = wrapper.get<AuditWidget>('altcha-widget').element
  expect(widget.configure).toHaveBeenCalledWith(
    expect.objectContaining({ language: 'en' })
  )
  locale.locale = 'zh-CN'
  await flushPromises()
  expect(wrapper.get('altcha-widget').element).toBe(widget)
  expect(widget.getAttribute('language')).toBe('zh-cn')
  expect(widget.reset).not.toHaveBeenCalled()
})

test('login begins in an enabled mode and cannot submit a synchronously disabled mode', async () => {
  const wrapper = mount(Login, {
    props: {
      features: {
        passwordLogin: false,
        captchaLogin: true,
        captchaVerify: false,
        qrcodeLogin: false,
        socialLogin: false,
        register: false,
        rememberMe: false,
      },
    },
    global: { components },
  })
  expect(wrapper.findAll('.c-login__form')[0].attributes('style')).toContain(
    'display: none'
  )
  expect(
    wrapper.findAll('.c-login__form')[1].attributes('style') ?? ''
  ).not.toContain('display: none')
  const form = wrapper.findAllComponents(NForm)[1]
  let finish!: () => void
  vi.spyOn(form.vm, 'validate').mockImplementation(
    () =>
      new Promise<{ warnings: undefined }>(resolve => {
        finish = () => resolve({ warnings: undefined })
      })
  )
  await wrapper.get('.c-login__submit-btn').trigger('click')
  await wrapper.setProps({
    features: {
      passwordLogin: false,
      captchaLogin: false,
      captchaVerify: false,
      qrcodeLogin: true,
      socialLogin: false,
      register: false,
    },
  })
  finish()
  await flushPromises()
  expect(wrapper.emitted('captcha-submit')).toBeUndefined()
  expect(wrapper.find('.c-login__qr-panel').exists()).toBe(true)
  await wrapper.get('.c-login__back-btn').trigger('click')
  expect(wrapper.find('.c-login__qr-panel').exists()).toBe(true)
})

test('disabling an open context menu closes it and rejects stale selection', async () => {
  document.elementsFromPoint = () => []
  const wrapper = mount(ContextMenu, {
    attachTo: document.body,
    props: { items: [{ key: 'delete', label: 'Delete' }] },
  })
  wrapper.vm.open(1, 1)
  await nextTick()
  const item = document.querySelector<HTMLElement>('[role="menuitem"]')!
  await wrapper.setProps({ disabled: true })
  item.click()
  expect(wrapper.emitted('select')).toBeUndefined()
  expect(wrapper.vm.visible).toBe(false)
  wrapper.vm.open(1, 1)
  expect(wrapper.vm.visible).toBe(false)
  await wrapper.setProps({ disabled: false })
  wrapper.vm.open(1, 1)
  await nextTick()
  document.querySelector<HTMLElement>('[role="menuitem"]')!.click()
  expect(wrapper.emitted('select')).toHaveLength(1)
})

test('search contains Tab at both boundaries and restores its opener after Escape', async () => {
  const wrapper = mount(Search, {
    attachTo: document.body,
    props: { options: { menuItems: () => [] } },
  })
  const opener = wrapper.get<HTMLButtonElement>('.robot-search-trigger').element
  opener.focus()
  await wrapper.vm.openDialog()
  await flushPromises()
  const input = document.querySelector<HTMLInputElement>('.robot-search-input')!
  const close = document.querySelector<HTMLButtonElement>('.robot-close-btn')!
  close.focus()
  const tab = new KeyboardEvent('keydown', {
    key: 'Tab',
    bubbles: true,
    cancelable: true,
  })
  close.dispatchEvent(tab)
  expect(tab.defaultPrevented).toBe(true)
  expect(document.activeElement).toBe(input)
  const back = new KeyboardEvent('keydown', {
    key: 'Tab',
    shiftKey: true,
    bubbles: true,
    cancelable: true,
  })
  input.dispatchEvent(back)
  expect(back.defaultPrevented).toBe(true)
  expect(document.activeElement).toBe(close)
  close.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    })
  )
  await flushPromises()
  expect(document.activeElement).toBe(opener)
})

test('tag navigation has a native keyboard target separate from its close button', async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: ['/home', '/other'].map(path => ({
      path,
      component: { render: () => null },
      meta: { title: path },
    })),
  })
  await router.push('/other')
  const wrapper = mount(Tags, {
    props: { persistKey: '' },
    global: { components, plugins: [router] },
  })
  await router.push('/home')
  await flushPromises()
  const tag = wrapper.get('[data-path="/other"]')
  const link = tag.get('a[href="/other"]')
  expect(link.element.tagName).toBe('A')
  expect(link.find('button').exists()).toBe(false)
  await link.trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.path).toBe('/other')
  expect(tag.find('.n-tag__close').exists()).toBe(true)
})

test('notification details have a native keyboard target separate from row actions', async () => {
  const message = {
    id: 'a',
    title: 'A',
    summary: 'Summary',
    category: 'system' as const,
    priority: 'normal' as const,
    status: 'unread' as const,
    timestamp: new Date().toISOString(),
  }
  const wrapper = mount(Notice, { props: { message }, global: { components } })
  const open = wrapper.get<HTMLButtonElement>('.notification-item__body')
  expect(open.element.tagName).toBe('BUTTON')
  expect(open.find('button').exists()).toBe(false)
  await open.trigger('click')
  expect(wrapper.emitted('click')).toEqual([[message]])
  await wrapper.get('button[aria-label="删除消息"]').trigger('click')
  expect(wrapper.emitted('click')).toHaveLength(1)
  expect(wrapper.emitted('delete')).toEqual([['a']])
})

test('login account recovery and registration are native buttons', async () => {
  const wrapper = mount(Login, {
    props: { features: { captchaVerify: false, socialLogin: false } },
    global: { components },
  })
  const forgot = wrapper.get('.c-login__forgot')
  expect(forgot.element.tagName).toBe('BUTTON')
  await forgot.trigger('click')
  expect(wrapper.emitted('forgot-password')).toHaveLength(1)
  const register = wrapper.get('.c-login__register-link')
  expect(register.element.tagName).toBe('BUTTON')
  await register.trigger('click')
  expect(
    wrapper.findAll('.c-login__form')[2].attributes('style') ?? ''
  ).not.toContain('display: none')
})

test.each(['verifier', 'policy', 'provider'] as const)(
  'captcha %s changes invalidate a pending result',
  async reason => {
    let finish!: (value: { valid: boolean; token: string }) => void
    let signal!: AbortSignal
    const verifier = (request: CaptchaVerificationRequest) => {
      ;({ signal } = request)
      return new Promise<{ valid: boolean; token: string }>(resolve => {
        finish = resolve
      })
    }
    const wrapper = mount(Captcha, { props: { verifier } })
    await flushPromises()
    wrapper.getComponent({ name: 'PuzzleVcode' }).vm.$emit('success')
    await flushPromises()
    if (reason === 'verifier')
      await wrapper.setProps({
        verifier: async () => ({ valid: true, token: 'other' }),
      })
    else if (reason === 'policy')
      await wrapper.setProps({ requireServerVerification: true })
    else
      await wrapper.setProps({
        provider: 'altcha',
        challengeUrl: '/another-provider',
      })
    expect(signal.aborted).toBe(true)
    finish({ valid: true, token: 'stale' })
    await flushPromises()
    expect(wrapper.vm.validate()).toBe(false)
    expect(wrapper.emitted('success')).toBeUndefined()
    expect(wrapper.emitted('verify-error')).toBeUndefined()
  }
)

test('stricter captcha policy clears a completed local proof and success reentry cannot restore it', async () => {
  const wrapper = mount(Captcha)
  await flushPromises()
  wrapper.getComponent({ name: 'PuzzleVcode' }).vm.$emit('success')
  await flushPromises()
  expect(wrapper.vm.getVerificationData()?.verifiedBy).toBe('local')
  await wrapper.setProps({ requireServerVerification: true })
  expect(wrapper.vm.validate()).toBe(false)
  expect(wrapper.vm.getToken()).toBe('')
  expect(wrapper.emitted('change')?.at(-1)).toEqual([false])
  const reset = vi.fn<() => void>()
  const reentrant = mount(Captcha, { props: { onSuccess: () => reset() } })
  reset.mockImplementation(() => reentrant.vm.reset())
  await flushPromises()
  reentrant.getComponent({ name: 'PuzzleVcode' }).vm.$emit('success')
  await flushPromises()
  expect(reentrant.vm.validate()).toBe(false)
  expect(reentrant.emitted('change')?.at(-1)).toEqual([false])
})

test('language appearance changes keep pending verification and local locale takes precedence', async () => {
  const application = reactive<ComponentLocale>({ locale: 'en-US' })
  let finish!: (value: { valid: boolean; token: string }) => void
  let signal!: AbortSignal
  const wrapper = mount(Captcha, {
    props: {
      provider: 'altcha',
      challengeUrl: '/stable',
      locale: { locale: 'zh-CN' },
      verifier: request => {
        ;({ signal } = request)
        return new Promise<{ valid: boolean; token: string }>(resolve => {
          finish = resolve
        })
      },
    },
    global: { provide: { [COMPONENT_LOCALE_KEY as symbol]: application } },
  })
  await flushPromises()
  const widget = wrapper.get<AuditWidget>('altcha-widget').element
  expect(widget.configure).toHaveBeenCalledWith(
    expect.objectContaining({ language: 'zh-cn' })
  )
  widget.dispatchEvent(
    new CustomEvent('verified', { detail: { payload: 'still-valid' } })
  )
  await wrapper.setProps({ locale: undefined })
  expect(widget.getAttribute('language')).toBe('en')
  expect(signal.aborted).toBe(false)
  expect(widget.configure).toHaveBeenCalledOnce()
  finish({ valid: true, token: 'accepted' })
  await flushPromises()
  expect(wrapper.vm.getToken()).toBe('accepted')
})

test('search close followed by reopen cannot restore the previous opener or steal focus after unmount', async () => {
  const wrapper = mount(Search, {
    attachTo: document.body,
    props: { options: { menuItems: () => [] } },
  })
  const outside = document.createElement('button')
  document.body.append(outside)
  await wrapper.vm.openDialog()
  wrapper.vm.closeDialog()
  outside.focus()
  const opening = wrapper.vm.openDialog()
  await opening
  expect(document.activeElement).toBe(
    document.querySelector('.robot-search-input')
  )
  wrapper.vm.closeDialog()
  await flushPromises()
  expect(document.activeElement).toBe(outside)
  const late = wrapper.vm.openDialog()
  wrapper.unmount()
  outside.focus()
  await late
  expect(document.activeElement).toBe(outside)
})

test.each(['ctrlKey', 'metaKey'] as const)(
  'tag native %s navigation preserves the router base and saved address',
  async modifier => {
    const router = createRouter({
      history: createMemoryHistory('/console/'),
      routes: ['/home', '/other'].map(path => ({
        path,
        component: { render: () => null },
        meta: { title: path },
      })),
    })
    await router.push('/other?item=42#detail')
    const wrapper = mount(Tags, {
      props: { persistKey: '' },
      global: { components, plugins: [router] },
    })
    await router.push('/home')
    await flushPromises()
    const link = wrapper.get<HTMLAnchorElement>('[data-path="/other"] a')
    expect(link.attributes('href')).toBe('/console/other?item=42#detail')
    const push = vi.spyOn(router, 'push')
    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      button: 0,
      [modifier]: true,
    })
    link.element.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
    expect(push).not.toHaveBeenCalled()
    await link.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/other?item=42#detail')
  }
)
