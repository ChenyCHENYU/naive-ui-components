<script setup lang="ts">
  import { ref } from 'vue'
  import {
    C_Map,
    type MapExpose,
    type MapInstance,
    type MapMarker,
    type MapMarkerEvent,
  } from '@robot-admin/naive-ui-components/C_Map'

  const mapRef = ref<MapExpose | null>(null)
  const markers: MapMarker[] = [
    { id: 'shanghai', lat: 31.2304, lng: 121.4737, popup: '上海' },
  ]

  const handleReady = (map: MapInstance) => {
    mapRef.value?.refresh()
    return map
  }

  const handleMarkerClick = (
    marker: MapMarker,
    event: MapMarkerEvent
  ): void => {
    void marker
    void event
  }
</script>

<template>
  <C_Map
    ref="mapRef"
    aria-label="业务网点地图"
    :markers="markers"
    :tile-config="{ maxZoom: 18 }"
    fit-markers-on-init
    @ready="handleReady"
    @marker-click="handleMarkerClick"
  />
</template>
