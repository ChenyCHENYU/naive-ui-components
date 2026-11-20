import { mount } from '@vue/test-utils'
import { NInputNumber } from 'naive-ui'
import { describe, expect, test, vi } from 'vitest'
import C_ImageAnnotator from '../../src/components/C_ImageAnnotator/index.vue'
import type { ImageAnnotation } from '../../src/components/C_ImageAnnotator'

const image = 'https://files.example/inspection.png'
const saved: ImageAnnotation = {
  id: 'defect-1',
  box: { x: 0.2, y: 0.1, width: 0.1, height: 0.15 },
  note: '轻微划痕',
}
const initial = { src: image, alt: '质检照片' }

describe('C_ImageAnnotator', () => {
  test('支持反向拖绘，只有确认才发布相对原图的坐标和说明', async () => {
    const wrapper = mount(C_ImageAnnotator, { props: initial })
    await wrapper.vm.$nextTick()
    await wrapper.get('img').trigger('load')
    const canvas = wrapper.get<HTMLElement>('.c-image-annotator__canvas')
    vi.spyOn(canvas.element, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(50, 30, 200, 120)
    )
    await canvas.trigger('pointerdown', {
      pointerId: 1,
      button: 0,
      clientX: 210,
      clientY: 120,
    })
    await canvas.trigger('pointermove', {
      pointerId: 2,
      clientX: 100,
      clientY: 100,
    })
    await canvas.trigger('pointermove', {
      pointerId: 1,
      clientX: 90,
      clientY: 60,
    })
    expect(wrapper.find('.is-preview').exists()).toBe(true)
    await canvas.trigger('pointerup', {
      pointerId: 1,
      clientX: 90,
      clientY: 60,
    })
    await wrapper.get('textarea').setValue('需复核的划痕')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    await wrapper
      .findAll('button')
      .find(item => item.text() === '保存标注')!
      .trigger('click')
    const result =
      wrapper.emitted<[ImageAnnotation[]]>('update:modelValue')?.[0]?.[0]?.[0]
    expect(result?.note).toBe('需复核的划痕')
    expect(result?.box.x).toBeCloseTo(0.2)
    expect(result?.box.y).toBeCloseTo(0.25)
    expect(result?.box.width).toBeCloseTo(0.6)
    expect(result?.box.height).toBeCloseTo(0.5)
  })

  test('键盘入口与坐标输入标签完整，限制区域并保留纠错草稿', async () => {
    const wrapper = mount(C_ImageAnnotator, { props: initial })
    await wrapper.vm.$nextTick()
    await wrapper.get('img').trigger('load')
    const button = (name: string) =>
      wrapper.findAll('button').find(item => item.text() === name)!
    await button('添加标注').trigger('click')
    expect(
      wrapper
        .findAll('.c-image-annotator__coordinates label')
        .map(label =>
          wrapper.find(`input[id="${label.attributes('for')}"]`).exists()
        )
    ).toEqual([true, true, true, true])
    const [left, , width] = wrapper.findAllComponents(NInputNumber)
    left!.vm.$emit('update:value', 70)
    width!.vm.$emit('update:value', 90)
    await button('保存标注').trigger('click')
    expect(wrapper.get('[role=alert]').text()).toContain('完整位于图片内')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    width!.vm.$emit('update:value', 20)
    await button('保存标注').trigger('click')
    const result =
      wrapper.emitted<[ImageAnnotation[]]>('update:modelValue')?.[0]?.[0]?.[0]
    expect(result?.box.x).toBe(0.7)
    expect(result?.box.width).toBe(0.2)
  })

  test('拒绝覆盖外部更新，切换只读后保留当前标注', async () => {
    const wrapper = mount(C_ImageAnnotator, {
      props: { ...initial, modelValue: [saved] },
    })
    await wrapper.vm.$nextTick()
    await wrapper.get('img').trigger('load')
    await wrapper.get('.c-image-annotator__list button').trigger('click')
    await wrapper.get('textarea').setValue('本地修改')
    await wrapper.setProps({ modelValue: [{ ...saved, note: '外部更新' }] })
    await wrapper
      .findAll('button')
      .find(item => item.text() === '保存标注')!
      .trigger('click')
    expect(wrapper.get('[role=alert]').text()).toContain('已更新')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    await wrapper.setProps({ readonly: true })
    expect(wrapper.find('textarea').exists()).toBe(false)
    expect(wrapper.get('.c-image-annotator__note').text()).toBe('外部更新')
  })

  test('图片更换时清理本地预览资源，非法地址及加载失败不会允许编辑', async () => {
    const file = new File(['image'], '检验.png', { type: 'image/png' })
    const create = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:inspection')
    const revoke = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => undefined)
    const wrapper = mount(C_ImageAnnotator, {
      props: { ...initial, src: file },
    })
    await wrapper.vm.$nextTick()
    expect(create).toHaveBeenCalledWith(file)
    expect(wrapper.get('img').attributes('src')).toBe('blob:inspection')
    await wrapper.get('img').trigger('error')
    expect(wrapper.get('[role=status]').text()).toContain('图片加载失败')
    await wrapper.get('[role=status] button').trigger('click')
    expect(wrapper.find('img').exists()).toBe(true)
    await wrapper.setProps({ src: 'javascript:void(0)' })
    expect(revoke).toHaveBeenCalledWith('blob:inspection')
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.get('[role=status]').text()).toContain('暂无可用')
    expect(wrapper.get('header button').attributes('disabled')).toBeDefined()
  })
})
