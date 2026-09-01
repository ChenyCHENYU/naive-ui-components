/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-09-02
 * @FilePath: \naive-ui-components\src\components\C_Map\mapUtils.ts
 * @Description: 地图坐标、缩放和瓦片配置纯函数
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
 */

import type { TileLayerOptions } from 'leaflet'
import { DEFAULT_MAP_CONFIG, OSM_TILE_CONFIG } from './data'
import type {
  AMapPosition,
  MapCoordinate,
  MapMarker,
  MapTileConfig,
} from './types'

export interface ResolvedTileConfig {
  options: TileLayerOptions
  url: string
}

/** 判断纬度、经度是否处于合法范围。 */
export function isValidMapCoordinate(
  coordinate: MapCoordinate | readonly number[] | null | undefined
): coordinate is MapCoordinate {
  if (!coordinate || coordinate.length !== 2) return false
  const [latitude, longitude] = coordinate
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  )
}

/** 将统一的 [纬度, 经度] 转为高德地图要求的 [经度, 纬度]。 */
export function toAMapPosition(coordinate: MapCoordinate): AMapPosition {
  return [coordinate[1], coordinate[0]]
}

/** 过滤非法标记，防止地图 SDK 因异常坐标中断整个渲染。 */
export function getValidMapMarkers(markers: readonly MapMarker[]): MapMarker[] {
  return markers.filter(marker =>
    isValidMapCoordinate([marker.lat, marker.lng])
  )
}

/** 将缩放值限制在当前瓦片图层允许的范围内。 */
export function normalizeMapZoom(
  zoom: number,
  minZoom = OSM_TILE_CONFIG.minZoom,
  maxZoom = OSM_TILE_CONFIG.maxZoom
): number {
  if (!Number.isFinite(zoom)) return DEFAULT_MAP_CONFIG.zoom
  return Math.min(Math.max(zoom, minZoom), maxZoom)
}

/** 合并默认瓦片配置，并将 URL 与 Leaflet options 分离。 */
export function resolveTileConfig(
  config: MapTileConfig = {}
): ResolvedTileConfig {
  const merged = { ...OSM_TILE_CONFIG, ...config }
  const { url, ...options } = merged
  return { url, options }
}
