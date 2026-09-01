<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2025-12-02
 * @Description: 地图组件
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
-->
<template>
  <div
    class="c-map"
    role="region"
    :aria-label="ariaLabel"
    :aria-busy="loading"
  >
    <div
      ref="mapContainer"
      class="map-container"
      :style="{ height: height }"
    ></div>
    <div
      v-if="loading"
      class="map-loading"
      role="status"
      aria-live="polite"
      aria-label="地图加载中"
    >
      <NSpin size="large" />
    </div>
  </div>
</template>

<script setup lang="ts">
  import type {
    LatLngTuple,
    LeafletMouseEvent,
    Map as LeafletMap,
    Marker as LeafletMarker,
  } from 'leaflet'
  import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
  import { NSpin } from 'naive-ui'
  import { DEFAULT_MAP_CONFIG } from './data'
  import { loadAMapApi } from './amapLoader'
  import {
    getValidMapMarkers,
    isValidMapCoordinate,
    normalizeMapZoom,
    resolveTileConfig,
    toAMapPosition,
  } from './mapUtils'
  import type {
    AMapApi,
    AMapInfoWindowInstance,
    AMapMapInstance,
    AMapMarkerInstance,
    MapCoordinate,
    MapExpose,
    MapFitOptions,
    MapInstance,
    MapMarker,
    MapMarkerEvent,
    MapProps,
  } from './types'

  defineOptions({ name: 'C_Map' })

  const props = withDefaults(defineProps<MapProps>(), {
    height: DEFAULT_MAP_CONFIG.height,
    center: () => [...DEFAULT_MAP_CONFIG.center] as MapCoordinate,
    zoom: DEFAULT_MAP_CONFIG.zoom,
    markers: () => [],
    mapType: DEFAULT_MAP_CONFIG.mapType,
    amapKey: '',
    amapLoadTimeout: 15_000,
    amapOptions: () => ({}),
    tileConfig: () => ({}),
    zoomControl: true,
    preferCanvas: true,
    fitMarkersOnInit: false,
    ariaLabel: '地图',
  })

  const emit = defineEmits<{
    ready: [map: MapInstance]
    markerClick: [marker: MapMarker, event: MapMarkerEvent]
    error: [error: Error]
  }>()

  const mapContainer = ref<HTMLElement>()
  const loading = ref(true)
  let leafletApi: typeof import('leaflet') | null = null
  let leafletMap: LeafletMap | null = null
  let leafletMarkers: LeafletMarker[] = []
  let amapApi: AMapApi | null = null
  let amapMap: AMapMapInstance | null = null
  let amapMarkers: AMapMarkerInstance[] = []
  let amapInfoWindows: AMapInfoWindowInstance[] = []
  let initVersion = 0
  let disposed = false

  const toError = (error: unknown): Error =>
    error instanceof Error ? error : new Error(String(error))

  const clearLeafletMarkers = (): void => {
    leafletMarkers.forEach(marker => marker.remove())
    leafletMarkers = []
  }

  const clearAMapMarkers = (): void => {
    amapInfoWindows.forEach(infoWindow => infoWindow.close?.())
    amapInfoWindows = []
    amapMarkers.forEach(marker => marker.setMap?.(null))
    amapMarkers = []
  }

  const resetMapInstances = (): void => {
    clearLeafletMarkers()
    clearAMapMarkers()
    leafletMap?.remove()
    amapMap?.destroy()
    leafletMap = null
    amapMap = null
    mapContainer.value?.replaceChildren()
  }

  const beginInitialization = (): number => {
    const version = ++initVersion
    resetMapInstances()
    loading.value = true
    return version
  }

  const isCurrentInitialization = (version: number): boolean =>
    !disposed && version === initVersion

  const requireValidCenter = (): MapCoordinate => {
    if (isValidMapCoordinate(props.center)) return props.center
    throw new Error('地图中心坐标无效，应使用 [纬度, 经度] 且处于合法范围')
  }

  const finishInitializationError = (version: number, error: unknown): void => {
    if (!isCurrentInitialization(version)) return
    resetMapInstances()
    loading.value = false
    emit('error', toError(error))
  }

  const addLeafletMarkers = (): void => {
    const L = leafletApi
    const targetMap = leafletMap
    if (!targetMap || !L || props.mapType !== 'osm') return
    clearLeafletMarkers()
    getValidMapMarkers(props.markers).forEach(marker => {
      const leafletMarker = L.marker([marker.lat, marker.lng])
      if (marker.popup) {
        const popup = document.createElement('span')
        popup.textContent = marker.popup
        leafletMarker.bindPopup(popup)
      }
      leafletMarker.on('click', (event: LeafletMouseEvent) => {
        emit('markerClick', marker, event)
      })
      leafletMarker.addTo(targetMap)
      leafletMarkers.push(leafletMarker)
    })
  }

  const addAMapMarkers = (): void => {
    const AMap = amapApi
    const targetMap = amapMap
    if (!targetMap || !AMap || props.mapType !== 'amap') return
    clearAMapMarkers()
    getValidMapMarkers(props.markers).forEach(marker => {
      const amapMarker = new AMap.Marker({
        position: toAMapPosition([marker.lat, marker.lng]),
        title: marker.title || marker.popup || '',
      })
      if (marker.popup) {
        const content = document.createElement('span')
        content.textContent = marker.popup
        const infoWindow = new AMap.InfoWindow({
          content,
          offset: new AMap.Pixel(0, -30),
        })
        amapInfoWindows.push(infoWindow)
        amapMarker.on('click', event => {
          infoWindow.open(targetMap, amapMarker.getPosition())
          emit('markerClick', marker, event)
        })
      } else {
        amapMarker.on('click', event => emit('markerClick', marker, event))
      }
      amapMarker.setMap(targetMap)
      amapMarkers.push(amapMarker)
    })
  }

  const getMap = (): MapInstance | null => leafletMap || amapMap

  const refresh = (): void => {
    leafletMap?.invalidateSize({ reset: true, pan: false })
    amapMap?.resize?.()
  }

  const fitToMarkers = (options: MapFitOptions = {}): boolean => {
    const validMarkers = getValidMapMarkers(props.markers)
    if (validMarkers.length === 0) return false

    if (leafletMap) {
      const coordinates: LatLngTuple[] = validMarkers.map(marker => [
        marker.lat,
        marker.lng,
      ])
      leafletMap.fitBounds(coordinates, {
        maxZoom: options.maxZoom,
        padding: options.padding,
      })
      return true
    }

    if (amapMap && amapMarkers.length > 0) {
      const [horizontal = 0, vertical = 0] = options.padding || []
      amapMap.setFitView?.(
        amapMarkers,
        false,
        [vertical, horizontal, vertical, horizontal],
        options.maxZoom
      )
      return true
    }
    return false
  }

  const initOSMMap = async (): Promise<void> => {
    if (!mapContainer.value) return
    const version = beginInitialization()
    try {
      const L = await import('leaflet')
      if (!isCurrentInitialization(version) || !mapContainer.value) return
      leafletApi = L
      const { url, options } = resolveTileConfig(props.tileConfig)
      const zoom = normalizeMapZoom(
        props.zoom,
        options.minZoom,
        options.maxZoom
      )
      leafletMap = L.map(mapContainer.value, {
        center: requireValidCenter(),
        zoom,
        zoomControl: props.zoomControl,
        preferCanvas: props.preferCanvas,
      })
      L.tileLayer(url, options).addTo(leafletMap)
      addLeafletMarkers()
      if (props.fitMarkersOnInit) fitToMarkers()
      await nextTick()
      requestAnimationFrame(() => {
        if (isCurrentInitialization(version)) refresh()
      })
      if (!isCurrentInitialization(version) || !leafletMap) return
      loading.value = false
      emit('ready', leafletMap)
    } catch (error) {
      finishInitializationError(version, error)
    }
  }

  const initAMap = async (): Promise<void> => {
    if (!mapContainer.value) return
    const version = beginInitialization()
    try {
      const AMap = await loadAMapApi(props.amapKey, props.amapLoadTimeout)
      if (!isCurrentInitialization(version) || !mapContainer.value) return
      amapApi = AMap
      amapMap = new AMap.Map(mapContainer.value, {
        ...props.amapOptions,
        zoom: normalizeMapZoom(props.zoom, 1, 20),
        center: toAMapPosition(requireValidCenter()),
      })
      addAMapMarkers()
      if (props.fitMarkersOnInit) fitToMarkers()
      loading.value = false
      emit('ready', amapMap)
    } catch (error) {
      finishInitializationError(version, error)
    }
  }

  const initializeMap = async (): Promise<void> => {
    if (props.mapType === 'amap') await initAMap()
    else await initOSMMap()
  }

  watch(
    () => props.markers,
    () => {
      if (props.mapType === 'osm') addLeafletMarkers()
      else addAMapMarkers()
    },
    { deep: true }
  )

  watch(
    [
      () => props.mapType,
      () => props.amapKey,
      () => props.amapLoadTimeout,
      () => props.amapOptions,
      () => props.tileConfig,
      () => props.zoomControl,
      () => props.preferCanvas,
    ],
    () => void initializeMap(),
    { deep: true }
  )

  watch(
    [() => props.center, () => props.zoom],
    () => {
      if (!isValidMapCoordinate(props.center)) {
        emit('error', new Error('地图中心坐标无效，应使用 [纬度, 经度]'))
        return
      }
      leafletMap?.setView(props.center, normalizeMapZoom(props.zoom))
      amapMap?.setCenter(toAMapPosition(props.center))
      amapMap?.setZoom(normalizeMapZoom(props.zoom, 1, 20))
    },
    { deep: true }
  )

  onMounted(async () => {
    await nextTick()
    await initializeMap()
  })

  onUnmounted(() => {
    disposed = true
    initVersion += 1
    resetMapInstances()
  })

  defineExpose<MapExpose>({ fitToMarkers, getMap, refresh })
</script>

<style lang="scss" scoped>
  @use './index.scss';
</style>
