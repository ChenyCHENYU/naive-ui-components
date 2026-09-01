import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'
import { loadAMapApi } from '../src/components/C_Map/amapLoader'
import {
  getValidMapMarkers,
  isValidMapCoordinate,
  normalizeMapZoom,
  resolveTileConfig,
  toAMapPosition,
} from '../src/components/C_Map/mapUtils'
import {
  getRelativeCssAssets,
  LEAFLET_IMAGE_FILES,
} from '../scripts/leaflet-assets'

const root = path.resolve(import.meta.dir, '..')

describe('C_Map coordinate and provider contracts', () => {
  test('validates latitude/longitude and converts AMap coordinate order', () => {
    expect(isValidMapCoordinate([39.9042, 116.4074])).toBe(true)
    expect(isValidMapCoordinate([91, 116.4074])).toBe(false)
    expect(isValidMapCoordinate([39.9042, 181])).toBe(false)
    expect(toAMapPosition([39.9042, 116.4074])).toEqual([116.4074, 39.9042])
  })

  test('filters invalid markers and clamps zoom without mutating tile config', () => {
    const markers = [
      { id: 1, lat: 39.9, lng: 116.4 },
      { id: 2, lat: Number.NaN, lng: 116.4 },
      { id: 3, lat: -91, lng: 116.4 },
    ]
    expect(getValidMapMarkers(markers).map(marker => marker.id)).toEqual([1])
    expect(normalizeMapZoom(30, 2, 18)).toBe(18)
    expect(normalizeMapZoom(-1, 2, 18)).toBe(2)

    const input = { url: 'https://tiles.test/{z}/{x}/{y}.png', maxZoom: 17 }
    const resolved = resolveTileConfig(input)
    expect(resolved.url).toBe(input.url)
    expect(resolved.options.maxZoom).toBe(17)
    expect(input).toEqual({
      url: 'https://tiles.test/{z}/{x}/{y}.png',
      maxZoom: 17,
    })
  })

  test('rejects AMap loading outside the browser instead of hanging', async () => {
    expect(loadAMapApi('demo-key')).rejects.toThrow('只能在浏览器环境加载')
    expect(loadAMapApi('  ')).rejects.toThrow('API Key 不能为空')
  })
})

describe('C_Map published asset contract', () => {
  test('ignores non-file CSS URLs while retaining relative assets', () => {
    expect(
      getRelativeCssAssets(`
        .legacy { behavior: url(#default#VML); }
        .remote { background: url(https://example.com/map.png); }
        .inline { background: url(data:image/png;base64,AAAA); }
        .marker { background: url('./images/marker-icon.png'); }
      `)
    ).toEqual(['./images/marker-icon.png'])
  })

  test('tracks every relative asset referenced by Leaflet CSS', () => {
    const css = fs.readFileSync(
      path.join(root, 'node_modules/leaflet/dist/leaflet.css'),
      'utf8'
    )
    const referenced = getRelativeCssAssets(css)
      .filter(asset => asset.startsWith('images/'))
      .map(asset => path.basename(asset))
      .sort()
    expect(referenced).toEqual([
      'layers-2x.png',
      'layers.png',
      'marker-icon.png',
    ])
    for (const filename of LEAFLET_IMAGE_FILES) {
      expect(
        fs.existsSync(
          path.join(root, 'node_modules/leaflet/dist/images', filename)
        )
      ).toBe(true)
    }
  })
})
