import { describe, expect, test } from 'bun:test'
import {
  mergeFormConfig,
  resolveFormConfig,
} from '../src/components/C_Form/composables/useFormConfig'
import { resolveComponentDensity } from '../src/core/density'

describe('form density compatibility', () => {
  test('density resolves matching control sizes and retains the legacy default', () => {
    expect(resolveFormConfig().size).toBe('medium')
    expect(resolveFormConfig({ density: 'default' }).size).toBe('medium')
    expect(resolveFormConfig({ density: 'compact' }).size).toBe('small')
    expect(resolveFormConfig({ density: 'comfortable' }).size).toBe('large')
  })

  test('explicit sizes and application defaults retain their existing priority', () => {
    expect(resolveFormConfig({ density: 'compact', size: 'large' }).size).toBe(
      'large'
    )
    const merged = mergeFormConfig(
      { density: 'compact', grid: { xGap: 4 } },
      { density: 'comfortable', size: 'medium', grid: { yGap: 6 } }
    )
    expect(resolveFormConfig(merged).size).toBe('medium')
    expect(merged.grid).toEqual({ xGap: 4, yGap: 6 })
  })

  test('compact reserves four pixels for feedback without changing other densities', () => {
    expect(resolveComponentDensity('compact').formItemGap).toBe(4)
    expect(resolveComponentDensity('default').formItemGap).toBe(24)
    expect(resolveComponentDensity('comfortable').formItemGap).toBe(28)
  })
})
