import { describe, expect, test } from 'bun:test'
import { ref } from 'vue'
import { useCropperCore } from '../src/components/C_ImageCropper/composables/useCropperCore'
import { flipImageSource } from '../src/components/C_ImageCropper/flipImageSource'

function mockCanvas(width: number, height: number, blob: Blob | null) {
  return {
    width,
    height,
    toDataURL: (mime: string) => `data:${mime};base64,snapshot`,
    toBlob: (callback: (result: Blob | null) => void) => callback(blob),
  } as unknown as HTMLCanvasElement
}

describe('C_ImageCropper result contract', () => {
  test('base64 and Blob come from the same crop snapshot', async () => {
    const core = useCropperCore({ format: ref('jpeg'), quality: ref(0.8) })
    const source = mockCanvas(80, 40, new Blob(['same-snapshot']))
    let snapshots = 0
    core.cropperRef.value = {
      getCropChecked(callback) {
        snapshots++
        callback(source)
      },
    } as never

    const result = await core.getCropResult()
    expect(snapshots).toBe(1)
    expect(result.base64).toBe('data:image/jpeg;base64,snapshot')
    expect(await result.blob.text()).toBe('same-snapshot')
    expect([result.width, result.height, result.format]).toEqual([
      80,
      40,
      'jpeg',
    ])
  })

  test('fails instead of returning a result with a null Blob', async () => {
    const core = useCropperCore()
    core.cropperRef.value = {
      getCropChecked(callback) {
        callback(mockCanvas(20, 20, null))
      },
    } as never
    await expect(core.getCropResult()).rejects.toThrow('could not be encoded')
  })

  test('applies both output limits to the same encoded canvas', async () => {
    const previousDocument = globalThis.document
    const output = mockCanvas(0, 0, new Blob(['resized']))
    const draws: unknown[][] = []
    output.getContext = () =>
      ({
        drawImage: (...args: unknown[]) => draws.push(args),
      }) as CanvasRenderingContext2D
    Object.assign(globalThis, {
      document: { createElement: () => output },
    })
    try {
      const core = useCropperCore({ maxWidth: ref(100), maxHeight: ref(40) })
      const source = mockCanvas(200, 100, new Blob(['original']))
      core.cropperRef.value = {
        getCropChecked(callback) {
          callback(source)
        },
      } as never
      const result = await core.getCropResult()
      expect([result.width, result.height]).toEqual([80, 40])
      expect(draws).toEqual([[source, 0, 0, 80, 40]])
      expect(await result.blob.text()).toBe('resized')
    } finally {
      Object.assign(globalThis, { document: previousDocument })
    }
  })

  test('reports empty and thrown crop snapshots', async () => {
    const core = useCropperCore()
    core.cropperRef.value = {
      getCropChecked(callback) {
        callback(mockCanvas(0, 0, new Blob()))
      },
    } as never
    await expect(core.getCropResult()).rejects.toThrow('empty')
    core.cropperRef.value = {
      getCropChecked() {
        throw new Error('canvas failed')
      },
    } as never
    await expect(core.getCropResult()).rejects.toThrow('canvas failed')
  })

  test('horizontal flip transforms the actual source pixels', async () => {
    const previousImage = globalThis.Image
    const previousDocument = globalThis.document
    const operations: unknown[][] = []
    class FakeImage {
      naturalWidth = 10
      naturalHeight = 20
      crossOrigin = ''
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_value: string) {
        this.onload?.()
      }
    }
    const fakeCanvas = {
      width: 0,
      height: 0,
      getContext: () => ({
        translate: (...args: unknown[]) =>
          operations.push(['translate', ...args]),
        scale: (...args: unknown[]) => operations.push(['scale', ...args]),
        drawImage: (...args: unknown[]) =>
          operations.push(['drawImage', ...args]),
      }),
      toDataURL: () => 'data:image/png;base64,flipped',
    }
    Object.assign(globalThis, {
      Image: FakeImage,
      document: { createElement: () => fakeCanvas },
    })
    try {
      expect(
        await flipImageSource('https://example.com/image.png', 'horizontal')
      ).toBe('data:image/png;base64,flipped')
      expect([fakeCanvas.width, fakeCanvas.height]).toEqual([10, 20])
      expect(operations.slice(0, 2)).toEqual([
        ['translate', 10, 0],
        ['scale', -1, 1],
      ])
    } finally {
      Object.assign(globalThis, {
        Image: previousImage,
        document: previousDocument,
      })
    }
  })
})
