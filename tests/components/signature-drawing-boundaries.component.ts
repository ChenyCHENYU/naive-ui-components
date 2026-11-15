import { expect, test, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { NButton } from 'naive-ui'
import Signature from '../../src/components/C_Signature/index.vue'
import type { SignatureStroke } from '../../src/components/C_Signature/types'

function drawingContext() {
  const widths: number[] = []
  const dots: { x: number; y: number; radius: number; opacity: number }[] = []
  const ctx = {
    lineWidth: 0,
    globalAlpha: 1,
    scale() {},
    clearRect() {},
    drawImage() {},
    save() {},
    restore() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    fill() {},
    arc(x: number, y: number, radius: number) {
      dots.push({ x, y, radius, opacity: this.globalAlpha })
    },
    stroke() {
      widths.push(this.lineWidth)
    },
    getImageData() {
      return { data: new Uint8ClampedArray([1]) }
    },
  }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    ctx as unknown as CanvasRenderingContext2D
  )
  return { widths, dots }
}

test('configured eraser size is recorded and replayed independently of later configuration', async () => {
  const { widths } = drawingContext()
  const wrapper = mount(Signature, { props: { eraserConfig: { size: 60 } } })
  await wrapper
    .findAllComponents(NButton)
    .find(button => button.text() === '橡皮擦')!
    .trigger('click')
  const canvas = wrapper.get('canvas')
  await canvas.trigger('mousedown', { clientX: 10, clientY: 10 })
  await canvas.trigger('mousemove', { clientX: 20, clientY: 20 })
  await canvas.trigger('mouseup', { clientX: 20, clientY: 20 })
  expect(widths).toEqual([60, 60])
  const data = wrapper.vm.getSignatureData()
  expect(data[0].eraserSize).toBe(60)
  await wrapper.setProps({ eraserConfig: { size: 100 } })
  expect(wrapper.vm.undo()).toBe(true)
  expect(wrapper.vm.redo()).toBe(true)
  expect(widths.at(-1)).toBe(60)
  wrapper.vm.loadSignatureData(data)
  expect(widths.at(-1)).toBe(60)
})

test('legacy eraser snapshots preserve the original 20px effect', () => {
  const { widths } = drawingContext()
  const wrapper = mount(Signature, {
    props: { showToolbar: false, eraserConfig: { size: 80 } },
  })
  const legacy: SignatureStroke = {
    points: [
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ],
    color: '#000',
    width: 2,
    opacity: 1,
    mode: 'eraser',
  }
  wrapper.vm.loadSignatureData([legacy])
  expect(widths).toEqual([20])
  expect(wrapper.vm.getSignatureData()).toEqual([legacy])
})

test('single-point ink uses the same radius and opacity in live drawing and history replay', async () => {
  const { dots } = drawingContext()
  const wrapper = mount(Signature, {
    props: { showToolbar: false, penConfig: { width: 8, opacity: 0.5 } },
  })
  const canvas = wrapper.get('canvas')
  await canvas.trigger('mousedown', { clientX: 10, clientY: 12 })
  await canvas.trigger('mouseup', { clientX: 10, clientY: 12 })
  expect(wrapper.vm.isEmpty()).toBe(false)
  expect(wrapper.vm.getSignatureData()[0].points).toHaveLength(1)
  expect(dots).toEqual([
    { x: 10, y: 12, radius: 4, opacity: 0.5 },
    { x: 10, y: 12, radius: 4, opacity: 0.5 },
  ])
  wrapper.vm.undo()
  wrapper.vm.redo()
  expect(dots.at(-1)).toEqual({ x: 10, y: 12, radius: 4, opacity: 0.5 })
})

test.each([0, -1, NaN, Infinity])(
  'invalid eraser size %s uses the compatible default',
  async size => {
    const { dots } = drawingContext()
    const wrapper = mount(Signature, { props: { eraserConfig: { size } } })
    await wrapper
      .findAllComponents(NButton)
      .find(button => button.text() === '橡皮擦')!
      .trigger('click')
    await wrapper.get('canvas').trigger('mousedown', { clientX: 1, clientY: 2 })
    await wrapper.get('canvas').trigger('mouseup', { clientX: 1, clientY: 2 })
    expect(dots.at(-1)?.radius).toBe(10)
    expect(wrapper.vm.getSignatureData()[0].eraserSize).toBe(20)
  }
)
