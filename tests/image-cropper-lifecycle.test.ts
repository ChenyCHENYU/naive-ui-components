import { expect, test } from 'bun:test'
import { effectScope } from 'vue'
import { useCropperCore } from '../src/components/C_ImageCropper/composables/useCropperCore'

test('disposing a crop scope immediately settles its pending export and ignores a late snapshot', async () => {
  const scope = effectScope()
  const core = scope.run(() => useCropperCore())!
  let deliver!: (canvas: HTMLCanvasElement) => void
  let encodes = 0
  core.cropperRef.value = {
    getCropChecked(callback) {
      deliver = callback
    },
  } as never
  const result = core.getCropResult().catch(error => error as Error)
  scope.stop()
  expect(await result).toBeInstanceOf(Error)
  expect((await result).message).toContain('disposed')
  deliver({
    width: 10,
    height: 10,
    toDataURL: () => {
      encodes++
      return ''
    },
  } as HTMLCanvasElement)
  expect(encodes).toBe(0)
  await expect(core.getCropResult()).rejects.toThrow('disposed')
})

test('disposing during Blob encoding rejects the promise once and drops a late encoded result', async () => {
  const scope = effectScope()
  const core = scope.run(() => useCropperCore())!
  let deliverBlob!: BlobCallback
  const canvas = {
    width: 10,
    height: 10,
    toDataURL: () => 'data:image/png;base64,crop',
    toBlob: (callback: BlobCallback) => {
      deliverBlob = callback
    },
  } as HTMLCanvasElement
  core.cropperRef.value = {
    getCropChecked: (callback: (canvas: HTMLCanvasElement) => void) =>
      callback(canvas),
  } as never
  const result = core.getCropResult().catch(error => error as Error)
  scope.stop()
  deliverBlob(new Blob(['late']))
  expect((await result).message).toContain('disposed')
})
