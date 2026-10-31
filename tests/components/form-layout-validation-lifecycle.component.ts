import { expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { h } from 'vue'
import {
  NBadge,
  NButton,
  NCard,
  NEmpty,
  NSpace,
  NStep,
  NSteps,
  NTabPane,
  NTabs,
} from 'naive-ui'
import Tabs from '../../src/components/C_Form/layouts/Tabs/index.vue'
import Steps from '../../src/components/C_Form/layouts/Steps/index.vue'

const components = {
  NBadge,
  NButton,
  NCard,
  NEmpty,
  NSpace,
  NStep,
  NSteps,
  NTabPane,
  NTabs,
}
const deferred = () => {
  let resolve!: (value: boolean) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<boolean>((accept, decline) => {
    resolve = accept
    reject = decline
  })
  return { promise, resolve, reject }
}
const tabs = [
  { key: 'a', title: 'A' },
  { key: 'b', title: 'B' },
]

test('tab validation does not publish a removed source result as the new active tab', async () => {
  const validation = deferred()
  const wrapper = mount(Tabs, {
    global: { components },
    props: {
      formItems: [],
      layoutConfig: { tabs: { tabs } },
      validateTab: () => validation.promise,
    },
  })
  await flushPromises()
  const pending = wrapper.vm.validateCurrentTab()
  await wrapper.setProps({ layoutConfig: { tabs: { tabs: [tabs[1]] } } })
  await flushPromises()
  expect(wrapper.vm.currentTab).toBe('b')
  validation.resolve(true)
  expect(await pending).toBe(false)
  expect(wrapper.emitted('tab-validate')).toBeUndefined()
})

test.each(['mounted', 'unmounted'] as const)(
  'tab validation ignores superseded results while %s',
  async state => {
    const first = deferred()
    const second = deferred()
    const validated = vi.fn()
    const validateTab = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
    const wrapper = mount(Tabs, {
      global: { components },
      props: {
        formItems: [],
        layoutConfig: { tabs: { tabs } },
        validateTab,
        onTabValidate: validated,
      },
    })
    await flushPromises()
    const old = wrapper.vm.validateCurrentTab()
    const current = wrapper.vm.validateCurrentTab()
    second.resolve(false)
    expect(await current).toBe(false)
    expect(validated.mock.calls).toEqual([['a']])
    if (state === 'unmounted') wrapper.unmount()
    first.resolve(true)
    expect(await old).toBe(false)
    expect(validated.mock.calls).toEqual([['a']])
  }
)

test('step validation rejection does not mark a replacement step as invalid', async () => {
  const validation = deferred()
  const wrapper = mount(Steps, {
    global: { components },
    props: {
      formItems: [h('input', { path: 'a' }), h('input', { path: 'b' })],
      options: [{ layout: { step: 'a' } }, { layout: { step: 'b' } }],
      layoutConfig: { steps: { steps: tabs } },
      validateStep: () => validation.promise,
    },
  })
  await flushPromises()
  const pending = wrapper.vm.validateCurrentStep()
  await wrapper.setProps({
    formItems: [h('input', { path: 'b' })],
    options: [{ layout: { step: 'b' } }],
  })
  validation.reject(new Error('old A validation'))
  expect(await pending).toBe(false)
  await flushPromises()
  expect(wrapper.findComponent(NSteps).props('status')).toBe('process')
  expect(wrapper.emitted('step-validate')).toBeUndefined()
})

test('newer step validation owns the result for the same stable step', async () => {
  const first = deferred()
  const second = deferred()
  const validateStep = vi
    .fn()
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise)
  const wrapper = mount(Steps, {
    global: { components },
    props: {
      formItems: [h('input', { path: 'a' })],
      options: [{ layout: { step: 'a' } }],
      layoutConfig: { steps: { steps: [tabs[0]] } },
      validateStep,
    },
  })
  await flushPromises()
  const old = wrapper.vm.validateCurrentStep()
  const current = wrapper.vm.validateCurrentStep()
  second.resolve(true)
  expect(await current).toBe(true)
  first.reject(new Error('old result'))
  expect(await old).toBe(false)
  await flushPromises()
  expect(wrapper.findComponent(NSteps).props('status')).toBe('process')
  expect(wrapper.emitted('step-validate')).toEqual([[0]])
})
