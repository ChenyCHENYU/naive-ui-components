import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { createRenderer, h, nextTick, ref } from 'vue'
import { useQRCode } from '../src/components/C_QRCode/composables/useQRCode'
import type { LogoOptions, RenderMode } from '../src/components/C_QRCode/types'

const renderer = createRenderer({
  patchProp: () => {},
  insert: () => {},
  remove: () => {},
  createElement: () => ({}),
  createText: () => ({}),
  createComment: () => ({}),
  setText: () => {},
  setElementText: () => {},
  parentNode: () => null,
  nextSibling: () => null,
})
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
const originalDocument = globalThis.document
const originalImage = globalThis.Image
const cleanups: Array<() => void> = []
const paintedImages: unknown[] = []
let restored = 0
let clicked = 0
let drawingError: Error | undefined
const context = {
  createImageData: (width: number, height: number) => ({
    data: new Uint8ClampedArray(width * height * 4),
  }),
  clearRect: () => {},
  putImageData: () => {},
  save: () => {},
  beginPath: () => {},
  moveTo: () => {},
  arcTo: () => {},
  closePath: () => {},
  fill: () => {},
  clip: () => {},
  drawImage: (image: unknown) => {
    if (drawingError) throw drawingError
    paintedImages.push(image)
  },
  restore: () => {
    restored++
  },
}
beforeEach(() => {
  PendingImage.instances = []
  paintedImages.length = 0
  restored = 0
  clicked = 0
  drawingError = undefined
  Object.assign(globalThis, {
    Image: PendingImage,
    document: {
      createElement: (tag: string) =>
        tag === 'a'
          ? {
              click: () => {
                clicked++
              },
              remove: () => {},
            }
          : {
              width: 0,
              height: 0,
              style: {},
              getContext: () => context,
              toDataURL: () => 'data:image/png;base64,rendered',
            },
      body: { appendChild: () => {} },
    },
  })
})
afterEach(() => {
  cleanups.splice(0).forEach(cleanup => cleanup())
  Object.assign(globalThis, {
    Image: originalImage,
    document: originalDocument,
  })
})
function mountQRCode(initialMode: RenderMode = 'svg') {
  let qr!: ReturnType<typeof useQRCode>
  const value = ref('original')
  const logo = ref<LogoOptions | undefined>({ src: '/original.png' })
  const mode = ref(initialMode)
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => context,
  } as unknown as HTMLCanvasElement
  const app = renderer.createApp({
    setup() {
      qr = useQRCode(ref(canvas), {
        value,
        logo,
        size: ref(120),
        color: ref('#000000'),
        bgColor: ref('#ffffff'),
        errorCorrectionLevel: ref('M'),
        margin: ref(2),
        mode,
      })
      return () => h('div')
    },
  })
  app.mount({})
  cleanups.push(() => app.unmount())
  return { qr, value, logo, mode, canvas, unmount: () => app.unmount() }
}
async function flushRendering() {
  await nextTick()
  await Promise.resolve()
  await Promise.resolve()
}
function expectReleased(image: PendingImage) {
  expect(image.onload).toBeNull()
  expect(image.onerror).toBeNull()
  expect(image.src).toBe('')
}

describe('C_QRCode cancellable logo tasks', () => {
  test('replacing a render releases its Image and settles its Promise without stale state', async () => {
    const { qr, logo } = mountQRCode()
    const oldRender = qr.render()
    await flushRendering()
    const oldImage = PendingImage.instances[0]
    const lateLoad = oldImage.onload!
    logo.value = { src: '/new.png' }
    await flushRendering()
    await oldRender
    expectReleased(oldImage)
    expect(qr.loading.value).toBe(true)
    expect(qr.error.value).toBeNull()
    lateLoad()
    expect(paintedImages).toHaveLength(0)
    const currentImage = PendingImage.instances[1]
    currentImage.onload!()
    await flushRendering()
    await flushRendering()
    expect(qr.loading.value).toBe(false)
    expect(qr.svgTrusted.value).toBe(true)
    expect(qr.svgHtml.value).toContain('data:image/png;base64,rendered')
    expectReleased(currentImage)
  })

  test('successful canvas rendering and subsequent SVG mode keep their existing visual contracts', async () => {
    const { qr, mode, logo, canvas } = mountQRCode('canvas')
    const rendering = qr.render()
    await flushRendering()
    const image = PendingImage.instances[0]
    image.onload!()
    await rendering
    expect(canvas.width).toBe(120)
    expect(canvas.height).toBe(120)
    expect(qr.svgHtml.value).toBe('')
    expect(qr.svgTrusted.value).toBe(false)
    expectReleased(image)
    mode.value = 'svg'
    logo.value = undefined
    await flushRendering()
    await flushRendering()
    expect(qr.svgHtml.value).toContain('<svg')
    expect(qr.svgTrusted.value).toBe(false)
    expect(canvas.width).toBe(0)
    expect(canvas.height).toBe(0)
  })

  test('clearing a value cancels the pending logo and leaves an empty, non-error visual', async () => {
    const { qr, value } = mountQRCode()
    const rendering = qr.render()
    await flushRendering()
    const image = PendingImage.instances[0]
    value.value = ''
    await flushRendering()
    await rendering
    expectReleased(image)
    expect(qr.svgHtml.value).toBe('')
    expect(qr.svgTrusted.value).toBe(false)
    expect(qr.loading.value).toBe(false)
    expect(qr.error.value).toBeNull()
  })

  test('concurrent exports retain their snapshots and are independent of render replacement', async () => {
    const { qr, value, logo } = mountQRCode()
    const rendering = qr.render()
    const png = qr.toDataURL('png')
    const svg = qr.toDataURL('svg')
    await flushRendering()
    const [renderImage, pngImage, svgImage] = PendingImage.instances
    value.value = 'replacement'
    logo.value = { src: '/replacement.png' }
    await flushRendering()
    await rendering
    expectReleased(renderImage)
    expect(pngImage.src).toBe('/original.png')
    expect(svgImage.src).toBe('/original.png')
    pngImage.onload!()
    svgImage.onload!()
    expect(await png).toBe('data:image/png;base64,rendered')
    const exportedSvg = decodeURIComponent((await svg).split(',')[1])
    expect(exportedSvg).toContain('data:image/png;base64,rendered')
    expect(exportedSvg).not.toContain('/original.png')
    expect(qr.loading.value).toBe(true)
    expectReleased(pngImage)
    expectReleased(svgImage)
  })

  test('unmount releases all Images and settles render, export and download without clicking', async () => {
    const { qr, unmount } = mountQRCode()
    const rendering = qr.render()
    const exported = qr.toDataURL('svg')
    const download = qr.download()
    const settled = Promise.allSettled([rendering, exported, download])
    await flushRendering()
    const lateCallbacks = PendingImage.instances.map(image => image.onload!)
    unmount()
    PendingImage.instances.forEach(expectReleased)
    const results = await settled
    expect(results[0].status).toBe('fulfilled')
    for (const result of results.slice(1)) {
      expect(result.status).toBe('rejected')
      if (result.status === 'rejected')
        expect(result.reason.name).toBe('AbortError')
    }
    lateCallbacks.forEach(callback => callback())
    expect(paintedImages).toHaveLength(0)
    expect(clicked).toBe(0)
    expect(qr.loading.value).toBe(false)
    expect(qr.error.value).toBeNull()
    await expect(qr.toDataURL()).rejects.toHaveProperty('name', 'AbortError')
  })

  test('immediate unmount cancels tasks before their Logo Image is created', async () => {
    const { qr, unmount } = mountQRCode()
    const rendering = qr.render()
    const exported = qr.toDataURL()
    const settled = Promise.allSettled([rendering, exported])
    unmount()
    const results = await settled
    expect(results[0].status).toBe('fulfilled')
    expect(results[1].status).toBe('rejected')
    if (results[1].status === 'rejected')
      expect(results[1].reason.name).toBe('AbortError')
    expect(PendingImage.instances).toHaveLength(0)
    expect(qr.error.value).toBeNull()
  })

  test('image failures and drawing exceptions settle and release their handlers', async () => {
    const { qr } = mountQRCode()
    const rendering = qr.render()
    await flushRendering()
    const failed = PendingImage.instances[0]
    failed.onerror!()
    await rendering
    expect(qr.error.value?.message).toContain('Logo 加载失败')
    expect(qr.loading.value).toBe(false)
    expectReleased(failed)
    const exported = qr.toDataURL()
    await flushRendering()
    drawingError = new Error('canvas drawing failed')
    const drawing = PendingImage.instances[1]
    drawing.onload!()
    await expect(exported).rejects.toThrow('canvas drawing failed')
    expect(restored).toBe(1)
    expectReleased(drawing)
  })
})
