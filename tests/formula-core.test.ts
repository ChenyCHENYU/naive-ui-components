import { describe, expect, test } from 'bun:test'
import { ref } from 'vue'
import { useFormulaParser } from '../src/components/C_FormulaEditor/composables/useFormulaParser'

describe('C_FormulaEditor input contracts', () => {
  test('rejects incomplete formulas while preserving unary operators', () => {
    const parser = useFormulaParser(ref([]), ref([]))
    expect(parser.validate('1 +').valid).toBe(false)
    expect(parser.validate('1,').valid).toBe(false)
    expect(parser.validate('* 2').valid).toBe(false)
    expect(parser.validate('-2 + 3').valid).toBe(true)
    expect(parser.validate('NOT TRUE').valid).toBe(true)
  })

  test('disabled editor is a read-only native textarea and exposes native controls', async () => {
    const input = await Bun.file(
      new URL(
        '../src/components/C_FormulaEditor/components/FormulaInput.vue',
        import.meta.url
      )
    ).text()
    const panel = await Bun.file(
      new URL(
        '../src/components/C_FormulaEditor/components/VariablePanel.vue',
        import.meta.url
      )
    ).text()
    expect(input).toContain('<textarea')
    expect(input).toContain(':readonly="disabled"')
    expect(input).not.toContain('contenteditable=')
    expect(input).not.toContain("if (e.key === 'Tab')")
    expect(panel).toContain(':disabled="disabled"')
    expect(panel).toContain('type="button"')
  })
})
