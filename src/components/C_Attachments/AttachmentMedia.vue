<template>
  <div
    v-if="failed"
    class="c-attachments__media-error"
    role="alert"
  >
    {{ t('attachments.previewFailed') }}
    <NButton
      size="small"
      attr-type="button"
      @click="failed = false"
      >{{ t('common.retry') }}</NButton
    >
  </div>
  <img
    v-else-if="source && kind === 'image'"
    class="c-attachments__image"
    :src="source"
    :alt="name"
    @error="failed = true"
  />
  <video
    v-else-if="source && kind === 'video'"
    ref="player"
    class="c-attachments__video"
    :aria-label="name"
    :src="source"
    controls
    playsinline
    preload="metadata"
    @error="failed = true"
  />
  <audio
    v-else-if="source"
    ref="player"
    class="c-attachments__audio"
    :aria-label="name"
    :src="source"
    controls
    preload="metadata"
    @error="failed = true"
  />
</template>

<script setup lang="ts">
  import { NButton } from 'naive-ui'
  import { computed, onBeforeUnmount, ref, watch } from 'vue'
  import { useAttachmentsLocale } from './locale'
  import { useLocalFileUrl } from '../../composables/useLocalFileUrl'
  import type { ComponentLocale } from '../../core/contracts'
  import type { AttachmentMediaKind } from './types'

  const props = defineProps<{
    file?: File
    url?: string
    kind: AttachmentMediaKind
    name: string
    locale?: ComponentLocale
  }>()
  const { t } = useAttachmentsLocale(() => props.locale)
  const objectUrl = useLocalFileUrl(() => props.file)
  const failed = ref(false)
  const player = ref<HTMLMediaElement>()
  const source = computed(() => (props.file ? objectUrl.value : props.url))

  onBeforeUnmount(() => player.value?.pause())
  watch(source, () => {
    failed.value = false
  })
</script>
