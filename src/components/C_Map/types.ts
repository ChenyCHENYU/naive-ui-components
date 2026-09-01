/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-09-02
 * @FilePath: \naive-ui-components\src\components\C_Map\types.ts
 * @Description: 地图组件公共类型契约
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
 */

import type {
  LeafletMouseEvent,
  Map as LeafletMap,
  TileLayerOptions,
} from 'leaflet'

export type MapType = 'osm' | 'amap'
export type MapCoordinate = [latitude: number, longitude: number]
export type AMapPosition = [longitude: number, latitude: number]

export interface MapMarker {
  id?: string | number
  lat: number
  lng: number
  popup?: string
  title?: string
}

export interface MapTileConfig extends TileLayerOptions {
  url?: string
}

export interface MapFitOptions {
  maxZoom?: number
  padding?: [horizontal: number, vertical: number]
}

export interface AMapMarkerEvent {
  lnglat?: unknown
  originalEvent?: Event
  target?: unknown
  [key: string]: unknown
}

export interface AMapMarkerInstance {
  getPosition(): unknown
  on(event: 'click', handler: (event: AMapMarkerEvent) => void): void
  setMap(map: AMapMapInstance | null): void
}

export interface AMapInfoWindowInstance {
  close?(): void
  open(map: AMapMapInstance, position: unknown): void
}

export interface AMapMapInstance {
  destroy(): void
  resize?(): void
  setCenter(center: AMapPosition): void
  setFitView?(
    overlays?: AMapMarkerInstance[],
    immediately?: boolean,
    avoid?: [number, number, number, number],
    maxZoom?: number
  ): void
  setZoom(zoom: number): void
}

export interface AMapApi {
  Map: new (
    container: HTMLElement,
    options: Record<string, unknown>
  ) => AMapMapInstance
  Marker: new (options: Record<string, unknown>) => AMapMarkerInstance
  InfoWindow: new (options: Record<string, unknown>) => AMapInfoWindowInstance
  Pixel: new (x: number, y: number) => unknown
}

export type MapInstance = LeafletMap | AMapMapInstance
export type MapMarkerEvent = LeafletMouseEvent | AMapMarkerEvent | null

export interface MapProps {
  /** 地图区域的无障碍名称。 */
  ariaLabel?: string
  height?: string
  center?: MapCoordinate
  zoom?: number
  markers?: MapMarker[]
  mapType?: MapType
  amapKey?: string
  amapLoadTimeout?: number
  amapOptions?: Record<string, unknown>
  tileConfig?: MapTileConfig
  zoomControl?: boolean
  preferCanvas?: boolean
  fitMarkersOnInit?: boolean
}

export type MapConfig = MapProps

export interface MapExpose {
  fitToMarkers(options?: MapFitOptions): boolean
  getMap(): MapInstance | null
  refresh(): void
}
