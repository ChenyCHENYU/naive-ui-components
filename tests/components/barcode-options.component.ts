import { beforeEach, describe, expect, test, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import C_Barcode from '../../src/components/C_Barcode/index.vue'

const context = {
  save: () => {},
  restore: () => {},
  clearRect: () => {},
  translate: () => {},
  fillRect: vi.fn(),
  fillText: vi.fn(),
  measureText: () => ({ width: 10 }),
}
beforeEach(() => {
  context.fillRect.mockClear()
  context.fillText.mockClear()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    context as unknown as CanvasRenderingContext2D
  )
})

describe('C_Barcode actual vendor options', () => {
  test('size, bar width, displayValue and colors reach the barcode renderer', async () => {
    const wrapper = mount(C_Barcode, {
      props: {
        value: '123456',
        height: 37,
        width: 1,
        showText: false,
        lineColor: '#123456',
        background: '#fafafa',
      },
    })
    await nextTick()
    const canvas = wrapper.get('canvas').element as HTMLCanvasElement
    expect(canvas.height).toBe(57)
    expect(
      context.fillRect.mock.calls.some(call => call[2] === 1 && call[3] === 37)
    ).toBe(true)
    expect(context.fillText).not.toHaveBeenCalled()
    const { width } = canvas
    await wrapper.setProps({
      width: 2,
      showText: true,
      fontSize: 22,
      textPosition: 'top',
    })
    await nextTick()
    expect(canvas.width).toBeGreaterThan(width)
    expect(context.fillText).toHaveBeenCalled()
    expect(canvas.getAttribute('format')).toBeNull()
  })

  test('invalid format content emits an error, hides stale pixels and recovers after correction', async () => {
    const wrapper = mount(C_Barcode, {
      props: { value: '1234567', format: 'EAN8' },
    })
    await nextTick()
    expect(wrapper.emitted('error')).toBeUndefined()
    await wrapper.setProps({ value: 'abc' })
    await nextTick()
    const error = wrapper.emitted('error')?.[0]?.[0]
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toContain('EAN8')
    expect(wrapper.get('canvas').attributes('style')).toContain('display: none')
    await wrapper.setProps({ value: '1234567' })
    await nextTick()
    expect(wrapper.get('canvas').attributes('style') ?? '').not.toContain(
      'display: none'
    )
    expect(wrapper.emitted('error')).toHaveLength(1)
  })
})
