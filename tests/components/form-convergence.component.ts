import { expect, test, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import {
  NButton,
  NCard,
  NBadge,
  NEmpty,
  NGrid,
  NGridItem,
  NSpace,
  NStep,
  NSteps,
  NSwitch,
  NSelect,
  NTabs,
  NTabPane,
} from 'naive-ui'
import C_Form from '../../src/components/C_Form/index.vue'
import Tabs from '../../src/components/C_Form/layouts/Tabs/index.vue'
import Steps from '../../src/components/C_Form/layouts/Steps/index.vue'
import Grid from '../../src/components/C_Form/layouts/Grid/index.vue'
import Inline from '../../src/components/C_Form/layouts/Inline/index.vue'
import type {
  FormInstance,
  FormRecord,
} from '../../src/components/C_Form/types'

// Source SFCs use Naive auto-imports in production; register them for source tests.
const components = {
  NButton,
  NCard,
  NBadge,
  NEmpty,
  NGrid,
  NGridItem,
  NSpace,
  NStep,
  NSteps,
  NTabs,
  NTabPane,
}

test('tab UI validates before changing the controlled active tab', async () => {
  const validate = vi.fn(() => false)
  const guard = vi.fn(() => true)
  const wrapper = mount(Tabs, {
    global: { components },
    props: {
      formItems: [h('input'), h('input')],
      options: [
        { type: 'input', prop: 'a', layout: { tab: 'a' } },
        { type: 'input', prop: 'b', layout: { tab: 'b' } },
      ],
      layoutConfig: {
        tabs: {
          tabs: [
            { key: 'a', title: 'A' },
            { key: 'b', title: 'B' },
          ],
          validateBeforeSwitch: true,
        },
      },
      validateTab: validate,
      beforeTabChange: guard,
    },
  })
  await flushPromises()
  wrapper.findComponent(NTabs).vm.$emit('update:value', 'b')
  await flushPromises()
  expect(wrapper.vm.currentTab).toBe('a')
  expect(validate).toHaveBeenCalledWith('a')
  expect(guard).not.toHaveBeenCalled()
  validate.mockReturnValue(true)
  guard.mockReturnValue(false)
  wrapper.findComponent(NTabs).vm.$emit('update:value', 'b')
  await flushPromises()
  expect(wrapper.vm.currentTab).toBe('a')
  expect(guard).toHaveBeenCalledWith('a', 'b')
  guard.mockReturnValue(true)
  wrapper.findComponent(NTabs).vm.$emit('update:value', 'b')
  await flushPromises()
  expect(wrapper.vm.currentTab).toBe('b')
})

test('pending tab guards cannot overlap or commit after unmount', async () => {
  let finish!: (allowed: boolean) => void
  const guard = vi.fn(
    () =>
      new Promise<boolean>(resolve => {
        finish = resolve
      })
  )
  const changed = vi.fn()
  const wrapper = mount(Tabs, {
    global: { components },
    props: {
      formItems: [],
      layoutConfig: {
        tabs: {
          tabs: [
            { key: 'a', title: 'A' },
            { key: 'b', title: 'B' },
          ],
        },
      },
      beforeTabChange: guard,
      onTabChange: changed,
    },
  })
  await flushPromises()
  const first = wrapper.vm.switchToTab('b')
  expect(await wrapper.vm.switchToTab('b')).toBe(false)
  expect(guard).toHaveBeenCalledTimes(1)
  const initialChanges = changed.mock.calls.length
  wrapper.unmount()
  finish(true)
  expect(await first).toBe(false)
  expect(changed).toHaveBeenCalledTimes(initialChanges)
})

test('steps validate the visible group key after removing an empty leading step', async () => {
  const wrapper = mount(C_Form<FormRecord>, {
    global: { components },
    props: {
      options: [
        {
          type: 'input',
          prop: 'name',
          required: true,
          layout: { step: 'real' },
        },
        { type: 'input', prop: 'other', layout: { step: 'last' } },
      ],
      config: {
        layout: 'steps',
        steps: {
          steps: [
            { key: 'empty', title: 'Empty' },
            { key: 'real', title: 'Real' },
            { key: 'last', title: 'Last' },
          ],
          validateBeforeNext: true,
        },
      },
    },
  })
  await vi.waitFor(() =>
    expect(wrapper.findComponent(Steps).exists()).toBe(true)
  )
  const next = wrapper
    .findAll('button')
    .find(button => button.text().includes('下一步'))!
  await next.trigger('click')
  await flushPromises()
  expect(wrapper.findComponent(Steps).vm.currentStep).toBe(0)
  await wrapper.findAll('input')[0].setValue('Ada')
  await next.trigger('click')
  await flushPromises()
  expect(wrapper.findComponent(Steps).vm.currentStep).toBe(1)
})

test('readonly controls cannot mutate models; instance updates remain available', async () => {
  const wrapper = mount(C_Form<FormRecord>, {
    props: {
      options: [
        { type: 'switch', prop: 'enabled' },
        {
          type: 'select',
          prop: 'role',
          children: [{ label: 'A', value: 'a' }],
        },
      ],
      modelValue: { enabled: false, role: null },
      config: { readonly: true, showActions: false },
    },
  })
  await flushPromises()
  expect(wrapper.findComponent(NSwitch).props('disabled')).toBe(true)
  expect(wrapper.findComponent(NSelect).props('disabled')).toBe(true)
  await wrapper.findComponent(NSwitch).get('[role="switch"]').trigger('click')
  expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  const instance = wrapper.vm as unknown as FormInstance<{
    enabled: boolean
    role: string | null
  }>
  expect(instance.isSubmitting).toBe(false)
  expect(instance.isDirty).toBe(false)
  expect(instance.layoutType).toBe('default')
  await instance.setFieldValue('enabled', true)
  expect(instance.getModel().enabled).toBe(true)
  expect(await instance.submit()).toBe(false)
})

test('public grid axis gaps and inline wrap settings reach their layout', () => {
  const grid = mount(Grid, {
    global: { components },
    props: {
      formItems: [],
      layoutConfig: { grid: { gutter: 20, xGap: 8, yGutter: 12 } },
    },
  })
  expect(grid.findComponent(NGrid).props('xGap')).toBe(8)
  expect(grid.findComponent(NGrid).props('yGap')).toBe(12)
  const inline = mount(Inline, {
    props: {
      formItems: [h('input')],
      layoutConfig: {
        inline: {
          wrap: 'nowrap',
          align: 'baseline',
          rowGap: 5,
          itemWidth: 220,
        },
      },
    },
  })
  expect(inline.attributes('style')).toContain('flex-wrap: nowrap')
  expect(inline.attributes('style')).toContain('align-items: baseline')
  expect(inline.get('.c-form-inline-item').attributes('style')).toContain(
    'width: 220px'
  )
})

test('lazily loaded date and time fields still render during SSR', async () => {
  const html = await renderToString(
    createSSRApp({
      render: () =>
        h(C_Form<FormRecord>, {
          options: [
            { type: 'datePicker', prop: 'date', label: 'Date' },
            { type: 'timePicker', prop: 'time', label: 'Time' },
          ],
          config: { showActions: false },
        }),
    })
  )
  expect(html).toContain('<input')
  expect(html).toContain('Date')
  expect(html).toContain('Time')
  expect(html.match(/<input\b/g)).toHaveLength(2)
  expect(html).not.toContain('AsyncComponentWrapper')
})

test('native form submission uses the same validation and submit lock as the button', async () => {
  const save = vi.fn()
  const wrapper = mount(C_Form<FormRecord>, {
    props: {
      options: [{ type: 'input', prop: 'name', required: true }],
      config: { onSubmit: save },
    },
  })
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  expect(save).not.toHaveBeenCalled()
  await wrapper.get('input').setValue('Ada')
  await wrapper.get('form').trigger('submit')
  await flushPromises()
  expect(save).toHaveBeenCalledTimes(1)
  expect(wrapper.emitted('submit')).toHaveLength(1)
})

test('loading layouts cannot bypass validation, including unvisited required tabs', async () => {
  const save = vi.fn()
  const wrapper = mount(C_Form<FormRecord>, {
    global: { components },
    props: {
      options: [
        { type: 'input', prop: 'first', value: 'Ada', layout: { tab: 'a' } },
        { type: 'input', prop: 'second', required: true, layout: { tab: 'b' } },
      ],
      config: {
        layout: 'tabs',
        onSubmit: save,
        tabs: {
          tabs: [
            { key: 'a', title: 'A' },
            { key: 'b', title: 'B' },
          ],
        },
      },
    },
  })
  const instance = wrapper.vm as unknown as FormInstance<FormRecord>
  expect(await instance.submit()).toBe(false)
  expect(save).not.toHaveBeenCalled()
  await vi.waitFor(() => expect(wrapper.findAll('input')).toHaveLength(2))
  await flushPromises()
  expect(await instance.submit()).toBe(false)
  expect(save).not.toHaveBeenCalled()
  await instance.setFieldValue('second', 'Grace')
  expect(await instance.submit()).toBe(true)
  expect(save).toHaveBeenCalledTimes(1)
})
