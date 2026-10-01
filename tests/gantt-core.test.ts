import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'
import { mergeGanttOptions } from '../src/components/C_VtableGantt/optionsMerge'

describe('C_VtableGantt option and lifecycle contracts', () => {
  test('merges nested overrides without mutating presets or arrays', () => {
    const preset = {
      grid: { horizontalLine: { lineWidth: 1, lineColor: '#aaa' } },
      scales: [{ unit: 'week' }],
    }
    const merged = mergeGanttOptions(preset, {
      grid: { horizontalLine: { lineColor: '#fff' } },
      scales: [{ unit: 'day' }],
    })
    expect(merged).toEqual({
      grid: { horizontalLine: { lineWidth: 1, lineColor: '#fff' } },
      scales: [{ unit: 'day' }],
    })
    expect(preset.grid.horizontalLine.lineColor).toBe('#aaa')
  })

  test('ignores prototype keys and own hasOwnProperty fields', () => {
    const input = JSON.parse(
      '{"__proto__":{"polluted":true},"grid":{"constructor":{"polluted":true},"hasOwnProperty":"value"}}'
    ) as Record<string, unknown>
    const result = mergeGanttOptions({}, input)
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined()
    expect(Object.hasOwn(result, '__proto__')).toBe(false)
    expect(result.grid).toEqual({ hasOwnProperty: 'value' })
  })

  test('fullscreen listeners and resize timers are released on unmount', () => {
    const source = fs.readFileSync(
      path.resolve(
        import.meta.dir,
        '../src/components/C_VtableGantt/index.vue'
      ),
      'utf8'
    )
    expect(source).toContain("removeEventListener('fullscreenchange'")
    expect(source).toContain('if (resizeTimer) clearTimeout(resizeTimer)')
    expect(source).toContain(
      'document.fullscreenElement === ganttContainerRef.value'
    )
  })
})
