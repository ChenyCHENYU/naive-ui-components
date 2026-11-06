import { afterEach, expect, test, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { NDatePicker } from 'naive-ui'
import C_Select from '../../src/components/C_Select/index.vue'
import C_Form from '../../src/components/C_Form/index.vue'
import C_FormSearch from '../../src/components/C_FormSearch/index.vue'
import C_Date from '../../src/components/C_Date/index.vue'

const tokenString = '__c_option_boolean_true__'
const model = () => [false, tokenString]
const options = [{ label: 'Zero', value: 0 }]
const fallbackOption = () => ({
  label: '已保存的选项',
  class: 'custom-fallback',
})
const global = { stubs: { teleport: true } }
type Model = { tags: Array<string | number | boolean> }

afterEach(() => vi.useRealTimers())
async function clickZero(wrapper: VueWrapper) {
  await flushPromises()
  expect(wrapper.text()).toContain('已保存的选项')
  const option = wrapper
    .findAll('.n-base-select-option')
    .find(option => option.text() === 'Zero')!
  expect(option).toBeTruthy()
  await option.trigger('click')
  await flushPromises()
}

test('standalone select retains unloaded booleans and token-shaped strings with custom fallback', async () => {
  const wrapper = mount(C_Select, {
    attachTo: document.body,
    global,
    props: {
      multiple: true,
      modelValue: model(),
      options,
      fallbackOption,
      virtualScroll: false,
    },
    attrs: { show: true },
  })
  await clickZero(wrapper)
  expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([
    [false, tokenString, 0],
  ])
})

test('form select preserves the same values through its real native menu', async () => {
  const wrapper = mount(C_Form<Model>, {
    attachTo: document.body,
    global,
    props: {
      modelValue: { tags: model() },
      options: [
        {
          type: 'select',
          prop: 'tags',
          attrs: {
            options,
            multiple: true,
            fallbackOption,
            show: true,
            virtualScroll: false,
          },
        },
      ],
    },
  })
  await clickZero(wrapper)
  expect(wrapper.vm.getModel().tags).toEqual([false, tokenString, 0])
})

test('search select preserves the same values through its real native menu', async () => {
  const wrapper = mount(C_FormSearch<Model>, {
    attachTo: document.body,
    global,
    props: {
      modelValue: { tags: model() },
      formItemList: [
        {
          type: 'select',
          prop: 'tags',
          list: options,
          attrs: {
            multiple: true,
            fallbackOption,
            show: true,
            virtualScroll: false,
          },
        },
      ],
    },
  })
  await clickZero(wrapper)
  expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([
    { tags: [false, tokenString, 0] },
  ])
})

test('new free tags that resemble an internal token remain strings', async () => {
  const wrapper = mount(C_Select, {
    attachTo: document.body,
    global,
    props: {
      multiple: true,
      tag: true,
      filterable: true,
      modelValue: [false],
      options,
      fallbackOption,
      virtualScroll: false,
    },
    attrs: { show: true },
  })
  const input = wrapper.get('input')
  await input.setValue(tokenString)
  await flushPromises()
  const option = wrapper
    .findAll('.n-base-select-option')
    .find(option => option.text() === tokenString)!
  expect(option).toBeTruthy()
  await option.trigger('click')
  expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([
    [false, tokenString],
  ])
})

const today = new Date(2026, 10, 9, 12).getTime()
const day = (value: number) => new Date(2026, 10, value).getTime()

test.each(['date', 'datetime', 'daterange', 'datetimerange'] as const)(
  '%s combines business rules and both built-in boundaries, preserving native context',
  async mode => {
    vi.useFakeTimers()
    vi.setSystemTime(today)
    const business = vi.fn((timestamp: number) => timestamp === day(10))
    const wrapper = mount(C_Date, {
      props: { mode, disabledBeforeToday: true },
      attrs: { 'is-date-disabled': business },
    })
    const picker = wrapper.getComponent(NDatePicker)
    const check = picker.props('isDateDisabled') as (
      ...args: unknown[]
    ) => boolean
    const context = mode.includes('range')
      ? ['end', [day(9), day(12)]]
      : [{ type: 'date', year: 2026, month: 11, date: 10 }]
    expect(check(day(8), ...context)).toBe(true)
    expect(check(day(10), ...context)).toBe(true)
    expect(business).toHaveBeenLastCalledWith(day(10), ...context)
    expect(check(day(11), ...context)).toBe(false)
    await wrapper.setProps({
      disabledBeforeToday: false,
      disabledAfterToday: true,
    })
    expect(check(day(8), ...context)).toBe(false)
    expect(check(day(11), ...context)).toBe(true)
  }
)

test('smart range combines native detail, endpoint precedence, limits and input validation', async () => {
  vi.useFakeTimers()
  vi.setSystemTime(today)
  const common = vi.fn((timestamp: number) => timestamp === day(11))
  const startRule = vi.fn(
    (timestamp: number, detail: { type: string }) =>
      detail.type === 'date' && timestamp === day(10)
  )
  const wrapper = mount(C_Date, {
    props: {
      mode: 'smart-range',
      disabledBeforeToday: true,
      modelValue: ['2026-11-09', '2026-11-12'],
      startDateProps: { isDateDisabled: startRule },
    },
    attrs: { isDateDisabled: common },
  })
  const [start, end] = wrapper.findAllComponents(NDatePicker)
  const checkStart = start.props('isDateDisabled') as (
    ...args: unknown[]
  ) => boolean
  const checkEnd = end.props('isDateDisabled') as (
    ...args: unknown[]
  ) => boolean
  common.mockClear()
  startRule.mockClear()
  const detail = { type: 'date', year: 2026, month: 11, date: 10 }
  expect(checkStart(day(8), detail)).toBe(true)
  expect(checkStart(day(10), detail)).toBe(true)
  expect(startRule).toHaveBeenLastCalledWith(day(10), detail)
  expect(common).not.toHaveBeenCalled()
  expect(checkEnd(day(11), detail)).toBe(true)
  expect(common).toHaveBeenLastCalledWith(day(11), detail)
  start.vm.$emit('update:formattedValue', '2026-11-10', day(10))
  expect(startRule).toHaveBeenLastCalledWith(day(10), { type: 'input' })
  expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([
    ['2026-11-10', '2026-11-12'],
  ])
})
