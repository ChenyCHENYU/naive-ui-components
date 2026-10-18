import { expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { computed, defineComponent, h, ref } from 'vue'
import {
  NAlert,
  NBadge,
  NButton,
  NButtonGroup,
  NCard,
  NDatePicker,
  NEmpty,
  NForm,
  NGrid,
  NGridItem,
  NInput,
  NInputNumber,
  NProgress,
  NRadio,
  NRadioGroup,
  NRate,
  NSelect,
  NSlider,
  NSpace,
  NStep,
  NSteps,
  NSwitch,
  NTabPane,
  NTabs,
  NTag,
} from 'naive-ui'
import C_Form from '../../src/components/C_Form/index.vue'
import C_FormSearch from '../../src/components/C_FormSearch/index.vue'
import C_FormModal from '../../src/components/C_FormModal/index.vue'
import C_ActionBar from '../../src/components/C_ActionBar/index.vue'
import { FORM_GLOBAL_CONFIG_KEY } from '../../src/components/C_Form'
import type { FormModalEditor } from '../../src/components/C_FormModal/types'
import type { FormRecord, LayoutType } from '../../src/components/C_Form/types'

const components = {
  NAlert,
  NBadge,
  NButton,
  NButtonGroup,
  NCard,
  NEmpty,
  NGrid,
  NGridItem,
  NInput,
  NInputNumber,
  NProgress,
  NRadio,
  NRadioGroup,
  NSlider,
  NSpace,
  NStep,
  NSteps,
  NSwitch,
  NTabPane,
  NTabs,
  NTag,
}

test('form controls, upload trigger and actions follow density while field sizes win', async () => {
  const wrapper = mount(C_Form<FormRecord>, {
    props: {
      options: [
        { type: 'input', prop: 'name' },
        { type: 'input', prop: 'explicit', attrs: { size: 'large' } },
        { type: 'select', prop: 'select', children: [] },
        { type: 'datePicker', prop: 'date' },
        { type: 'upload', prop: 'file' },
        { type: 'rate', prop: 'rating', attrs: { size: 22 } },
      ],
      config: { density: 'compact' },
    },
  })
  await vi.waitFor(() =>
    expect(wrapper.findComponent(NDatePicker).exists()).toBe(true)
  )
  await flushPromises()
  expect(wrapper.findComponent(NForm).props('size')).toBe('small')
  expect(wrapper.findAllComponents(NInput)[0].props('size')).toBe('small')
  expect(wrapper.findAllComponents(NInput)[1].props('size')).toBe('large')
  expect(wrapper.findComponent(NSelect).props('size')).toBe('small')
  expect(wrapper.findComponent(NDatePicker).props('size')).toBe('small')
  expect(wrapper.findComponent(NRate).props('size')).toBe(22)
  await vi.waitFor(() =>
    expect(
      wrapper
        .findAllComponents(NButton)
        .some(button => button.text() === '选择文件')
    ).toBe(true)
  )
  const upload = wrapper
    .findAllComponents(NButton)
    .find(button => button.text() === '选择文件')!
  expect(upload.props('size')).toBe('small')
  expect(
    wrapper
      .findAllComponents(NButton)
      .every(button => button.props('size') === 'small')
  ).toBe(true)
  expect(wrapper.attributes('style')).toContain('--c-form-padding: 12px')
  await wrapper.setProps({ config: { density: 'comfortable' } })
  expect(wrapper.findComponent(NForm).props('size')).toBe('large')
  expect(wrapper.attributes('style')).toContain('--c-form-item-gap: 28px')
  expect(
    wrapper
      .findAllComponents(NButton)
      .every(button => button.props('size') === 'large')
  ).toBe(true)
})

test.each<LayoutType>([
  'default',
  'inline',
  'grid',
  'card',
  'tabs',
  'steps',
  'dynamic',
  'custom',
])(
  '%s layout accepts reactive density without resetting a model',
  async layout => {
    const wrapper = mount(C_Form<FormRecord>, {
      global: { components },
      props: {
        options: [{ type: 'input', prop: 'name', value: 'kept' }],
        config: { layout, density: 'compact' },
      },
    })
    await flushPromises()
    const layoutSelector =
      layout === 'custom'
        ? '.custom-layout'
        : layout === 'grid'
          ? '.c-grid-layout'
          : `.c-form-${layout}`
    await vi.waitFor(() =>
      expect(wrapper.find(layoutSelector).exists()).toBe(true)
    )
    await wrapper.setProps({ config: { layout, density: 'comfortable' } })
    await flushPromises()
    expect(wrapper.findComponent(NForm).props('size')).toBe('large')
    expect(wrapper.vm.getModel()).toEqual({ name: 'kept' })
    expect(wrapper.attributes('style')).toContain('--c-form-gap: 20px')
    if (layout === 'inline')
      expect(wrapper.get('.c-form-inline').attributes('style')).toContain(
        'gap: 20px 20px'
      )
    if (layout === 'grid' || layout === 'dynamic')
      expect(wrapper.findComponent(NGrid).props('xGap')).toBe(20)
    if (layout === 'card')
      expect(wrapper.get('.form-content').attributes('style')).toContain(
        'gap: 20px'
      )
  }
)

test('form explicit grid gaps survive density changes and default instances stay independent', async () => {
  const compact = mount(C_Form<FormRecord>, {
    global: { components },
    props: {
      options: [],
      config: {
        layout: 'grid',
        density: 'compact',
        size: 'large',
        grid: { gutter: 7, xGap: 3 },
      },
    },
  })
  const standard = mount(C_Form<FormRecord>, { props: { options: [] } })
  await vi.waitFor(() =>
    expect(compact.findComponent(NGrid).exists()).toBe(true)
  )
  expect(compact.findComponent(NGrid).props('xGap')).toBe(3)
  expect(compact.findComponent(NGrid).props('yGap')).toBe(7)
  expect(compact.findComponent(NForm).props('size')).toBe('large')
  expect(standard.findComponent(NForm).props('size')).toBe('medium')
  expect(standard.attributes('style') ?? '').not.toContain('--c-form-gap')
})

test('native form size passthrough retains priority and reacts together with fields and actions', async () => {
  const size = ref<'small' | 'large'>('large')
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(C_Form<FormRecord>, {
          options: [{ type: 'input', prop: 'name' }],
          config: { density: 'compact', size: 'medium' },
          size: size.value,
        }),
    })
  )
  expect(wrapper.findComponent(NForm).props('size')).toBe('large')
  expect(wrapper.findComponent(NInput).props('size')).toBe('large')
  expect(
    wrapper
      .findAllComponents(NButton)
      .every(button => button.props('size') === 'large')
  ).toBe(true)
  size.value = 'small'
  await flushPromises()
  expect(wrapper.findComponent(NForm).props('size')).toBe('small')
  expect(wrapper.findComponent(NInput).props('size')).toBe('small')
  expect(
    wrapper
      .findAllComponents(NButton)
      .every(button => button.props('size') === 'small')
  ).toBe(true)
})

test('search density aligns every field and button, preserves draft and explicit overrides', async () => {
  const wrapper = mount(C_FormSearch, {
    props: {
      formItemList: [
        { type: 'input', prop: 'name' },
        { type: 'select', prop: 'type', attrs: { size: 'large' } },
        { type: 'date-range', prop: 'date' },
      ],
      config: { density: 'compact', foldThreshold: 2 },
    },
  })
  expect(wrapper.findComponent(NForm).props('size')).toBe('small')
  expect(wrapper.findComponent(NInput).props('size')).toBe('small')
  expect(wrapper.findComponent(NSelect).props('size')).toBe('large')
  expect(wrapper.findComponent(NDatePicker).exists()).toBe(false)
  await wrapper.get('[aria-label="展开搜索条件"]').trigger('click')
  expect(wrapper.findComponent(NDatePicker).props('size')).toBe('small')
  expect(
    wrapper
      .findAllComponents(NButton)
      .every(button => button.props('size') === 'small')
  ).toBe(true)
  await wrapper.findComponent(NInput).get('input').setValue('unsynced draft')
  await wrapper.setProps({
    config: { density: 'comfortable', foldThreshold: 2 },
  })
  expect(wrapper.vm.formParams.name).toBe('unsynced draft')
  expect(wrapper.findComponent(NDatePicker).exists()).toBe(true)
  expect(wrapper.findComponent(NDatePicker).props('size')).toBe('large')
  expect(wrapper.attributes('style')).toContain('--c-search-padding: 28px')
  await wrapper.setProps({ size: 'small' })
  expect(wrapper.findComponent(NForm).props('size')).toBe('small')
  expect(
    wrapper
      .findAllComponents(NButton)
      .every(button => button.props('size') === 'small')
  ).toBe(true)
})

test('short and empty searches keep actions; a neighboring default instance retains medium controls', () => {
  const compact = mount(C_FormSearch, {
    props: { formItemList: [], config: { density: 'compact' } },
  })
  const standard = mount(C_FormSearch, {
    props: { formItemList: [{ type: 'input', prop: 'name' }] },
  })
  expect(compact.findAllComponents(NButton)).toHaveLength(2)
  expect(compact.find('[aria-expanded]').exists()).toBe(false)
  expect(standard.findComponent(NForm).props('size')).toBe('medium')
  expect(
    standard
      .findAllComponents(NButton)
      .every(button => button.props('size') === 'medium')
  ).toBe(true)
  expect(standard.attributes('style') ?? '').not.toContain('--c-search-padding')
})

test('form modals inherit reactive density in both form and footer and preserve editor state', async () => {
  const model = ref<FormRecord | null>({ name: 'kept' })
  const editor: FormModalEditor<FormRecord> = {
    visible: ref(true),
    model,
    mode: ref('create'),
    title: ref('Density'),
    loading: computed(() => false),
    setModel: value => {
      model.value = value
    },
    close: () => {},
    submit: async () => true,
  }
  const wrapper = mount(C_FormModal<FormRecord>, {
    attachTo: document.body,
    props: {
      editor,
      options: [{ type: 'input', prop: 'name' }],
      config: { density: 'comfortable' },
    },
  })
  await vi.waitFor(() =>
    expect(wrapper.findComponent(NForm).exists()).toBe(true)
  )
  expect(wrapper.findComponent(NForm).props('size')).toBe('large')
  const footer = () =>
    wrapper.findComponent(C_ActionBar).findAllComponents(NButton)
  expect(footer()).toHaveLength(2)
  expect(footer().every(button => button.props('size') === 'large')).toBe(true)
  await wrapper.setProps({ config: { density: 'compact' } })
  expect(wrapper.findComponent(NForm).props('size')).toBe('small')
  expect(footer().every(button => button.props('size') === 'small')).toBe(true)
  expect(model.value).toEqual({ name: 'kept' })
  await wrapper.setProps({ config: { density: 'compact', size: 'large' } })
  expect(wrapper.findComponent(NForm).props('size')).toBe('large')
  expect(footer().every(button => button.props('size') === 'large')).toBe(true)
  await wrapper.setProps({ config: {} })
  expect(wrapper.findComponent(NForm).props('size')).toBe('small')
})

test('form modal application density is not shadowed by its historic small default', async () => {
  const model = ref<FormRecord | null>({ name: 'kept' })
  const editor: FormModalEditor<FormRecord> = {
    visible: ref(true),
    model,
    mode: ref('edit'),
    title: ref('Global density'),
    loading: ref(false),
    setModel: value => {
      model.value = value
    },
    close: () => {},
    submit: async () => true,
  }
  const wrapper = mount(C_FormModal<FormRecord>, {
    attachTo: document.body,
    global: {
      provide: {
        [FORM_GLOBAL_CONFIG_KEY as symbol]: { density: 'comfortable' },
      },
    },
    props: { editor, options: [{ type: 'input', prop: 'name' }] },
  })
  await vi.waitFor(() =>
    expect(wrapper.findComponent(NForm).exists()).toBe(true)
  )
  expect(wrapper.findComponent(NForm).props('size')).toBe('large')
  expect(
    wrapper
      .findComponent(C_ActionBar)
      .findAllComponents(NButton)
      .every(button => button.props('size') === 'large')
  ).toBe(true)
})
