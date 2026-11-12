import { describe, expect, test } from 'bun:test'
import { createPrintDocument } from '../src/components/C_Table/composables/printDocument'

describe('print document configuration', () => {
  test('keeps the image path for existing callers and lets explicit styles override page settings', () => {
    const legacy = createPrintDocument(
      'data:image/png;base64,AAA',
      {},
      'body {margin:0}'
    )
    expect(legacy).toEqual({
      type: 'image',
      printable: 'data:image/png;base64,AAA',
      style: 'body {margin:0}',
    })
    const result = createPrintDocument(
      'image',
      {
        paperSize: 'A3',
        orientation: 'landscape',
        margin: '0 12mm',
        style: '@page { margin: 5mm; }',
      },
      'body {margin:0}'
    )
    expect(result.style).toContain(
      '@page { size: A3 landscape; margin: 0 12mm; }'
    )
    expect(result.style.endsWith('@page { margin: 5mm; }')).toBe(true)
  })

  test('supports custom dimensions and renders headers/footers as text in the same print engine', () => {
    const result = createPrintDocument(
      'image" onerror="bad',
      {
        paperSize: '100mm 150mm',
        footer: '第 1 单 <script>bad</script>',
        header: '库存 & 盘点',
      },
      ''
    )
    expect(result.type).toBe('raw-html')
    expect(result.style).toContain('size: 100mm 150mm;')
    expect(
      createPrintDocument(
        'image',
        {
          paperSize: '100mm\t150mm',
          orientation: 'landscape',
        },
        ''
      ).style
    ).toContain('size: 100mm\t150mm;')
    expect(result.printable).toContain('库存 &amp; 盘点')
    expect(result.printable).toContain('&lt;script&gt;bad&lt;/script&gt;')
    expect(result.printable).not.toContain('<script>')
    expect(result.printable).toContain('src="image&quot; onerror=&quot;bad"')
    expect(result.printable.indexOf('<header')).toBeLessThan(
      result.printable.indexOf('<img')
    )
    expect(result.printable.indexOf('<footer')).toBeGreaterThan(
      result.printable.indexOf('<img')
    )
  })

  test('rejects malformed CSS field values without constraining the existing custom style entry', () => {
    for (const config of [
      { paperSize: 'A4; color:red' },
      { margin: '10mm; } body { display:none' },
      { margin: '1mm 2mm 3mm 4mm 5mm' },
    ])
      expect(() => createPrintDocument('image', config, '')).toThrow(TypeError)
    expect(
      createPrintDocument(
        'image',
        { paperSize: 'auto', margin: '0', style: 'body{color:red}' },
        ''
      ).style
    ).toContain('size: auto;')
  })
})
