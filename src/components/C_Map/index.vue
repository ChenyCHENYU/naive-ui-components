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
    <div v-if="loading" class="map-loading">
      <NSpin size="large" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from "vue";
import { NSpin } from "naive-ui";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { OSM_TILE_CONFIG, AMAP_CONFIG, MAP_ICONS } from "./data";

defineOptions({ name: "C_Map" });

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions(MAP_ICONS);

interface MapMarker {
  lat: number;
  lng: number;
  popup?: string;
}

const props = withDefaults(
  defineProps<{
    height?: string;
    center?: [number, number];
    zoom?: number;
    markers?: MapMarker[];
    mapType?: "osm" | "amap";
    amapKey?: string;
  }>(),
  {
    height: "400px",
    center: () => [39.9042, 116.4074],
    zoom: 10,
    markers: () => [],
    mapType: "osm",
    amapKey: "",
  },
);

const emit = defineEmits<{
  ready: [map: any];
  markerClick: [marker: MapMarker, event: any];
}>();

const mapContainer = ref<HTMLElement>();
const loading = ref(true);
let map: any = null;

const initOSMMap = async () => {
  if (!mapContainer.value) return;
  try {
    mapContainer.value.innerHTML = "";
    map = L.map(mapContainer.value, {
      center: props.center,
      zoom: props.zoom,
      zoomControl: true,
      preferCanvas: true,
    });
    const tileLayer = L.tileLayer(OSM_TILE_CONFIG.url, OSM_TILE_CONFIG);
    tileLayer.addTo(map);
    addMarkers();
    await nextTick();
    requestAnimationFrame(() => {
      map?.invalidateSize({ reset: true, pan: false });
    });
    loading.value = false;
    emit("ready", map);
  } catch (error) {
    console.error("OpenStreetMap初始化失败:", error);
    loading.value = false;
  }
};

const initAMap = async () => {
  if (!mapContainer.value || !props.amapKey) return;
  try {
    mapContainer.value.innerHTML = "";
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = `${AMAP_CONFIG.apiUrl}${props.amapKey}`;
    script.onload = () => {
      if ((window as any).AMap) {
        const amap = new (window as any).AMap.Map(mapContainer.value, {
          zoom: props.zoom,
          center: props.center,
        });
        addAMapMarkers(amap);
        loading.value = false;
        emit("ready", amap);
      }
    };
    script.onerror = () => {
      loading.value = false;
    };
    document.head.appendChild(script);
  } catch {
    loading.value = false;
  }
};

const addMarkers = () => {
  if (!map || props.mapType !== "osm" || !props.markers) return;
  map.eachLayer((layer: any) => {
    if (layer instanceof L.Marker) {
      map.removeLayer(layer);
    }
  });
  props.markers.forEach((marker) => {
    const leafletMarker = L.marker([marker.lat, marker.lng]);
    if (marker.popup) {
      leafletMarker.bindPopup(marker.popup);
      leafletMarker.on("click", (event: any) => {
        emit("markerClick", marker, event);
      });
    }
    leafletMarker.addTo(map);
  });
};

const addAMapMarkers = (amap: any) => {
  if (!amap || props.mapType !== "amap" || !props.markers) return;
  props.markers.forEach((marker) => {
    const amapMarker = new (window as any).AMap.Marker({
      position: [marker.lat, marker.lng],
      title: marker.popup || "",
    });
    if (marker.popup) {
      const infoWindow = new (window as any).AMap.InfoWindow({
        content: marker.popup,
        offset: new (window as any).AMap.Pixel(0, -30),
      });
      amapMarker.on("click", () => {
        infoWindow.open(amap, amapMarker.getPosition());
        emit("markerClick", marker, null);
      });
    }
    amapMarker.setMap(amap);
  });
};

watch(
  () => props.markers,
  () => {
    if (map && props.mapType === "osm") addMarkers();
  },
  { deep: true },
);

watch(
  () => props.mapType,
  async (newType, oldType) => {
    if (newType === oldType) return;
    if (map) {
      map.remove();
      map = null;
      loading.value = true;
      await nextTick();
      if (newType === "amap" && props.amapKey) await initAMap();
      else await initOSMMap();
    }
  },
);

watch(
  [() => props.center, () => props.zoom],
  () => {
    if (map) map.setView(props.center, props.zoom);
  },
  { deep: true },
);

onMounted(async () => {
  await nextTick();
  if (props.mapType === "amap" && props.amapKey) await initAMap();
  else await initOSMMap();
});

onUnmounted(() => {
  if (map) {
    map.remove();
    map = null;
  }
});
</script>

<style lang="scss" scoped>
@use "./index.scss";
</style>
