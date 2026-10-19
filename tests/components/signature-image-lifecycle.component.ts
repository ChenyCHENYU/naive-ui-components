import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import C_Signature from '../../src/components/C_Signature/index.vue'
import type { SignatureStroke } from '../../src/components/C_Signature/types'

class PendingImage {
  static instances: PendingImage[] = []
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  crossOrigin = ''
  src = ''
  constructor() {
    PendingImage.instances.push(this)
  }
}
const drawnImages: PendingImage[] = []
const context = {
  scale: () => {},
  clearRect: () => {},
  drawImage: (image: PendingImage) => drawnImages.push(image),
  save: () => {},
  restore: () => {},
  beginPath: () => {},
  moveTo: () => {},
  lineTo: () => {},
  stroke: () => {},
}
beforeEach(() => {
  PendingImage.instances = []
  drawnImages.length = 0
  vi.stubGlobal('Image', PendingImage)
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    context as unknown as CanvasRenderingContext2D
  )
})
afterEach(() => vi.unstubAllGlobals())

function mountSignature() {
  return mount(C_Signature, {
    props: { showToolbar: false },
  })
}
const stroke: SignatureStroke = {
  points: [
    { x: 1, y: 2 },
    { x: 3, y: 4 },
  ],
  color: '#000000',
  width: 2,
  opacity: 1,
  mode: 'pen',
}

describe('C_Signature image loading', () => {
  test('out-of-order imports retain the latest selected image', async () => {
    const wrapper = mountSignature()
    const oldImport = wrapper.vm.loadImage('/old.png')
    const newImport = wrapper.vm.loadImage('/new.png')
    const [oldImage, newImage] = PendingImage.instances
    newImage.onload!()
    await newImport
    expect(wrapper.vm.isEmpty()).toBe(false)
    expect(drawnImages.at(-1)).toBe(newImage)
    oldImage.onload!()
    await oldImport
    expect(drawnImages.at(-1)).toBe(newImage)
  })

  test('clear and explicit stroke loading invalidate pending image imports', async () => {
    const wrapper = mountSignature()
    const pendingClear = wrapper.vm.loadImage('/clear.png')
    wrapper.vm.clear()
    PendingImage.instances[0].onload!()
    await pendingClear
    expect(wrapper.vm.isEmpty()).toBe(true)
    const pendingData = wrapper.vm.loadImage('/replace.png')
    wrapper.vm.loadSignatureData([stroke])
    PendingImage.instances[1].onload!()
    await pendingData
    expect(wrapper.vm.getSignatureData()).toEqual([stroke])
    expect(drawnImages).toHaveLength(0)
  })

  test('unmount ignores late imports and stale background errors', async () => {
    const wrapper = mountSignature()
    await wrapper.setProps({ backgroundImage: '/background.png' })
    const background = PendingImage.instances[0]
    const pending = wrapper.vm.loadImage('/import.png')
    const imported = PendingImage.instances[1]
    const changes = wrapper.emitted('change')?.length ?? 0
    wrapper.unmount()
    imported.onload!()
    background.onerror!()
    await pending
    await flushPromises()
    expect(drawnImages).toHaveLength(0)
    expect(wrapper.emitted('change')?.length ?? 0).toBe(changes)
    expect(wrapper.emitted('error')).toBeUndefined()
  })
})
