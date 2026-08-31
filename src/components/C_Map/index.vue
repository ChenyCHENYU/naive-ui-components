<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2025-12-02
 * @Description: 地图组件
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
-->
<template>
  <div class="c-map">
    <div
      ref="mapContainer"
      class="map-container"
      :style="{ height: height }"
    ></div>
    <div
      v-if="loading"
      class="map-loading"
    >
      <NSpin size="large" />
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
  import { NSpin } from 'naive-ui'
  import { OSM_TILE_CONFIG } from './data'
  import { loadAMapApi } from './amapLoader'

  defineOptions({ name: 'C_Map' })

  interface MapMarker {
    lat: number
    lng: number
    popup?: string
  }

  const props = withDefaults(
    defineProps<{
      height?: string
      center?: [number, number]
      zoom?: number
      markers?: MapMarker[]
      mapType?: 'osm' | 'amap'
      amapKey?: string
    }>(),
    {
      height: '400px',
      center: () => [39.9042, 116.4074],
      zoom: 10,
      markers: () => [],
      mapType: 'osm',
      amapKey: '',
    }
  )

  const emit = defineEmits<{
    ready: [map: unknown]
    markerClick: [marker: MapMarker, event: unknown]
    error: [error: Error]
  }>()

  const mapContainer = ref<HTMLElement>()
  const loading = ref(true)
  let map: any = null
  let leaflet: typeof import('leaflet') | null = null
  let amapMarkers: any[] = []
  let initVersion = 0
  let disposed = false

  const toError = (error: unknown) =>
    error instanceof Error ? error : new Error(String(error))

  const destroyMap = () => {
    initVersion += 1
    amapMarkers.forEach(marker => marker.setMap?.(null))
    amapMarkers = []
    if (!map) return
    if (typeof map.remove === 'function') map.remove()
    else if (typeof map.destroy === 'function') map.destroy()
    map = null
  }

  // eslint-disable-next-line complexity -- async lifecycle guards prevent stale map instances.
  const initOSMMap = async () => {
    if (!mapContainer.value) return
    const version = ++initVersion
    try {
      destroyMap()
      initVersion = version
      mapContainer.value.replaceChildren()
      leaflet ??= await import('leaflet')
      if (disposed || version !== initVersion || !mapContainer.value) return
      const L = leaflet
      map = L.map(mapContainer.value, {
        center: props.center,
        zoom: props.zoom,
        zoomControl: true,
        preferCanvas: true,
      })
      const tileLayer = L.tileLayer(OSM_TILE_CONFIG.url, OSM_TILE_CONFIG)
      tileLayer.addTo(map)
      if (disposed || version !== initVersion) {
        destroyMap()
        return
      }
      addMarkers()
      await nextTick()
      requestAnimationFrame(() => {
        if (version === initVersion) {
          map?.invalidateSize({ reset: true, pan: false })
        }
      })
      if (disposed || version !== initVersion) return
      loading.value = false
      emit('ready', map)
    } catch (error) {
      if (version === initVersion) {
        destroyMap()
        emit('error', toError(error))
        loading.value = false
      }
    }
  }

  const initAMap = async () => {
    if (!mapContainer.value || !props.amapKey) {
      if (!props.amapKey)
        emit('error', new Error('使用高德地图时必须提供 amapKey'))
      loading.value = false
      return
    }
    const version = ++initVersion
    try {
      destroyMap()
      initVersion = version
      mapContainer.value.replaceChildren()
      const AMap = await loadAMapApi(props.amapKey)
      if (disposed || version !== initVersion || !mapContainer.value) return
      map = new AMap.Map(mapContainer.value, {
        zoom: props.zoom,
        center: props.center,
      })
      addAMapMarkers(map)
      loading.value = false
      emit('ready', map)
    } catch (error) {
      if (version === initVersion) {
        emit('error', toError(error))
        loading.value = false
      }
    }
  }

  const addMarkers = () => {
    if (!map || !leaflet || props.mapType !== 'osm' || !props.markers) return
    const L = leaflet
    map.eachLayer((layer: any) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer)
      }
    })
    props.markers.forEach(marker => {
      if (!Number.isFinite(marker.lat) || !Number.isFinite(marker.lng)) return
      const leafletMarker = L.marker([marker.lat, marker.lng])
      if (marker.popup) {
        const popup = document.createElement('span')
        popup.textContent = marker.popup
        leafletMarker.bindPopup(popup)
        leafletMarker.on('click', (event: any) => {
          emit('markerClick', marker, event)
        })
      }
      leafletMarker.addTo(map)
    })
  }

  const addAMapMarkers = (amap: any) => {
    if (!amap || props.mapType !== 'amap' || !props.markers) return
    amapMarkers.forEach(marker => marker.setMap?.(null))
    amapMarkers = []
    props.markers.forEach(marker => {
      if (!Number.isFinite(marker.lat) || !Number.isFinite(marker.lng)) return
      const amapMarker = new (window as any).AMap.Marker({
        position: [marker.lat, marker.lng],
        title: marker.popup || '',
      })
      if (marker.popup) {
        const content = document.createElement('span')
        content.textContent = marker.popup
        const infoWindow = new (window as any).AMap.InfoWindow({
          content,
          offset: new (window as any).AMap.Pixel(0, -30),
        })
        amapMarker.on('click', () => {
          infoWindow.open(amap, amapMarker.getPosition())
          emit('markerClick', marker, null)
        })
      }
      amapMarker.setMap(amap)
      amapMarkers.push(amapMarker)
    })
  }

  watch(
    () => props.markers,
    () => {
      if (!map) return
      if (props.mapType === 'osm') addMarkers()
      else addAMapMarkers(map)
    },
    { deep: true }
  )

  watch(
    () => props.mapType,
    async (newType, oldType) => {
      if (newType === oldType) return
      destroyMap()
      loading.value = true
      await nextTick()
      if (newType === 'amap') await initAMap()
      else await initOSMMap()
    }
  )

  watch(
    [() => props.center, () => props.zoom],
    () => {
      if (!map) return
      if (props.mapType === 'osm') map.setView(props.center, props.zoom)
      else {
        map.setCenter?.(props.center)
        map.setZoom?.(props.zoom)
      }
    },
    { deep: true }
  )

  onMounted(async () => {
    await nextTick()
    if (props.mapType === 'amap') await initAMap()
    else await initOSMMap()
  })

  onUnmounted(() => {
    disposed = true
    destroyMap()
  })
</script>

<style lang="scss" scoped>
  @use './index.scss';
</style>
