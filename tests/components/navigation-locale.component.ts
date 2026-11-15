import { expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { h, reactive } from 'vue'
import {
  NAvatar,
  NButton,
  NCheckbox,
  NDivider,
  NForm,
  NFormItem,
  NInput,
  NText,
  NTooltip,
} from 'naive-ui'
import Avatar from '../../src/components/C_AvatarGroup/index.vue'
import City from '../../src/components/C_City/index.vue'
import Guide from '../../src/components/C_Guide/index.vue'
import Login from '../../src/components/C_Login/index.vue'
import Search from '../../src/components/C_GlobalSearch/index.vue'
import { COMPONENT_LOCALE_KEY } from '../../src/context'
import type { ComponentLocale } from '../../src/core/contracts'
const components = {
  NAvatar,
  NButton,
  NCheckbox,
  NDivider,
  NForm,
  NFormItem,
  NInput,
  NText,
  NTooltip,
}
const features = {
  captchaVerify: false,
  socialLogin: false,
  qrcodeLogin: false,
}

test('navigation defaults follow isolated application locale, live messages and translator removal', async () => {
  const locale = reactive<ComponentLocale>({ locale: 'en-US', messages: {} })
  const host = {
    setup: () => () =>
      h('div', [
        h(Avatar, {
          items: [
            { id: 1, name: '甲' },
            { id: 2, name: '乙' },
          ],
          max: 1,
        }),
        h(City),
        h(Guide),
        h(Login, { features }),
        h(Search, { options: { menuItems: () => [] } }),
      ]),
  }
  const wrapper = mount(host, {
    global: {
      components,
      provide: { [COMPONENT_LOCALE_KEY as symbol]: locale },
    },
  })
  const independent = mount(Avatar, {
    props: {
      items: [
        { id: 1, name: '甲' },
        { id: 2, name: '乙' },
      ],
      max: 1,
    },
    global: { components },
  })
  expect(
    wrapper.get('.c-avatar-group__overflow').attributes('aria-label')
  ).toBe('Show 1 more avatars')
  expect(wrapper.get('.city-selector-trigger').attributes('aria-label')).toBe(
    'Choose a city'
  )
  expect(wrapper.get('.c-guide-trigger').attributes('aria-label')).toBe(
    'Feature guide'
  )
  expect(wrapper.get('.c-login__submit-btn').text()).toBe('Sign in')
  expect(wrapper.get('.robot-search-trigger').text()).toContain('Search')
  expect(
    independent.get('.c-avatar-group__overflow').attributes('aria-label')
  ).toContain('头像')
  locale.messages!['avatarGroup.more'] = 'Another {count}'
  await flushPromises()
  expect(
    wrapper.get('.c-avatar-group__overflow').attributes('aria-label')
  ).toBe('Another 1')
  delete locale.messages!['avatarGroup.more']
  locale.t = key => `custom:${key}`
  await flushPromises()
  expect(wrapper.get('.c-guide-trigger').attributes('aria-label')).toBe(
    'custom:guide.trigger'
  )
  delete locale.t
  locale.locale = 'zh-CN'
  await flushPromises()
  expect(
    wrapper.get('.c-avatar-group__overflow').attributes('aria-label')
  ).toBe('显示另外 1 个头像')
  expect(wrapper.get('.c-login__submit-btn').text()).toBe('登 录')
  expect(wrapper.get('.robot-search-trigger').text()).toContain('搜索')
})

test('explicit business copy and legacy login translator remain compatible', async () => {
  const legacy = vi.fn((key: string, fallback: string) =>
    key === 'cl_login_btn' ? 'Legacy login' : fallback
  )
  vi.stubGlobal('$t', legacy)
  try {
    const old = mount(Login, { props: { features }, global: { components } })
    expect(old.get('.c-login__submit-btn').text()).toBe('Legacy login')
    const locale = {
      locale: 'en-US' as const,
      messages: { cl_login_btn: 'Application login' },
    }
    const login = mount(Login, {
      props: { features, title: 'Business title' },
      global: {
        components,
        provide: { [COMPONENT_LOCALE_KEY as symbol]: locale },
      },
    })
    expect(login.get('.c-login__submit-btn').text()).toBe('Application login')
    expect(login.get('.c-login__title').text()).toBe('Business title')
    const city = mount(City, {
      props: { placeholder: 'Business city' },
      global: { provide: { [COMPONENT_LOCALE_KEY as symbol]: locale } },
    })
    expect(city.get('.city-selector-trigger').text()).toBe('Business city')
    const guide = mount(Guide, {
      props: { triggerTooltip: 'Business guide' },
      global: {
        components,
        provide: { [COMPONENT_LOCALE_KEY as symbol]: locale },
      },
    })
    expect(guide.get('button').attributes('aria-label')).toBe('Business guide')
    const search = mount(Search, {
      attachTo: document.body,
      props: {
        placeholder: 'Business search',
        options: { menuItems: () => [] },
      },
      global: { provide: { [COMPONENT_LOCALE_KEY as symbol]: locale } },
    })
    await search.vm.openDialog()
    await flushPromises()
    expect(
      document
        .querySelector('input.robot-search-input')
        ?.getAttribute('placeholder')
    ).toBe('Business search')
  } finally {
    vi.unstubAllGlobals()
  }
})
