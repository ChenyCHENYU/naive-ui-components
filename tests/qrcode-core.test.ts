import { describe, expect, test } from 'bun:test'
import { createRenderer, h, ref } from 'vue'
import { useQRCode } from '../src/components/C_QRCode/composables/useQRCode'

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

describe('C_QRCode render lifecycle', () => {
  test('clearing a value also clears the previous SVG', async () => {
    const value = ref('first value')
    let qr!: ReturnType<typeof useQRCode>
    const app = renderer.createApp({
      setup() {
        qr = useQRCode(ref(null), {
          value,
          size: ref(120),
          color: ref('#000000'),
          bgColor: ref('#ffffff'),
          errorCorrectionLevel: ref('M'),
          margin: ref(2),
          mode: ref('svg'),
          logo: ref(undefined),
        })
        return () => h('div')
      },
    })
    app.mount({})
    await qr.render()
    expect(qr.svgHtml.value).toContain('<svg')
    const previous = qr.svgHtml.value

    value.value = 'second value'
    await qr.render()
    expect(qr.svgHtml.value).not.toBe(previous)

    value.value = ''
    await qr.render()
    expect(qr.svgHtml.value).toBe('')
    expect(qr.loading.value).toBe(false)
    expect(qr.error.value).toBeNull()
    app.unmount()
  })

  test('SVG with a logo embeds only canvas pixels, never the logo URL', async () => {
    const previousImage = globalThis.Image
    const previousDocument = globalThis.document
    class FakeImage {
      crossOrigin = ''
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_value: string) {
        this.onload?.()
      }
    }
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
      drawImage: () => {},
      restore: () => {},
    }
    Object.assign(globalThis, {
      Image: FakeImage,
      document: {
        createElement: () => ({
          width: 0,
          height: 0,
          style: {},
          getContext: () => context,
          toDataURL: () => 'data:image/png;base64,rendered',
        }),
      },
    })
    try {
      let qr!: ReturnType<typeof useQRCode>
      const app = renderer.createApp({
        setup() {
          qr = useQRCode(ref(null), {
            value: ref('with logo'),
            size: ref(120),
            color: ref('#000000'),
            bgColor: ref('#ffffff'),
            errorCorrectionLevel: ref('M'),
            margin: ref(2),
            mode: ref('svg'),
            logo: ref({ src: 'https://example.com/logo.png' }),
          })
          return () => h('div')
        },
      })
      app.mount({})
      try {
        await qr.render()
        expect(qr.svgTrusted.value).toBe(true)
        expect(qr.svgHtml.value).toContain('data:image/png;base64,rendered')
        expect(qr.svgHtml.value).not.toContain('https://example.com/logo.png')
        const exported = await qr.toDataURL('svg')
        expect(decodeURIComponent(exported.split(',')[1])).toContain(
          'data:image/png;base64,rendered'
        )
      } finally {
        app.unmount()
      }
    } finally {
      Object.assign(globalThis, {
        Image: previousImage,
        document: previousDocument,
      })
    }
  })
})
