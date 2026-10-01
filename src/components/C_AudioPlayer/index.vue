<!--
 * @Description: 音频播放器组件
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
-->
<template>
  <div
    class="c-audio-player"
    :class="{ 'is-minimal': theme === 'minimal' }"
  >
    <!-- ================ Now Playing ================ -->
    <div class="c-audio-player__now-playing">
      <div
        v-if="showCover"
        class="c-audio-player__cover"
      >
        <img
          v-if="currentTrack?.cover"
          :src="currentTrack.cover"
          :alt="currentTrack.title"
        />
        <C_Icon
          v-else
          name="mdi:music-note"
          class="c-audio-player__cover-placeholder"
        />
      </div>
      <div class="c-audio-player__info">
        <div class="c-audio-player__title">{{
          currentTrack?.title ?? '未选择曲目'
        }}</div>
        <div
          v-if="currentTrack?.artist"
          class="c-audio-player__artist"
        >
          {{ currentTrack.artist }}
        </div>
      </div>
    </div>

    <!-- ================ Progress ================ -->
    <div
      v-if="theme !== 'minimal'"
      class="c-audio-player__progress"
    >
      <div
        class="c-audio-player__progress-bar"
        role="slider"
        :tabindex="currentTrack ? 0 : -1"
        aria-label="播放进度"
        :aria-valuemin="0"
        :aria-valuemax="Math.floor(totalDuration)"
        :aria-valuenow="Math.floor(currentTime)"
        @click="seekByClick"
        @keydown="seekByKeyboard"
      >
        <div
          class="c-audio-player__progress-fill"
          :style="{ width: `${progressPercent}%` }"
        />
      </div>
      <div class="c-audio-player__time">
        <span>{{ formatTime(currentTime) }}</span>
        <span>{{ formatTime(totalDuration) }}</span>
      </div>
    </div>

    <!-- ================ Controls ================ -->
    <div class="c-audio-player__controls">
      <button
        type="button"
        class="c-audio-player__ctrl-btn is-mode"
        :title="currentModeLabel"
        @click="cycleMode"
      >
        <C_Icon :name="currentModeIcon" />
      </button>
      <button
        type="button"
        class="c-audio-player__ctrl-btn is-skip"
        title="上一曲"
        @click="prev"
      >
        <C_Icon name="mdi:skip-previous" />
      </button>
      <button
        type="button"
        class="c-audio-player__ctrl-btn is-play"
        :disabled="!currentTrack"
        :title="isPlaying ? '暂停' : '播放'"
        @click="togglePlay"
      >
        <C_Icon :name="isPlaying ? 'mdi:pause' : 'mdi:play'" />
      </button>
      <button
        type="button"
        class="c-audio-player__ctrl-btn is-skip"
        title="下一曲"
        @click="next"
      >
        <C_Icon name="mdi:skip-next" />
      </button>
      <button
        type="button"
        class="c-audio-player__ctrl-btn is-mode"
        title="播放列表"
        @click="playlistVisible = !playlistVisible"
      >
        <C_Icon name="mdi:playlist-music" />
      </button>
    </div>

    <!-- ================ Volume ================ -->
    <div
      v-if="theme !== 'minimal'"
      class="c-audio-player__volume"
    >
      <button
        type="button"
        class="c-audio-player__volume-icon"
        :aria-label="volume === 0 ? '取消静音' : '静音'"
        @click="toggleMute"
      >
        <C_Icon :name="volumeIcon" />
      </button>
      <NSlider
        v-model:value="volume"
        :min="0"
        :max="100"
        :step="1"
        class="c-audio-player__volume-slider"
        @update:value="handleVolumeChange"
      />
    </div>

    <!-- ================ Playlist ================ -->
    <div
      v-if="showPlaylist && playlistVisible && theme !== 'minimal'"
      class="c-audio-player__playlist"
    >
      <div class="c-audio-player__playlist-header">
        <span>播放列表</span>
        <span>{{ tracks.length }} 首</span>
      </div>
      <button
        v-for="(track, idx) in tracks"
        :key="track.id"
        type="button"
        class="c-audio-player__track"
        :class="{ 'is-active': idx === activeIndex }"
        @click="playTrack(idx)"
      >
        <span class="c-audio-player__track-index">
          <C_Icon
            v-if="idx === activeIndex && isPlaying"
            name="mdi:volume-high"
          />
          <template v-else>{{ idx + 1 }}</template>
        </span>
        <div class="c-audio-player__track-info">
          <div class="c-audio-player__track-title">{{ track.title }}</div>
          <div
            v-if="track.artist"
            class="c-audio-player__track-artist"
          >
            {{ track.artist }}
          </div>
        </div>
        <span
          v-if="track.duration"
          class="c-audio-player__track-duration"
        >
          {{ formatTime(track.duration) }}
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
  import C_Icon from '../C_Icon/index.vue'
  import {
    DEFAULT_AUDIO_PLAYER_PROPS,
    formatTime,
    MODE_ICON_MAP,
    normalizeTrackIndex,
    type AudioPlayerProps,
  } from './types'

  const props = withDefaults(
    defineProps<{
      tracks: AudioPlayerProps['tracks']
      initialIndex?: number
      showPlaylist?: boolean
      showCover?: boolean
      autoplay?: boolean
      mode?: AudioPlayerProps['mode']
      theme?: AudioPlayerProps['theme']
    }>(),
    {
      initialIndex: DEFAULT_AUDIO_PLAYER_PROPS.initialIndex,
      showPlaylist: DEFAULT_AUDIO_PLAYER_PROPS.showPlaylist,
      showCover: true,
      autoplay: DEFAULT_AUDIO_PLAYER_PROPS.autoplay,
      mode: DEFAULT_AUDIO_PLAYER_PROPS.mode,
      theme: DEFAULT_AUDIO_PLAYER_PROPS.theme,
    }
  )

  const emit = defineEmits<{
    play: [index: number]
    pause: []
    ended: [index: number]
    modeChange: [mode: string]
    error: [error: unknown]
  }>()

  // ==================== Audio Core ====================

  let audio: HTMLAudioElement | null = null
  let playVersion = 0
  const hasTrack = (index: number): boolean =>
    Number.isInteger(index) && Boolean(props.tracks[index])
  const isCurrentPlayback = (version: number, current: HTMLAudioElement) =>
    version === playVersion && current === audio

  const activeIndex = ref(
    normalizeTrackIndex(props.initialIndex ?? 0, props.tracks.length)
  )
  const isPlaying = ref(false)
  const currentTime = ref(0)
  const totalDuration = ref(0)
  const volume = ref(70)
  const prevVolume = ref(70)
  const playlistVisible = ref(props.showPlaylist)
  const playMode = ref(props.mode ?? 'list')

  const currentTrack = computed(() => props.tracks[activeIndex.value])

  const progressPercent = computed(() => {
    if (totalDuration.value <= 0) return 0
    return Math.min(100, (currentTime.value / totalDuration.value) * 100)
  })

  const volumeIcon = computed(() => {
    if (volume.value === 0) return 'mdi:volume-off'
    if (volume.value < 40) return 'mdi:volume-low'
    if (volume.value < 70) return 'mdi:volume-medium'
    return 'mdi:volume-high'
  })

  const currentModeIcon = computed(
    () => MODE_ICON_MAP[playMode.value]?.icon ?? 'mdi:repeat'
  )
  const currentModeLabel = computed(
    () => MODE_ICON_MAP[playMode.value]?.label ?? '循环'
  )

  /** 初始化音频实例 */
  function initAudio() {
    playVersion += 1
    if (audio) {
      audio.pause()
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onMetaLoaded)
      audio.removeEventListener('ended', onEnded)
    }
    audio = null
    isPlaying.value = false
    currentTime.value = 0
    const track = currentTrack.value
    totalDuration.value = track?.duration ?? 0
    if (!track || typeof Audio === 'undefined') return

    audio = new Audio(track.src)
    audio.volume = volume.value / 100
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onMetaLoaded)
    audio.addEventListener('ended', onEnded)
  }

  /** 播放进度更新回调 */
  function onTimeUpdate() {
    if (audio)
      currentTime.value = Number.isFinite(audio.currentTime)
        ? audio.currentTime
        : 0
  }

  /** 音频元数据加载完成回调 */
  function onMetaLoaded() {
    if (audio)
      totalDuration.value = Number.isFinite(audio.duration) ? audio.duration : 0
  }

  /** 播放结束回调，根据模式决定下一步 */
  function onEnded() {
    emit('ended', activeIndex.value)
    switch (playMode.value) {
      case 'loop':
        if (audio) audio.currentTime = 0
        void startPlayback(activeIndex.value, false)
        break
      case 'single':
        isPlaying.value = false
        break
      case 'shuffle':
        if (props.tracks.length) {
          void playTrack(Math.floor(Math.random() * props.tracks.length))
        }
        break
      default: // list
        if (!props.tracks.length) {
          isPlaying.value = false
          break
        }
        void playTrack(
          activeIndex.value < props.tracks.length - 1
            ? activeIndex.value + 1
            : 0
        )
    }
  }

  /** Only a successful browser play() transition can enter the playing state. */
  async function startPlayback(idx: number, restart: boolean): Promise<void> {
    if (!hasTrack(idx)) return
    if (restart || !audio || activeIndex.value !== idx) {
      activeIndex.value = idx
      initAudio()
    }
    const currentAudio = audio
    if (!currentAudio) return
    const version = ++playVersion
    try {
      await currentAudio.play()
      if (!isCurrentPlayback(version, currentAudio)) return
      isPlaying.value = true
      emit('play', idx)
    } catch (error) {
      if (!isCurrentPlayback(version, currentAudio)) return
      isPlaying.value = false
      emit('error', error)
    }
  }

  /** 切换播放/暂停 */
  function togglePlay() {
    if (!currentTrack.value) return
    if (!isPlaying.value) {
      void startPlayback(activeIndex.value, false)
      return
    }
    playVersion += 1
    audio?.pause()
    isPlaying.value = false
    emit('pause')
  }

  /** 播放指定索引的曲目 */
  function playTrack(idx: number): Promise<void> {
    return startPlayback(idx, true)
  }

  /** 上一曲 */
  function prev() {
    if (!props.tracks.length) return
    const idx =
      activeIndex.value <= 0 ? props.tracks.length - 1 : activeIndex.value - 1
    void playTrack(idx)
  }

  /** 下一曲 */
  function next() {
    if (!props.tracks.length) return
    const idx =
      activeIndex.value >= props.tracks.length - 1 ? 0 : activeIndex.value + 1
    void playTrack(idx)
  }

  /** 点击进度条跳转播放位置 */
  function seekByClick(e: MouseEvent) {
    if (!audio || !totalDuration.value) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    if (rect.width <= 0) return
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    audio.currentTime = ratio * totalDuration.value
    currentTime.value = audio.currentTime
  }

  function seekByKeyboard(event: KeyboardEvent) {
    if (!audio || totalDuration.value <= 0) return
    const delta =
      event.key === 'ArrowRight' ? 5 : event.key === 'ArrowLeft' ? -5 : 0
    const target =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? totalDuration.value
          : currentTime.value + delta
    if (!delta && event.key !== 'Home' && event.key !== 'End') return
    event.preventDefault()
    audio.currentTime = Math.max(0, Math.min(totalDuration.value, target))
    currentTime.value = audio.currentTime
  }

  /** 处理音量变更 */
  function handleVolumeChange(val: number) {
    volume.value = val
    if (audio) audio.volume = val / 100
  }

  /** 切换静音状态 */
  function toggleMute() {
    if (volume.value > 0) {
      prevVolume.value = volume.value
      volume.value = 0
    } else {
      volume.value = prevVolume.value || 70
    }
    if (audio) audio.volume = volume.value / 100
  }

  const MODES = ['list', 'loop', 'single', 'shuffle'] as const
  /** 循环切换播放模式 */
  function cycleMode() {
    const idx = MODES.indexOf(playMode.value as (typeof MODES)[number])
    playMode.value = MODES[(idx + 1) % MODES.length]
    emit('modeChange', playMode.value)
  }

  // ==================== Lifecycle ====================

  watch(
    () => props.tracks,
    () => {
      const resume = isPlaying.value
      activeIndex.value = normalizeTrackIndex(
        props.initialIndex ?? 0,
        props.tracks.length
      )
      initAudio()
      if (resume) void startPlayback(activeIndex.value, false)
    }
  )

  watch(
    () => props.initialIndex,
    val => {
      const nextIndex = normalizeTrackIndex(val ?? 0, props.tracks.length)
      if (nextIndex !== activeIndex.value) {
        const resume = isPlaying.value
        activeIndex.value = nextIndex
        initAudio()
        if (resume) void startPlayback(nextIndex, false)
      }
    }
  )

  watch(
    () => props.mode,
    mode => {
      playMode.value = mode
    }
  )

  watch(
    () => props.showPlaylist,
    show => {
      playlistVisible.value = show
    }
  )

  onMounted(() => {
    if (props.autoplay && currentTrack.value) {
      void startPlayback(activeIndex.value, false)
    }
  })

  onBeforeUnmount(() => {
    playVersion += 1
    if (audio) {
      audio.pause()
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onMetaLoaded)
      audio.removeEventListener('ended', onEnded)
      audio = null
    }
  })
</script>

<style scoped lang="scss">
  @use './index.scss';
</style>
