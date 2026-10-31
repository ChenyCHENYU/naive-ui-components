import { afterEach, expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { computed, defineComponent, h, KeepAlive, ref } from 'vue'
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
import FormSearchComponent from '../../src/components/C_FormSearch/index.vue'
import type { SearchFormParams } from '../../src/components/C_FormSearch/types'
import C_FormModal from '../../src/components/C_FormModal/index.vue'
import GridLayout from '../../src/components/C_Form/layouts/Grid/index.vue'
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

// Vue Test Utils 的 mount/h 使用显式动态模型；业务推导由 consumer SFC 夹具覆盖。
const C_FormSearch = FormSearchComponent<SearchFormParams>

afterEach(() => vi.unstubAllGlobals())

/** 注入真实 observer 回调，验证数值协议而不伪造 jsdom 的布局像素。 */
function controlGridResize() {
  const observers: ControlledResizeObserver[] = []
  class ControlledResizeObserver implements ResizeObserver {
    target?: Element
    disconnect = vi.fn()
    constructor(readonly callback: ResizeObserverCallback) {
      observers.push(this)
    }
    observe(target: Element) {
      this.target = target
    }
    unobserve() {}
    emit(width: number) {
      this.callback(
        [
          {
            target: this.target!,
            contentRect: new DOMRect(0, 0, width, 0),
          } as ResizeObserverEntry,
        ],
        this
      )
    }
  }
  vi.stubGlobal('ResizeObserver', ControlledResizeObserver)
  return observers
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
  expect(wrapper.attributes('style')).toContain('--c-form-item-gap: 2px')
  expect(
    wrapper
      .get('.c-form-actions')
      .find('.n-form-item-feedback-wrapper')
      .exists()
  ).toBe(false)
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

test('responsive grids cap numeric gaps while retaining column and offset contracts', async () => {
  const observers = controlGridResize()
  const wrapper = mount(GridLayout, {
    global: { components },
    props: {
      formItems: [h('input')],
      options: [
        { type: 'input', prop: 'name', layout: { span: 12, offset: 2 } },
      ],
      layoutConfig: { grid: { cols: 24, xGap: 18, yGap: 8 } },
    },
  })
  const grid = () => wrapper.findComponent(NGrid)
  const item = () => wrapper.findComponent(NGridItem)
  const observer = observers.find(item => item.target === wrapper.element)!
  expect(grid().props()).toMatchObject({ cols: 24, xGap: 18, yGap: 8 })
  observer.emit(334)
  await flushPromises()
  expect(grid().props('xGap')).toBeCloseTo(334 / 24)
  expect(item().props()).toMatchObject({ span: 12, offset: 2 })
  expect(item().attributes('style')).not.toContain('cqw')
  observer.emit(0)
  observer.emit(Number.NaN)
  await flushPromises()
  expect(grid().props('xGap')).toBeCloseTo(334 / 24)
  await wrapper.setProps({
    layoutConfig: { grid: { cols: 48, xGap: 18, yGap: 8 } },
  })
  expect(grid().props('xGap')).toBeCloseTo(334 / 48)
  observer.emit(1200)
  await flushPromises()
  expect(grid().props('xGap')).toBe(18)
  await wrapper.setProps({
    layoutConfig: { grid: { cols: 48, xGap: 0, yGap: 8 } },
  })
  expect(grid().props('xGap')).toBe(0)
  await wrapper.setProps({
    layoutConfig: { grid: { cols: 12, xGap: 18, yGap: 8, responsive: false } },
  })
  expect(grid().props()).toMatchObject({ cols: 12, xGap: 18, yGap: 8 })
  expect(observer.disconnect).toHaveBeenCalledOnce()
  observer.emit(100)
  await flushPromises()
  expect(grid().props('xGap')).toBe(18)
})

test('grid width observation disconnects while inactive and ignores old callbacks after restore and disposal', async () => {
  const observers = controlGridResize()
  const active = ref(true)
  const layoutConfig = ref({ grid: { cols: 24, xGap: 18, responsive: true } })
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(
          KeepAlive,
          {},
          {
            default: () =>
              active.value
                ? h(GridLayout, {
                    formItems: [],
                    layoutConfig: layoutConfig.value,
                  })
                : h('span', 'inactive'),
          }
        ),
    }),
    { global: { components } }
  )
  const first = observers.find(item => item.target?.matches('.c-grid-layout'))!
  first.emit(334)
  await flushPromises()
  expect(wrapper.findComponent(NGrid).props('xGap')).toBeCloseTo(334 / 24)
  const measure = vi.fn(() => 588)
  Object.defineProperty(first.target!, 'clientWidth', {
    configurable: true,
    get: measure,
  })
  active.value = false
  await flushPromises()
  expect(first.disconnect).toHaveBeenCalledOnce()
  layoutConfig.value.grid.responsive = false
  await flushPromises()
  layoutConfig.value.grid.responsive = true
  await flushPromises()
  expect(
    observers.filter(item => item.target?.matches('.c-grid-layout'))
  ).toHaveLength(1)
  expect(measure).not.toHaveBeenCalled()
  first.emit(100)
  active.value = true
  await flushPromises()
  expect(measure).toHaveBeenCalledOnce()
  const latest = observers
    .filter(item => item.target?.matches('.c-grid-layout'))
    .at(-1)!
  expect(latest).not.toBe(first)
  latest.emit(588)
  await flushPromises()
  first.emit(100)
  await flushPromises()
  expect(wrapper.findComponent(NGrid).props('xGap')).toBe(18)
  wrapper.unmount()
  expect(latest.disconnect).toHaveBeenCalledOnce()
  latest.emit(100)
  expect(latest.disconnect).toHaveBeenCalledOnce()
})

test('grid measures its first mounted width even without ResizeObserver', async () => {
  vi.stubGlobal('ResizeObserver', undefined)
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(334)
  const wrapper = mount(GridLayout, {
    global: { components },
    props: { formItems: [], layoutConfig: { grid: { cols: 24, xGap: 18 } } },
  })
  await flushPromises()
  expect(wrapper.findComponent(NGrid).props('xGap')).toBeCloseTo(334 / 24)
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
    attachTo: document.body,
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
  await vi.waitFor(() =>
    expect(wrapper.findComponent(NDatePicker).exists()).toBe(true)
  )
  const datePicker = wrapper.findComponent(NDatePicker)
  const datePickerInstance = datePicker.vm.$.uid
  const dateField = wrapper.findAll('.form-search-item-box')[2]
  expect(dateField.isVisible()).toBe(false)
  expect(datePicker.props('size')).toBe('small')
  await wrapper.get('[aria-label="展开搜索条件"]').trigger('click')
  expect(wrapper.findComponent(NDatePicker).vm.$.uid).toBe(datePickerInstance)
  expect(dateField.isVisible()).toBe(true)
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
  expect(footer().every(button => button.props('size') === 'tiny')).toBe(true)
  expect(model.value).toEqual({ name: 'kept' })
  await wrapper.setProps({ config: { density: 'compact', size: 'large' } })
  expect(wrapper.findComponent(NForm).props('size')).toBe('large')
  expect(footer().every(button => button.props('size') === 'large')).toBe(true)
  await wrapper.setProps({ config: {} })
  expect(wrapper.findComponent(NForm).props('size')).toBe('small')
  expect(wrapper.findComponent(C_Form).classes()).toContain('c-form--compact')
  expect(footer().every(button => button.props('size') === 'tiny')).toBe(true)
})

test.each([
  { global: {}, local: {}, density: 'compact', field: 'small', footer: 'tiny' },
  {
    global: { density: 'default' as const },
    local: {},
    density: 'default',
    field: 'medium',
    footer: 'medium',
  },
  {
    global: { density: 'comfortable' as const, size: 'medium' as const },
    local: { density: 'compact' as const },
    density: 'compact',
    field: 'medium',
    footer: 'medium',
  },
  {
    global: { density: 'comfortable' as const, size: 'medium' as const },
    local: { density: 'compact' as const, size: 'large' as const },
    density: 'compact',
    field: 'large',
    footer: 'large',
  },
  {
    global: { density: 'comfortable' as const, size: 'large' as const },
    local: { size: 'small' as const },
    density: 'comfortable',
    field: 'small',
    footer: 'small',
  },
])(
  'modal density and size respect local/global/default priority: %j',
  async scenario => {
    const model = ref<FormRecord | null>({ name: 'kept' })
    const editor: FormModalEditor<FormRecord> = {
      visible: ref(true),
      model,
      mode: ref('create'),
      title: ref('Density'),
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
        provide: { [FORM_GLOBAL_CONFIG_KEY as symbol]: scenario.global },
      },
      props: {
        editor,
        options: [{ type: 'input', prop: 'name' }],
        config: scenario.local,
      },
    })
    await vi.waitFor(() =>
      expect(wrapper.findComponent(NForm).exists()).toBe(true)
    )
    expect(wrapper.findComponent(C_Form).classes()).toContain(
      `c-form--${scenario.density}`
    )
    expect(wrapper.findComponent(NForm).props('size')).toBe(scenario.field)
    const footer = wrapper.findComponent(C_ActionBar).findAllComponents(NButton)
    expect(
      footer.every(button => button.props('size') === scenario.footer)
    ).toBe(true)
    if (scenario.footer === 'tiny')
      expect(footer[0].attributes('style')).toMatch(/--n-height:\s*22px/)
    expect(model.value).toEqual({ name: 'kept' })
  }
)

test('compact keeps field errors and accessible names while actions reserve no feedback', async () => {
  const save = vi.fn()
  const wrapper = mount(C_Form<FormRecord>, {
    attachTo: document.body,
    props: {
      options: [
        {
          type: 'input',
          prop: 'name',
          label: '姓名',
          attrs: {
            inputProps: { 'aria-label': '姓名', 'aria-required': 'true' },
          },
          rules: [
            { required: true, message: '请输入姓名，校验提示仍需完整显示' },
          ],
        },
      ],
      modelValue: { name: '' },
      config: { density: 'compact', submitText: '保存', onSubmit: save },
    },
  })
  const field = wrapper.get('.c-form-field')
  expect(field.find('.n-form-item-feedback-wrapper').exists()).toBe(true)
  expect(
    wrapper
      .get('.c-form-actions')
      .find('.n-form-item-feedback-wrapper')
      .exists()
  ).toBe(false)
  await wrapper
    .findAll('button')
    .find(button => button.text() === '保存')!
    .trigger('click')
  await vi.waitFor(() =>
    expect(field.find('.n-form-item-feedback--error').exists()).toBe(true)
  )
  expect(field.get('.n-form-item-feedback--error').text()).toBe(
    '请输入姓名，校验提示仍需完整显示'
  )
  expect(wrapper.get('input').attributes('aria-label')).toBe('姓名')
  expect(wrapper.get('input').attributes('aria-required')).toBe('true')
  expect(save).not.toHaveBeenCalled()
  await wrapper.get('input').setValue('Ada')
  await wrapper
    .findAll('button')
    .find(button => button.text() === '保存')!
    .trigger('click')
  await vi.waitFor(() => expect(save).toHaveBeenCalledOnce())
  expect(field.find('.n-form-item-feedback--error').exists()).toBe(false)
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
