import { describe, expect, test } from 'bun:test'
import { ref } from 'vue'
import { useSignatureHistory } from '../src/components/C_Signature/composables/useSignatureHistory'
import { useSignatureExport } from '../src/components/C_Signature/composables/useSignatureExport'
import type { SignatureStroke } from '../src/components/C_Signature/types'

const stroke: SignatureStroke = {
  points: [
    { x: 1, y: 2 },
    { x: 3, y: 4 },
  ],
  color: '#123456',
  width: 2,
  opacity: 1,
  mode: 'pen',
}

describe('C_Signature history and export', () => {
  test('history snapshots do not retain caller-owned points', () => {
    const history = useSignatureHistory()
    const incoming = structuredClone(stroke)
    history.addStroke(incoming)
    incoming.points[0].x = 99
    expect(history.strokes.value[0].points[0].x).toBe(1)

    history.addStroke(structuredClone(stroke))
    history.undo()
    expect(history.strokes.value).toHaveLength(1)
    expect(history.strokes.value[0].points[0].x).toBe(1)
  })

  test('SVG export contains the actual rendered signature, not a placeholder', async () => {
    const previousDocument = globalThis.document
    const watermarkText: string[] = []
    const tempContext = {
      drawImage: () => {},
      save: () => {},
      restore: () => {},
      measureText: () => ({ width: 25 }),
      fillText: (text: string) => watermarkText.push(text),
    }
    const tempCanvas = {
      width: 0,
      height: 0,
      getContext: () => tempContext,
      toDataURL: () => 'data:image/png;base64,signed',
    } as unknown as HTMLCanvasElement
    const sourceCanvas = {
      width: 200,
      height: 100,
      getContext: () => ({
        getImageData: () => ({ data: new Uint8ClampedArray([1]) }),
      }),
    } as unknown as HTMLCanvasElement
    Object.assign(globalThis, { document: { createElement: () => tempCanvas } })
    try {
      const exporter = useSignatureExport({
        canvasRef: ref(sourceCanvas),
        watermark: ref({ show: false, text: 'Approved' }),
      })
      const result = await exporter.exportSignature({
        format: 'svg',
        includeWatermark: true,
      })
      expect(typeof result).toBe('string')
      const svg = decodeURIComponent(String(result).split(',')[1])
      expect(svg).toContain('data:image/png;base64,signed')
      expect(svg).toContain('width="200" height="100"')
      expect(svg).not.toContain('placeholder')
      expect(watermarkText).toEqual(['Approved'])
    } finally {
      Object.assign(globalThis, { document: previousDocument })
    }
  })
})
