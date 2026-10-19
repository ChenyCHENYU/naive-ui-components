<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-26
 * @Description: 视频播放器组件（基于 xgplayer）
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
-->

<template>
  <div
    ref="wrapperRef"
    class="c-video-player"
    :class="{
      'is-mini': miniPlayer.isMiniMode.value,
      'is-fullscreen': isFullscreen,
    }"
    tabindex="0"
  >
    <!-- 播放器容器 -->
    <div
      ref="containerRef"
      class="c-video-player__container"
    />

    <!-- 动态水印 -->
    <WatermarkOverlay
      :visible="antiCheatState.showWatermark.value"
      :text="antiCheatState.watermarkText.value"
    />

    <!-- 字幕渲染层 -->
    <SubtitleOverlay
      :text="subtitle.currentText.value"
      :tracks="subtitle.subtitleList.value"
      :active-language="subtitle.activeLanguage.value"
      @switch="subtitle.switchSubtitle"
      @close="subtitle.closeSubtitle"
    />

    <!-- 测验弹窗 -->
    <QuizOverlay
      v-if="props.quizzes?.length"
      v-model:answer="quiz.selectedAnswer.value"
      :quiz="quiz.activeQuiz.value"
      :show-result="quiz.showResult.value"
      :is-correct="quiz.lastAnswerCorrect.value"
      @submit="handleQuizSubmit"
      @retry="quiz.retryQuiz()"
      @close="handleQuizClose"
    />

    <!-- 扩展控制栏（xgplayer 自带控制栏外的扩展） -->
    <ControlBar :visible="showExtendedControls">
      <template #left>
        <!-- 章节标记 -->
        <ChapterMarkers
          v-if="props.chapters?.length"
          :chapters="chaptersRef"
          :current-chapter="chapters.currentChapter.value"
          :current-index="chapters.currentChapterIndex.value"
          @go-to="chapters.goToChapter"
        />
      </template>

      <template #right>
        <!-- 书签面板 -->
        <BookmarkPanel
          :bookmarks="bookmarksState.bookmarks.value"
          @add="handleAddBookmark"
          @remove="bookmarksState.removeBookmark"
          @go-to="bookmarksState.goToBookmark"
        />
      </template>
    </ControlBar>

    <!-- 小窗关闭按钮 -->
    <button
      v-if="miniPlayer.isMiniMode.value"
      type="button"
      class="c-video-player__mini-close"
      aria-label="关闭小窗播放"
      @click="miniPlayer.closeMiniPlayer()"
    >
      ✕
    </button>

    <!-- 小窗点击回原位 -->
    <button
      v-if="miniPlayer.isMiniMode.value"
      type="button"
      class="c-video-player__mini-back"
      @click="miniPlayer.scrollToPlayer()"
    >
      回到原位
    </button>
  </div>
</template>

<script setup lang="ts">
  import {
    ref,
    computed,
    watch,
    toRef,
    onMounted,
    onBeforeUnmount,
    nextTick,
  } from 'vue'
  import { XGPLAYER_EVENTS as Events } from './constants'
  import {
    usePlayerCore,
    usePlaybackControl,
    useProgressTracker,
    useQualitySwitch,
    useChapters,
    useBookmarks,
    useAntiCheat,
    useSubtitle,
    useQuiz,
    useMiniPlayer,
    useKeyboard,
  } from './composables'
  import { createAnalyticsPlugin } from './plugins'
  import ControlBar from './components/ControlBar.vue'
  import SubtitleOverlay from './components/SubtitleOverlay.vue'
  import ChapterMarkers from './components/ChapterMarkers.vue'
  import BookmarkPanel from './components/BookmarkPanel.vue'
  import QuizOverlay from './components/QuizOverlay.vue'
  import WatermarkOverlay from './components/WatermarkOverlay.vue'
  import type {
    VideoPlayerProps,
    VideoPlayerExpose,
    PlayerState,
    QualityLevel,
    ProgressData,
    Bookmark,
    Chapter,
  } from './types'

  defineOptions({ name: 'VideoPlayerRuntime' })

  const props = defineProps<VideoPlayerProps>()

  const emit = defineEmits<{
    ready: []
    stateChange: [state: PlayerState]
    timeUpdate: [currentTime: number, duration: number]
    ended: []
    error: [error: Error]
    qualityChange: [quality: QualityLevel]
    rateChange: [rate: number]
    fullscreenChange: [isFullscreen: boolean]
    bookmarkChange: [bookmarks: Bookmark[]]
    quizAnswer: [quizId: string, answer: string | string[], isCorrect: boolean]
    chapterChange: [chapter: Chapter]
    progressUpdate: [data: ProgressData]
  }>()

  /* ======================== 核心 ======================== */

  const core = usePlayerCore(props)
  const {
    containerRef,
    playerRef,
    playerState,
    currentTime,
    duration,
    isFullscreen,
  } = core

  const wrapperRef = ref<HTMLElement | null>(null)

  /* ======================== 播放控制 ======================== */

  const playback = usePlaybackControl(playerRef)

  /* ======================== 进度追踪 ======================== */

  const urlRef = toRef(props, 'url')
  const progressTracker = useProgressTracker(
    playerRef,
    currentTime,
    duration,
    urlRef,
    data => props.onProgress?.(data),
    {
      get heartbeatInterval() {
        return props.antiCheat?.heartbeatInterval
      },
      get onHeartbeat() {
        return props.antiCheat?.onHeartbeat
      },
    }
  )

  /* ======================== 清晰度切换 ======================== */

  const qualitySwitch = useQualitySwitch(playerRef, () => props.qualityList)

  /* ======================== 章节标记 ======================== */

  const chaptersRef = computed(() => props.chapters ?? [])
  const chapters = useChapters(
    chaptersRef,
    currentTime,
    duration,
    playback.seek
  )

  /* ======================== 书签笔记 ======================== */

  const bookmarksState = useBookmarks(
    urlRef,
    currentTime,
    playback.seek,
    () => props.bookmarks
  )

  /* ======================== 防作弊 ======================== */

  const antiCheatState = useAntiCheat(
    playerRef,
    currentTime,
    () => props.antiCheat
  )

  /* ======================== 字幕 ======================== */

  const subtitle = useSubtitle(playerRef, () => props.subtitles, currentTime)

  /* ======================== 测验 ======================== */

  const quizzesRef = computed(() => props.quizzes ?? [])
  const quiz = useQuiz(playerRef, currentTime, quizzesRef)

  /* ======================== 小窗播放 ======================== */

  const miniEnabled = computed(() => props.miniPlayer ?? false)
  const miniPlayer = useMiniPlayer(wrapperRef, miniEnabled)

  /* ======================== 快捷键 ======================== */

  const keyboard = useKeyboard(playerRef, wrapperRef, {
    get enabled() {
      return props.keyboard !== false
    },
    onToggleFullscreen: () => {
      playerRef.value?.getFullscreen?.()
    },
  })

  /* ======================== 数据分析 ======================== */

  let analyticsDestroy: (() => void) | null = null
  let disposed = false

  watch(
    [playerRef, () => props.onAnalytics],
    ([player, reporter]) => {
      analyticsDestroy?.()
      analyticsDestroy = null
      if (disposed || !player || !reporter) return
      analyticsDestroy = createAnalyticsPlugin(player, event =>
        props.onAnalytics?.(event)
      ).destroy
    },
    { flush: 'post' }
  )

  /* ======================== 扩展控制栏：书签始终可用，章节/清晰度按需 ======================== */

  const showExtendedControls = true

  /* ======================== 事件处理 ======================== */

  /** 处理添加书签 */
  function handleAddBookmark(note: string) {
    bookmarksState.addBookmark(note)
    emit('bookmarkChange', bookmarksState.bookmarks.value)
  }

  /** 处理测验提交 */
  function handleQuizSubmit() {
    const isCorrect = quiz.submitAnswer()
    const activeQuiz = quiz.activeQuiz.value
    if (activeQuiz) {
      emit('quizAnswer', activeQuiz.id, quiz.selectedAnswer.value, isCorrect)
    }
  }

  /** 处理测验关闭 */
  function handleQuizClose() {
    quiz.closeQuiz()
  }

  /* ======================== 监听播放器事件并向外 emit ======================== */

  watch(playerState, state => {
    emit('stateChange', state)
  })

  watch(isFullscreen, val => {
    emit('fullscreenChange', val)
  })

  /* 监听章节变化 */
  watch(
    () => chapters.currentChapter.value,
    chapter => {
      if (chapter) {
        emit('chapterChange', chapter)
      }
    }
  )

  /* ======================== 初始化 & 销毁 ======================== */

  onMounted(async () => {
    /* 将 wrapperRef 的 el 赋值给 core */
    core.containerRef.value = containerRef.value

    await nextTick()
    if (disposed) return
    try {
      await core.initPlayer()
    } catch (error) {
      if (!disposed) {
        emit('error', error instanceof Error ? error : new Error(String(error)))
      }
      return
    }
    if (disposed) return

    const player = playerRef.value
    if (!player) return

    /* 绑定各模块事件 */
    qualitySwitch.bindEvents(player)
    antiCheatState.bindEvents(player)
    subtitle.initSubtitles()
    keyboard.startListening()
    miniPlayer.initObserver()

    /* 恢复断点续播 */
    const restoreTime = progressTracker.restoreProgress()
    if (restoreTime > 0 && props.startTime === undefined) {
      player.currentTime = restoreTime
      currentTime.value = restoreTime
    }

    const isCurrentPlayer = () => !disposed && playerRef.value === player

    /* 播放器事件 → 进度追踪 */
    player.on(Events.PLAY, () => {
      if (!isCurrentPlayer()) return
      progressTracker.onPlay()
    })
    player.on(Events.PAUSE, () => {
      if (!isCurrentPlayer()) return
      progressTracker.onPause()
    })
    player.on(Events.TIME_UPDATE, () => {
      if (!isCurrentPlayer()) return
      progressTracker.onTimeUpdate()
      emit('timeUpdate', currentTime.value, duration.value)
      emit('progressUpdate', progressTracker.getProgressData())
    })
    player.on(Events.ENDED, () => {
      if (!isCurrentPlayer()) return
      emit('ended')
      antiCheatState.markAsWatched()
    })
    player.on(Events.ERROR, () => {
      if (!isCurrentPlayer()) return
      emit('error', new Error('播放器错误'))
    })
    player.on(Events.READY, () => {
      if (!isCurrentPlayer()) return
      emit('ready')
    })

    /* xgplayer 原生清晰度切换 → 向外 emit */
    player.on(
      Events.AFTER_DEFINITION_CHANGE,
      (data: { to: string | { definition: string } }) => {
        if (!isCurrentPlayer()) return
        const label = typeof data.to === 'string' ? data.to : data.to.definition
        emit('qualityChange', label as QualityLevel)
      }
    )

    /* xgplayer 原生倍速切换 → 向外 emit */
    player.on(Events.RATE_CHANGE, () => {
      if (!isCurrentPlayer()) return
      emit('rateChange', player.playbackRate)
    })
  })

  onBeforeUnmount(() => {
    disposed = true
    analyticsDestroy?.()
    keyboard.stopListening()
    miniPlayer.destroyObserver()
  })

  /* ======================== 暴露方法 ======================== */

  defineExpose<VideoPlayerExpose>({
    play: playback.play,
    pause: playback.pause,
    seek: playback.seek,
    setPlaybackRate: playback.setPlaybackRate,
    setVolume: playback.setVolume,
    switchQuality: qualitySwitch.switchQuality,
    getProgressData: progressTracker.getProgressData,
    destroy: () => {
      progressTracker.stopTracking()
      subtitle.resetSubtitles()
      analyticsDestroy?.()
      analyticsDestroy = null
      keyboard.stopListening()
      miniPlayer.destroyObserver()
      core.destroyPlayer()
    },
    getPlayerInstance: () => playerRef.value,
  })
</script>

<style scoped lang="scss">
  @use './index.scss';
</style>
