<template>
  <div class="cropper-preview">
    <div class="preview-label">
      <C_Icon name="mdi:eye-outline" />
      <span>裁剪预览</span>
    </div>

    <div
      ref="mainBoxRef"
      class="preview-main"
      :class="{ 'preview-main--circular': circular }"
    >
      <template v-if="hasValidPreview">
        <div class="preview-main__viewport" :style="mainViewportStyle">
          <div :style="previewData.div">
            <img
              :src="previewData.url"
              :style="previewData.img"
              alt="preview"
            />
          </div>
        </div>
      </template>
      <div v-else class="preview-empty">
        <C_Icon
          name="mdi:image-outline"
          style="font-size: 32px; opacity: 0.2"
        />
      </div>
    </div>

    <div class="preview-thumbs">
      <div v-for="item in thumbSizes" :key="item.label" class="preview-thumb">
        <div
          class="preview-thumb__box"
          :class="{ 'preview-thumb__box--circular': circular }"
          :style="{ width: `${item.size}px`, height: `${item.size}px` }"
        >
          <template v-if="hasValidPreview">
            <div
              class="preview-thumb__viewport"
              :style="getThumbViewportStyle(item.size)"
            >
              <div :style="previewData.div">
                <img
                  :src="previewData.url"
                  :style="previewData.img"
                  alt="thumb"
                />
              </div>
            </div>
          </template>
        </div>
        <span class="preview-thumb__label">{{ item.label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import C_Icon from "../../C_Icon/index.vue";

const props = defineProps<{
  previewData: any;
  circular?: boolean;
}>();

const mainBoxRef = ref<HTMLElement | null>(null);
const mainBoxWidth = ref(200);

const thumbSizes = [
  { label: "80px", size: 80 },
  { label: "48px", size: 48 },
  { label: "32px", size: 32 },
];

const hasValidPreview = computed(() => {
  const d = props.previewData;
  return d && d.url && d.w > 0 && d.h > 0;
});

const mainViewportStyle = computed(() => {
  if (!hasValidPreview.value) return {};
  const { w } = props.previewData;
  const zoom = mainBoxWidth.value / w;
  return { zoom, overflow: "hidden" };
});

function getThumbViewportStyle(size: number) {
  if (!hasValidPreview.value) return {};
  const { w } = props.previewData;
  return { zoom: size / w, overflow: "hidden" };
}

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  if (mainBoxRef.value) {
    mainBoxWidth.value = mainBoxRef.value.clientWidth;
    resizeObserver = new ResizeObserver((entries) => {
      requestAnimationFrame(() => {
        for (const entry of entries) {
          mainBoxWidth.value = entry.contentRect.width;
        }
      });
    });
    resizeObserver.observe(mainBoxRef.value);
  }
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
});
</script>

<style lang="scss" scoped>
.cropper-preview {
  display: flex;
  flex-direction: column;
  gap: 16px;

  .preview-label {
    display: flex;
    gap: 6px;
    align-items: center;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-color-2);
  }

  .preview-main {
    width: 100%;
    overflow: hidden;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    background:
      linear-gradient(45deg, #f0f0f0 25%, transparent 25%),
      linear-gradient(-45deg, #f0f0f0 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #f0f0f0 75%),
      linear-gradient(-45deg, transparent 75%, #f0f0f0 75%);
    background-position:
      0 0,
      0 8px,
      8px -8px,
      -8px 0;
    background-size: 16px 16px;

    &--circular {
      border-radius: 50%;
    }

    &__viewport img {
      display: block;
      max-width: none !important;
    }
  }

  .preview-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    min-height: 120px;
  }

  .preview-thumbs {
    display: flex;
    gap: 12px;
    align-items: flex-end;
    justify-content: center;
  }

  .preview-thumb {
    display: flex;
    flex-direction: column;
    gap: 4px;
    align-items: center;

    &__box {
      overflow: hidden;
      border: 1px solid var(--border-color);
      border-radius: 4px;
      background: var(--body-color);

      &--circular {
        border-radius: 50%;
      }
    }

    &__viewport img {
      display: block;
      max-width: none !important;
    }

    &__label {
      font-size: 11px;
      color: var(--text-color-3);
    }
  }
}
</style>
