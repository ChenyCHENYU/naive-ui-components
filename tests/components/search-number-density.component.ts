/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-28
 * @FilePath: \naive-ui-components\tests\components\search-number-density.component.ts
 * @Description: 搜索密度继承与紧凑数字字段的真实控件交互回归
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */
import { expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { NButton, NForm, NInput, NInputNumber } from 'naive-ui'
import C_Form from '../../src/components/C_Form/index.vue'
import C_FormSearchComponent from '../../src/components/C_FormSearch/index.vue'
import {
  FORM_GLOBAL_CONFIG_KEY,
  type FormConfig,
} from '../../src/components/C_Form/composables/useFormConfig'
import type { SearchFormParams } from '../../src/components/C_FormSearch/types'

const C_FormSearch = C_FormSearchComponent<SearchFormParams>

test('搜索只继承全局密度，局部密度、显式尺寸和字段样式保持优先', async () => {
  const submit = vi.fn()
  const globalConfig = reactive<FormConfig>({
    density: 'compact',
    size: 'large',
    layout: 'steps',
    disabled: true,
    onSubmit: submit,
  })
  const wrapper = mount(C_FormSearch, {
    props: {
      formItemList: [
        { type: 'input', prop: 'draft', placeholder: '搜索草稿' },
        {
          type: 'input',
          prop: 'explicit',
          attrs: { size: 'large', style: 'width:312px' },
        },
        { type: 'input', prop: 'extra' },
      ],
      modelValue: { draft: '', explicit: '', extra: '' },
      config: { foldThreshold: 2 },
    },
    global: { provide: { [FORM_GLOBAL_CONFIG_KEY as symbol]: globalConfig } },
  })
  expect(wrapper.findComponent(NForm).props('size')).toBe('small')
  expect(wrapper.findAllComponents(NInput)[0].props('size')).toBe('small')
  expect(
    wrapper.findAllComponents(NInput)[0].get<HTMLInputElement>('input').element
      .disabled
  ).toBe(false)
  expect(wrapper.findAllComponents(NInput)[1].props('size')).toBe('large')
  expect(wrapper.findAllComponents(NInput)[1].attributes('style')).toContain(
    'width: 312px'
  )
  expect(wrapper.attributes('style')).toContain('--c-search-field-width: 208px')
  expect(wrapper.attributes('style')).toContain('--c-search-padding: 12px')
  expect(
    wrapper
      .findAllComponents(NButton)
      .every(button => button.props('size') === 'small')
  ).toBe(true)
  const extra = wrapper.findAllComponents(NInput)[2].vm.$.uid
  await wrapper.get('input[placeholder="搜索草稿"]').setValue('未提交草稿')
  await wrapper.get('[aria-label="展开搜索条件"]').trigger('click')
  await wrapper.setProps({
    config: { density: 'comfortable', foldThreshold: 2 },
  })
  expect(wrapper.findAllComponents(NInput)[2].vm.$.uid).toBe(extra)
  expect(
    wrapper.get<HTMLInputElement>('input[placeholder="搜索草稿"]').element.value
  ).toBe('未提交草稿')
  expect(wrapper.find('[aria-label="收起搜索条件"]').exists()).toBe(true)
  expect(wrapper.findComponent(NForm).props('size')).toBe('large')
  expect(wrapper.attributes('style')).not.toContain('--c-search-field-width')
  await wrapper.setProps({ size: 'small' })
  expect(wrapper.findComponent(NForm).props('size')).toBe('small')
  expect(wrapper.findAllComponents(NInput)[1].props('size')).toBe('large')
  expect(submit).not.toHaveBeenCalled()
})

test('没有全局或局部密度时保留旧搜索外观，全局只给size也不外溢', () => {
  const wrapper = mount(C_FormSearch, {
    props: { formItemList: [{ type: 'input', prop: 'keyword' }] },
    global: {
      provide: { [FORM_GLOBAL_CONFIG_KEY as symbol]: { size: 'large' } },
    },
  })
  expect(wrapper.findComponent(NForm).props('size')).toBe('medium')
  expect(wrapper.attributes('style') ?? '').not.toContain('--c-search-')
  expect(wrapper.classes()).not.toContain('form-search-card--compact')
})

interface Quantity {
  amount: number | null
}

/** 挂载实际数字输入，不替换 Naive UI 的值转换、步进或限值逻辑。 */
async function numberField(
  config: FormConfig<Quantity> = { density: 'compact' },
  attrs: Record<string, unknown> = {},
  value: number | null = 0.1
) {
  const wrapper = mount(C_Form<Quantity>, {
    props: {
      modelValue: { amount: value },
      options: [
        {
          type: 'inputNumber',
          prop: 'amount',
          label: '数量',
          attrs: { min: 0, max: 0.3, step: 0.1, precision: 1, ...attrs },
        },
      ],
      config: { showActions: false, ...config },
    },
  })
  await vi.waitFor(() =>
    expect(wrapper.findComponent(NInputNumber).exists()).toBe(true)
  )
  await flushPromises()
  return wrapper
}

test('紧凑数字输入隐藏默认按钮，文本输入保留小数键盘步进和上下限', async () => {
  const wrapper = await numberField()
  const number = wrapper.findComponent(NInputNumber)
  const input = number.get<HTMLInputElement>('input')
  expect(number.props('showButton')).toBe(false)
  expect(number.findAll('button')).toHaveLength(0)
  expect(input.attributes('type')).toBe('text')
  expect(input.attributes('role')).toBe('spinbutton')
  expect(input.attributes('inputmode')).toBe('decimal')
  expect(input.attributes('aria-label')).toBe('数量')
  expect(input.attributes('aria-valuemin')).toBe('0')
  expect(input.attributes('aria-valuemax')).toBe('0.3')
  expect(input.attributes('aria-valuenow')).toBe('0.1')
  await input.trigger('keydown', { key: 'ArrowUp' })
  expect(wrapper.vm.formModel.amount).toBe(0.2)
  expect(input.attributes('aria-valuenow')).toBe('0.2')
  await input.trigger('keydown', { key: 'ArrowUp' })
  await input.trigger('keydown', { key: 'ArrowUp' })
  expect(wrapper.vm.formModel.amount).toBe(0.3)
  await input.trigger('keydown', { key: 'ArrowDown' })
  await input.trigger('keydown', { key: 'ArrowDown' })
  await input.trigger('keydown', { key: 'ArrowDown' })
  await input.trigger('keydown', { key: 'ArrowDown' })
  expect(wrapper.vm.formModel.amount).toBe(0)
  expect(input.attributes('aria-valuenow')).toBe('0')
})

test('字段显式按钮和原生属性优先，非紧凑模式保留原默认按钮', async () => {
  const explicit = await numberField(
    { density: 'compact' },
    {
      showButton: true,
      size: 'large',
      precision: 0,
      inputProps: {
        'aria-label': '发货数量',
        'aria-describedby': 'quantity-help',
        inputmode: 'decimal',
      },
    },
    null
  )
  const number = explicit.findComponent(NInputNumber)
  expect(number.props('showButton')).toBe(true)
  expect(number.findAll('button')).toHaveLength(2)
  expect(number.props('size')).toBe('large')
  expect(number.get('input').attributes('aria-label')).toBe('发货数量')
  expect(number.get('input').attributes('aria-describedby')).toBe(
    'quantity-help'
  )
  expect(number.get('input').attributes('aria-valuenow')).toBeUndefined()
  expect(number.get('input').attributes('inputmode')).toBe('decimal')
  const standard = await numberField({ density: 'default' })
  expect(standard.findComponent(NInputNumber).props('showButton')).toBe(true)
})

test.each(['disabled', 'readonly'] as const)(
  '紧凑数字字段保留%s反馈与模型保护',
  async flag => {
    const wrapper = await numberField({ density: 'compact', [flag]: true })
    const input = wrapper
      .findComponent(NInputNumber)
      .get<HTMLInputElement>('input')
    expect(input.element[flag === 'readonly' ? 'readOnly' : 'disabled']).toBe(
      true
    )
    await input.trigger('keydown', { key: 'ArrowUp' })
    expect(wrapper.vm.formModel.amount).toBe(0.1)
    expect(input.element.value).toBe('0.1')
  }
)
