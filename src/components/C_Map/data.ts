/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2025-12-02
 * @LastEditTime: 2026-09-02
 * @FilePath: \naive-ui-components\src\components\C_Map\data.ts
 * @Description: 地图组件静态配置
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
 */

import type { MapConfig } from './types'

export const MAP_TYPES = [
  { label: 'OpenStreetMap', value: 'osm' },
  { label: '高德地图', value: 'amap' },
] as const

export const DEFAULT_MAP_CONFIG: Required<
  Pick<MapConfig, 'height' | 'center' | 'zoom' | 'mapType'>
> = {
  height: '400px',
  center: [39.9042, 116.4074],
  zoom: 10,
  mapType: 'osm',
}

export const OSM_TILE_CONFIG = {
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '© OpenStreetMap contributors',
  maxZoom: 19,
  minZoom: 1,
  tileSize: 256,
  detectRetina: true,
} as const

export const AMAP_CONFIG = {
  apiUrl: 'https://webapi.amap.com/maps?v=2.0&key=',
  note: '高德地图需要API Key，如需使用请申请：https://lbs.amap.com/api/javascript-api/guide/create/',
} as const
