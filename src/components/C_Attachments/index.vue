<template>
  <section
    class="c-attachments"
    :aria-label="resolvedTitle"
  >
    <header class="c-attachments__header">
      <strong>{{ resolvedTitle }}</strong>
      <slot name="upload">
        <NButton
          v-if="uploadable"
          attr-type="button"
          type="primary"
          secondary
          :size="size"
          :disabled="disabled"
          @click="emit('upload')"
          >{{ t('attachments.upload') }}</NButton
        >
      </slot>
    </header>

    <div
      v-if="records.size"
      class="c-attachments__layout"
    >
      <div class="c-attachments__navigation">
        <NSelect
          v-if="categories.length"
          v-model:value="category"
          class="c-attachments__filter"
          clearable
          filterable
          :size="size"
          :options="categories"
          :placeholder="t('attachments.allCategories')"
          :input-props="{ 'aria-label': t('attachments.category') }"
        />
        <ul
          class="c-attachments__list"
          :aria-label="t('attachments.list')"
        >
          <li
            v-for="item of visibleItems"
            :key="item.id"
          >
            <button
              class="c-attachments__item"
              type="button"
              :aria-current="selectedKey === item.id ? 'true' : undefined"
              @click="selectedKey = item.id"
            >
              <C_Icon
                class="c-attachments__icon"
                :name="iconByKind[resolveAttachmentKind(item)]"
                aria-hidden="true"
              />
              <span class="c-attachments__info">
                <span class="c-attachments__name">{{ item.name }}</span>
                <span class="c-attachments__meta">
                  <span v-if="item.category">{{ item.category }}</span>
                  <span v-if="isFileSize(item.size)">{{
                    formatFileSize(item.size)
                  }}</span>
                  <span v-if="item.status">{{
                    t(`attachments.status.${item.status}`)
                  }}</span>
                  <span v-if="showProgress(item)"
                    >{{ progress(item.percent) }}%</span
                  >
                </span>
              </span>
            </button>
          </li>
        </ul>
      </div>

      <section
        class="c-attachments__details"
        :aria-label="t('attachments.preview')"
      >
        <template v-if="current">
          <header class="c-attachments__details-header">
            <div class="c-attachments__details-title">
              <strong>{{ current.name }}</strong>
              <p v-if="current.description">{{ current.description }}</p>
            </div>
            <div
              v-if="downloadable || removable"
              class="c-attachments__actions"
            >
              <NButton
                v-if="downloadable"
                attr-type="button"
                secondary
                :size="size"
                :disabled="disabled"
                @click="emit('download', current)"
                >{{ t('attachments.download') }}</NButton
              >
              <NButton
                v-if="removable"
                attr-type="button"
                tertiary
                type="error"
                :size="size"
                :disabled="disabled"
                @click="emit('remove', current)"
                >{{ t('attachments.remove') }}</NButton
              >
            </div>
          </header>

          <div class="c-attachments__preview">
            <slot
              v-if="active"
              name="preview"
              :item="current"
              :kind="kind"
            >
              <NEmpty
                v-if="(!current.file && !previewUrl) || kind === 'unknown'"
                :description="t('attachments.previewUnavailable')"
              />
              <AsyncFilePreview
                v-else-if="kind === 'document'"
                :key="current.id"
                inline
                :file="current.file"
                :file-name="current.file?.name ?? current.name"
                :url="previewUrl"
                :preview-limits="previewLimits"
              />
              <AttachmentMedia
                v-else
                :key="current.id"
                :file="current.file"
                :url="previewUrl"
                :kind="kind"
                :name="current.name"
                :locale="locale"
              />
            </slot>
          </div>
        </template>
        <NEmpty
          v-else
          class="c-attachments__placeholder"
          :description="t('attachments.choose')"
        />
      </section>
    </div>
    <NEmpty
      v-else
      class="c-attachments__placeholder"
      :description="t('attachments.empty')"
    />
  </section>
</template>

<script setup lang="ts" generic="T extends AttachmentItem = AttachmentItem">
  import {
    computed,
    defineAsyncComponent,
    h,
    onActivated,
    onDeactivated,
    onMounted,
    ref,
    watch,
  } from 'vue'
  import { NButton, NEmpty, NSelect } from 'naive-ui'
  import { useComponentDensity } from '../../composables/useComponentDensity'
  import { useAttachmentsLocale } from './locale'
  import { resolveComponentDensity } from '../../core/density'
  import C_Icon from '../C_Icon/index.vue'
  import { resolvePreviewUrl } from '../C_FilePreview/fileUrl'
  import { formatFileSize } from '../C_Upload/constants'
  import AttachmentMedia from './AttachmentMedia.vue'
  import { resolveAttachmentKind } from './data'
  import type {
    AttachmentItem,
    AttachmentKind,
    AttachmentsEmits,
    AttachmentsProps,
  } from './types'

  defineOptions({ name: 'C_Attachments' })
  const props = defineProps<AttachmentsProps<T>>()
  const emit = defineEmits<AttachmentsEmits<T>>()
  defineSlots<{
    upload?: () => unknown
    preview?: (props: { item: T; kind: AttachmentKind }) => unknown
  }>()
  const selectedKey = defineModel<T['id'] | null>('selectedKey', {
    default: null,
  })
  const { t } = useAttachmentsLocale(() => props.locale)
  const density = useComponentDensity(() => props.density)
  const size = computed(() => resolveComponentDensity(density.value).size)
  const resolvedTitle = computed(() => props.title ?? t('attachments.title'))
  const category = ref<string | null>(null)
  const active = ref(false)
  onMounted(() => {
    active.value = true
  })
  onActivated(() => {
    active.value = true
  })
  onDeactivated(() => {
    active.value = false
  })

  const AsyncFilePreview = defineAsyncComponent({
    loader: () =>
      import('../C_FilePreview/index.vue').then(module => module.default),
    loadingComponent: () =>
      h('p', { role: 'status' }, t('attachments.loading')),
    errorComponent: () =>
      h('p', { role: 'alert' }, t('attachments.previewFailed')),
  })
  const iconByKind: Record<AttachmentKind, string> = {
    image: 'mdi:file-image-outline',
    audio: 'mdi:file-music-outline',
    video: 'mdi:file-video-outline',
    document: 'mdi:file-document-outline',
    unknown: 'mdi:file-outline',
  }
  const records = computed(
    () => new Map(props.items.map(item => [item.id, item]))
  )
  const categories = computed(() => {
    const names = new Set<string>()
    for (const item of records.value.values()) {
      if (item.category) names.add(item.category)
    }
    return Array.from(names, name => ({ value: name, label: name }))
  })
  const visibleItems = computed(() => {
    const items = [...records.value.values()]
    const { value } = category
    if (!value || !categories.value.some(option => option.value === value))
      return items
    return items.filter(item => item.category === value)
  })
  watch(categories, options => {
    if (
      category.value !== null &&
      !options.some(option => option.value === category.value)
    )
      category.value = null
  })
  const current = computed(() =>
    visibleItems.value.find(item => item.id === selectedKey.value)
  )
  const kind = computed(() =>
    current.value ? resolveAttachmentKind(current.value) : 'unknown'
  )
  const previewUrl = computed(() => {
    const url = current.value?.url
    if (!active.value || !url) return undefined
    return resolvePreviewUrl(url, window.location.href) ?? undefined
  })

  function showProgress(item: T) {
    return (
      (item.status === 'uploading' || item.status === 'paused') &&
      Number.isFinite(item.percent)
    )
  }
  function isFileSize(bytes?: number): bytes is number {
    return (
      bytes !== undefined &&
      Number.isInteger(bytes) &&
      bytes >= 0 &&
      bytes < 1024 ** 5
    )
  }
  function progress(value?: number) {
    return Math.round(Math.max(0, Math.min(value ?? 0, 100)))
  }
</script>

<style scoped lang="scss">
  @use './index.scss';
</style>
