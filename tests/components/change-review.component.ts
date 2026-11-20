import { mount } from '@vue/test-utils'
import { describe, expect, test } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import C_ChangeReview from '../../src/components/C_ChangeReview/index.vue'
import type {
  ChangeReviewField,
  ChangeReviewKey,
} from '../../src/components/C_ChangeReview'

interface Contract {
  weight: number
  note: string | null
  important: boolean
  grade: string
  tags: string[]
}

const baseline: Partial<Contract> = {
  weight: 0,
  note: '',
  grade: 'Q355',
  tags: ['物流'],
}
const proposal: Partial<Contract> = {
  weight: 103.12,
  note: null,
  important: false,
  tags: ['物流'],
}
const fields = [
  {
    key: 'weight',
    label: '数量',
    group: '交付',
    format: value =>
      value === undefined ? undefined : `${value.toFixed(3)} t`,
  },
  { key: 'note', label: '备注', group: '交付' },
  { key: 'important', label: '重点订单', group: '交付', disabled: true },
  { key: 'grade', label: '钢种' },
  {
    key: 'tags',
    label: '标签',
    equal: (left, right) =>
      left?.length === right?.length &&
      (left?.every((tag, index) => tag === right?.[index]) ?? true),
  },
] satisfies readonly ChangeReviewField<Contract>[]

describe('C_ChangeReview', () => {
  test('有类型的字段格式化，区分未提供、空值、空字符串和零值', async () => {
    const wrapper = mount(C_ChangeReview<Contract>, {
      props: {
        before: baseline,
        after: proposal,
        fields,
        beforeLabel: '当前草稿',
        afterLabel: '合同参考值',
      },
    })
    expect(wrapper.find('footer').exists()).toBe(false)
    expect(wrapper.get('thead').text()).toContain('合同参考值')
    expect(wrapper.get('th[scope="rowgroup"]').text()).toBe('交付')
    expect(wrapper.findAll('th[scope="row"]').map(cell => cell.text())).toEqual(
      ['数量', '备注', '重点订单', '钢种']
    )
    const values = wrapper
      .findAll('.c-change-review__value')
      .map(cell => cell.text())
    expect(values).toEqual([
      '0.000 t',
      '103.120 t',
      '""',
      '空值',
      '未提供',
      'false',
      'Q355',
      '未提供',
    ])

    await wrapper.get('[role="checkbox"]').trigger('click')
    expect(
      wrapper.findAll('th[scope="row"]').map(cell => cell.text())
    ).toContain('标签')
    expect(wrapper.findAll('.c-change-review__status').at(-1)?.text()).toBe(
      '一致'
    )
  })

  test('仅有效字段可采纳，支持键盘取消选择并按字段顺序发出键', async () => {
    const keys = ref<ChangeReviewKey<Contract>[]>([
      'grade',
      'note',
      'note',
      'important',
    ])
    const applied = ref<ChangeReviewKey<Contract>[]>([])
    const Host = defineComponent(
      () => () =>
        h(C_ChangeReview<Contract>, {
          before: baseline,
          after: proposal,
          fields,
          selectable: true,
          selectedKeys: keys.value,
          'onUpdate:selectedKeys': next => (keys.value = next),
          onApply: next => (applied.value = next),
        })
    )
    const wrapper = mount(Host)
    expect(wrapper.find('[aria-label="采纳 钢种"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="采纳 重点订单"]').exists()).toBe(false)
    const note = wrapper.get('[role="checkbox"][aria-label="采纳 备注"]')
    expect(note.attributes('aria-checked')).toBe('true')
    expect(wrapper.get('footer [role="status"]').text()).toBe('已选 1 项')
    await wrapper.get('footer button').trigger('click')
    expect(applied.value).toEqual(['note'])

    await wrapper
      .get('[role="checkbox"][aria-label="采纳 数量"]')
      .trigger('click')
    await wrapper.get('footer button').trigger('click')
    expect(applied.value).toEqual(['weight', 'note'])
    await note.trigger('keydown', { key: ' ', code: 'Space' })
    await note.trigger('keyup', { key: ' ', code: 'Space' })
    expect(keys.value).toEqual(['weight'])
  })

  test('候选重新匹配后排除失效选择，禁用期间保持只读', async () => {
    const wrapper = mount(C_ChangeReview<Contract>, {
      props: {
        before: baseline,
        after: proposal,
        fields,
        selectedKeys: ['weight'],
        selectable: true,
        disabled: true,
      },
    })
    expect(wrapper.get('footer button').attributes('disabled')).toBeDefined()
    await wrapper.get('[aria-label="采纳 备注"]').trigger('click')
    expect(wrapper.emitted('update:selectedKeys')).toBeUndefined()
    await wrapper.setProps({
      disabled: false,
      after: { ...proposal, weight: baseline.weight },
    })
    expect(wrapper.get('footer [role="status"]').text()).toBe('已选 0 项')
    expect(wrapper.get('footer button').attributes('disabled')).toBeDefined()
    expect(wrapper.emitted('apply')).toBeUndefined()
  })

  test('空结果与重复字段稳定展示，支持本地语言和自定义值槽', async () => {
    const note = {
      key: 'note',
      label: 'Contract note',
    } satisfies ChangeReviewField<Contract>
    const wrapper = mount(C_ChangeReview<Contract>, {
      props: {
        before: { note: '<img>' },
        after: { note: '<img>' },
        fields: [note, note],
        locale: { locale: 'en-US' },
      },
      slots: {
        value: ({ side, value }) => h('em', `${side}: ${value}`),
      },
    })
    expect(wrapper.text()).toContain('No field changes')
    await wrapper.get('[role="checkbox"]').trigger('click')
    expect(wrapper.findAll('th[scope="row"]')).toHaveLength(1)
    expect(wrapper.get('em').text()).toBe('before: <img>')
    expect(wrapper.find('img').exists()).toBe(false)
    await wrapper.setProps({ fields: [] })
    expect(wrapper.text()).toContain('No fields to review')
    expect(wrapper.find('[role="checkbox"]').exists()).toBe(false)
  })
})
