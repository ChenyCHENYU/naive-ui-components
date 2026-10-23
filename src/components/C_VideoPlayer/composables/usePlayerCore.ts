/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-26
 * @Description: 播放器核心逻辑 - 初始化 / 销毁 / 状态管理
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */

import { ref, shallowRef, onBeforeUnmount, onUnmounted, type Ref } from 'vue'
import {
  DEFAULT_VOLUME,
  SOURCE_TYPE_MAP,
  XGPLAYER_EVENTS as Events,
} from '../constants'
import type {
  PlayerInstance,
  PlayerState,
  VideoPlayerProps,
  IPlayerOptions,
  VideoSourceType,
} from '../types'

/** 根据 URL 推断视频源类型 */
function detectSourceType(url: string): VideoSourceType {
  try {
    const { pathname } = new URL(url, location.href)
    const ext = pathname.slice(pathname.lastIndexOf('.')).toLowerCase()
    return SOURCE_TYPE_MAP[ext] ?? 'mp4'
  } catch {
    return 'mp4'
  }
}

/**
 * 播放器核心 composable
 * - 管理 xgplayer 实例的创建 & 销毁
 * - 暴露播放器状态、引用
 */
export function usePlayerCore(props: VideoPlayerProps) {
  /** 播放器 DOM 容器 */
  const containerRef: Ref<HTMLElement | null> = ref(null)

  /** xgplayer 实例（使用 shallowRef 避免深度响应） */
  const playerRef = shallowRef<PlayerInstance | null>(null)

  /** 播放器当前状态 */
  const playerState = ref<PlayerState>('idle')

  /** 当前播放时间 */
  const currentTime = ref(0)

  /** 视频总时长 */
  const duration = ref(0)

  /** 是否全屏 */
  const isFullscreen = ref(false)

  let initVersion = 0
  let disposed = false

  /** 构建播放器核心容器配置 */
  function buildCoreConfig(): IPlayerOptions {
    return {
      el: containerRef.value!,
      url: props.url,
      width: props.width ?? '100%',
      height: props.height ?? '100%',
      fluid: props.fluid !== false,
      fitVideoSize: 'fixWidth' as const,
      poster: props.poster ?? '',
      playsinline: true,
      videoAttributes: { crossOrigin: 'anonymous' },
      lang: props.lang ?? 'zh-cn',
      inactive: 3000,
    }
  }

  /** 构建播放行为配置 */
  function buildPlaybackConfig(): Partial<IPlayerOptions> {
    return {
      autoplay: props.autoplay ?? false,
      autoplayMuted: props.autoplayMuted ?? false,
      loop: props.loop ?? false,
      volume: props.volume ?? DEFAULT_VOLUME,
      startTime: props.startTime ?? 0,
      defaultPlaybackRate: props.defaultPlaybackRate ?? 1,
      playbackRate: props.playbackRates
        ? { list: props.playbackRates.map(r => r) }
        : true,
    }
  }

  /** 构建功能开关配置 */
  function buildFeatureConfig(): Partial<IPlayerOptions> {
    return {
      pip: props.pip !== false,
      screenShot: props.screenshot ?? false,
      mini: props.miniPlayer ?? false,
      fullscreen: props.fullscreen !== false,
      cssFullscreen: props.cssFullscreen !== false,
      // The component handles shortcuts on its own focused container.
      keyShortcut: false,
    }
  }

  /** 构建扩展配置（缩略图、清晰度等） */
  function applyExtendedConfig(config: IPlayerOptions): void {
    if (props.thumbnail) {
      config.thumbnail = {
        urls: props.thumbnail.urls,
        pic_num: props.thumbnail.picNum,
        col: props.thumbnail.col,
        row: props.thumbnail.row,
        width: props.thumbnail.width,
        height: props.thumbnail.height,
      }
    }

    if (props.qualityList?.length) {
      config.definition = {
        list: props.qualityList.map(q => ({
          url: q.url,
          definition: q.label,
          text: { zh: q.label, en: q.label },
          bitrate: q.bitrate,
        })),
        defaultDefinition: props.defaultQuality ?? props.qualityList[0].label,
      }
    }

    if (props.playerOptions) {
      Object.assign(config, props.playerOptions)
    }
  }

  /** 构建完整 xgplayer 配置 */
  function buildConfig(): IPlayerOptions {
    const sourceType = props.sourceType ?? detectSourceType(props.url)
    const config: IPlayerOptions = {
      ...buildCoreConfig(),
      ...buildPlaybackConfig(),
      ...buildFeatureConfig(),
    }
    applyExtendedConfig(config)
    ;(config as Record<string, unknown>).__sourceType = sourceType
    return config
  }

  /** 仅加载被选择的协议；未配置的可选协议在创建实例前明确失败。 */
  async function loadPlayerConstructor(sourceType: VideoSourceType) {
    if (sourceType === 'dash' || sourceType === 'flv') {
      const adapter = props.sourceAdapters?.[sourceType]
      if (!adapter)
        throw new Error(
          `视频协议 ${sourceType.toUpperCase()} 未配置 sourceAdapters 适配器`
        )
      return await adapter()
    } else if (sourceType === 'hls') {
      const { default: HlsPlayer } = await import('xgplayer-hls')
      return HlsPlayer as unknown as typeof import('xgplayer').default
    } else {
      const { default: PresetPlayer } = await import('xgplayer')
      return PresetPlayer
    }
  }

  /** 初始化播放器 */
  async function initPlayer() {
    if (disposed || !containerRef.value) return

    destroyPlayer()
    const version = ++initVersion

    playerState.value = 'loading'

    const config = buildConfig()
    const sourceType = (config as Record<string, unknown>)
      .__sourceType as VideoSourceType
    delete (config as Record<string, unknown>).__sourceType

    let PlayerConstructor: typeof import('xgplayer').default
    try {
      PlayerConstructor = await loadPlayerConstructor(sourceType)
      // A route may unmount while the player chunk is still loading.
      if (disposed || version !== initVersion || !containerRef.value) return
      const player = new PlayerConstructor(config)
      playerRef.value = player
    } catch (error) {
      if (disposed || version !== initVersion) return
      playerState.value = 'error'
      throw error
    }

    const player = playerRef.value!

    const isCurrent = () =>
      !disposed && version === initVersion && playerRef.value === player

    /* 绑定事件 */
    player.on(Events.READY, () => {
      if (!isCurrent()) return
      playerState.value = 'ready'
    })

    player.on(Events.PLAY, () => {
      if (!isCurrent()) return
      playerState.value = 'playing'
    })

    player.on(Events.PAUSE, () => {
      if (!isCurrent()) return
      playerState.value = 'paused'
    })

    player.on(Events.ENDED, () => {
      if (!isCurrent()) return
      playerState.value = 'ended'
    })

    player.on(Events.ERROR, () => {
      if (!isCurrent()) return
      playerState.value = 'error'
    })

    player.on(Events.TIME_UPDATE, () => {
      if (!isCurrent()) return
      currentTime.value = player.currentTime ?? 0
      duration.value = player.duration ?? 0
    })

    player.on(Events.DURATION_CHANGE, () => {
      if (!isCurrent()) return
      duration.value = player.duration ?? 0
    })

    player.on(Events.FULLSCREEN_CHANGE, (isFS: boolean) => {
      if (!isCurrent()) return
      isFullscreen.value = isFS
    })
  }

  /** 销毁播放器 */
  function destroyPlayer() {
    initVersion++
    const player = playerRef.value
    if (player) {
      playerRef.value = null
      player.destroy()
    }
    playerState.value = 'idle'
    currentTime.value = 0
    duration.value = 0
    isFullscreen.value = false
  }

  onBeforeUnmount(() => {
    disposed = true
  })
  onUnmounted(() => {
    disposed = true
    destroyPlayer()
  })

  return {
    containerRef,
    playerRef,
    playerState,
    currentTime,
    duration,
    isFullscreen,
    initPlayer,
    destroyPlayer,
  }
}
