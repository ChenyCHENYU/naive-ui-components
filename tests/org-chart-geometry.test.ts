import { describe, expect, test } from 'bun:test'
import {
  clampOrgZoom,
  createOrgConnectorPath,
} from '../src/components/C_OrgChart/geometry'
import { buildOrgChartIndex } from '../src/components/C_OrgChart/tree'

describe('organization chart geometry and data boundary', () => {
  const parent = { x: 100, y: 10, width: 80, height: 40 }
  const child = { x: 220, y: 130, width: 100, height: 60 }
  test('three connector styles differ and horizontal anchors use card edges', () => {
    expect(createOrgConnectorPath(parent, child, 'vertical', 'straight')).toBe(
      'M 140 50 L 270 130'
    )
    expect(createOrgConnectorPath(parent, child, 'vertical', 'stepped')).toBe(
      'M 140 50 L 140 90 L 270 90 L 270 130'
    )
    expect(createOrgConnectorPath(parent, child, 'vertical', 'rounded')).toBe(
      'M 140 50 L 140 82 Q 140 90 148 90 L 262 90 Q 270 90 270 98 L 270 130'
    )
    expect(
      createOrgConnectorPath(parent, child, 'horizontal', 'straight')
    ).toBe('M 180 30 L 220 160')
    expect(createOrgConnectorPath(parent, child, 'horizontal', 'rounded')).toBe(
      'M 180 30 L 192 30 Q 200 30 200 38 L 200 152 Q 200 160 208 160 L 220 160'
    )
  })
  test('tiny, reversed and aligned gaps remain finite without overshooting corners', () => {
    const tiny = createOrgConnectorPath(
      parent,
      { ...child, y: 51 },
      'vertical',
      'rounded'
    )!
    expect(tiny).toContain('Q 140 50.5 140.25 50.5')
    expect(tiny).not.toMatch(/NaN|Infinity/)
    expect(
      createOrgConnectorPath(parent, { ...child, y: 0 }, 'vertical', 'rounded')
    ).not.toMatch(/NaN|Infinity/)
    expect(
      createOrgConnectorPath(
        parent,
        { x: 90, y: 50, width: 100, height: 0 },
        'vertical',
        'rounded'
      )
    ).toBe('M 140 50 L 140 50 L 140 50 L 140 50')
    expect(
      createOrgConnectorPath(
        { ...parent, width: -1 },
        child,
        'vertical',
        'rounded'
      )
    ).toBeNull()
    expect(
      createOrgConnectorPath(
        parent,
        { ...child, x: NaN },
        'vertical',
        'rounded'
      )
    ).toBeNull()
  })
  test('invalid zoom bounds cannot produce zero, NaN or an inverted range', () => {
    expect(clampOrgZoom(Infinity, 0.3, 2)).toBe(1)
    expect(clampOrgZoom(-1, 0, NaN)).toBe(0.3)
    expect(clampOrgZoom(1, 2, 0.5)).toBe(2)
  })
  test('business nodes remain untouched; cycles and duplicate keys cannot recurse forever', () => {
    interface Unit {
      code: number
      title: string
      units?: Unit[]
    }
    const data: Unit = { code: 0, title: 'Headquarters' }
    const child: Unit = { code: 1, title: 'Engineering', units: [data] }
    data.units = [child, { code: 1, title: 'Duplicate' }]
    const index = buildOrgChartIndex({
      data,
      keyField: 'code',
      labelField: 'title',
      childrenField: 'units',
    })
    expect([...index.nodes.keys()]).toEqual([0, 1])
    expect(index.nodes.get(1)?.node).toBe(child)
    expect(index.nodes.get(1)?.parent?.node).toBe(data)
    expect(index.nodes.get(1)?.children).toEqual([])
    expect(data.units).toHaveLength(2)
  })
})
