export { default as C_Map } from './index.vue'
export type {
  AMapApi,
  AMapMapInstance,
  AMapMarkerEvent,
  AMapPosition,
  AMapSecurityConfig,
  MapConfig,
  MapCoordinate,
  MapExpose,
  MapFitOptions,
  MapInstance,
  MapMarker,
  MapMarkerEvent,
  MapProps,
  MapTileConfig,
  MapType,
} from './types'
export { MAP_TYPES, DEFAULT_MAP_CONFIG, OSM_TILE_CONFIG } from './data'
export {
  getValidMapMarkers,
  isValidMapCoordinate,
  normalizeMapZoom,
  resolveTileConfig,
  toAMapPosition,
} from './mapUtils'
