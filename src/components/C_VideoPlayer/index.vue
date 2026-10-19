<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-19
 * @Description: 视频资源边界；每个来源独占播放、字幕、测验和持久化生命周期
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
-->
<template>
  <VideoPlayerRuntime
    v-if="props.url && active"
    :key="resourceKey"
    ref="runtime"
    v-bind="props"
    @ready="emit('ready')"
    @state-change="state => emit('stateChange', state)"
    @time-update="(time, duration) => emit('timeUpdate', time, duration)"
    @ended="emit('ended')"
    @error="error => emit('error', error)"
    @quality-change="quality => emit('qualityChange', quality)"
    @rate-change="rate => emit('rateChange', rate)"
    @fullscreen-change="value => emit('fullscreenChange', value)"
    @bookmark-change="bookmarks => emit('bookmarkChange', bookmarks)"
    @quiz-answer="
      (id, answer, correct) => emit('quizAnswer', id, answer, correct)
    "
    @chapter-change="chapter => emit('chapterChange', chapter)"
    @progress-update="progress => emit('progressUpdate', progress)"
  />
</template>

<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import VideoPlayerRuntime from './VideoPlayerRuntime.vue'
  import type {
    VideoPlayerProps,
    VideoPlayerEmits,
    VideoPlayerExpose,
  } from './types'

  defineOptions({ name: 'C_VideoPlayer' })
  const props = defineProps<VideoPlayerProps>()
  const emit = defineEmits<VideoPlayerEmits>()
  const runtime = ref<VideoPlayerExpose>()
  const active = ref(true)
  // Vue 先卸载旧资源，再挂载新资源。旧实例的 props 不会先被改成新 URL，
  // 因而最后一次进度、书签和异步回调始终属于原资源。
  const resourceKey = computed(() =>
    JSON.stringify([props.url, props.sourceType])
  )

  watch(
    resourceKey,
    () => {
      active.value = true
    },
    { flush: 'sync' }
  )

  defineExpose<VideoPlayerExpose>({
    play: () => runtime.value?.play(),
    pause: () => runtime.value?.pause(),
    seek: time => runtime.value?.seek(time),
    setPlaybackRate: rate => runtime.value?.setPlaybackRate(rate),
    setVolume: volume => runtime.value?.setVolume(volume),
    switchQuality: quality => runtime.value?.switchQuality(quality),
    getProgressData: () =>
      runtime.value?.getProgressData() ?? {
        currentTime: 0,
        duration: 0,
        watchedDuration: 0,
        completionPercent: 0,
        updatedAt: Date.now(),
      },
    destroy: () => {
      runtime.value?.destroy()
      active.value = false
    },
    getPlayerInstance: () => runtime.value?.getPlayerInstance() ?? null,
  })
</script>
