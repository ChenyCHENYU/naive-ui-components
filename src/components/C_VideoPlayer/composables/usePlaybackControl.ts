/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-26
 * @Description: 播放控制 - 播放/暂停/倍速/音量/跳转
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */

import { ref, watch, type ShallowRef } from 'vue'
import { getItem, setItem } from '../../../utils/storage'
import { STORAGE_KEYS } from '../constants'
import type { PlayerInstance } from '../types'

/**
 * 播放控制 composable
 * - 播放 / 暂停 / 跳转
 * - 音量调节（本地持久化）
 * - 倍速调节（本地持久化）
 */
export function usePlaybackControl(
  playerRef: ShallowRef<PlayerInstance | null>
) {
  const volume = ref(_getStoredVolume())
  const playbackRate = ref(_getStoredRate())
  const isMuted = ref(false)

  /** 播放 */
  function play() {
    playerRef.value?.play()
  }

  /** 暂停 */
  function pause() {
    playerRef.value?.pause()
  }

  /** 切换播放/暂停 */
  function togglePlay() {
    const player = playerRef.value
    if (!player) return
    if (player.paused) {
      player.play()
    } else {
      player.pause()
    }
  }

  /** 跳转到指定时间（秒） */
  function seek(time: number) {
    const player = playerRef.value
    if (!player) return
    const safeTime = Math.max(0, Math.min(time, player.duration ?? 0))
    player.currentTime = safeTime
  }

  /** 设置音量 0-1 */
  function setVolume(val: number) {
    const player = playerRef.value
    if (!player) return
    const safeVolume = Math.max(0, Math.min(1, val))
    player.volume = safeVolume
    volume.value = safeVolume
    isMuted.value = safeVolume === 0
    setItem(STORAGE_KEYS.VOLUME, safeVolume)
  }

  /** 切换静音 */
  function toggleMute() {
    const player = playerRef.value
    if (!player) return
    if (isMuted.value) {
      const restored = volume.value > 0 ? volume.value : 0.5
      setVolume(restored)
    } else {
      player.volume = 0
      isMuted.value = true
    }
  }

  /** 设置倍速 */
  function setPlaybackRate(rate: number) {
    const player = playerRef.value
    if (!player) return
    player.playbackRate = rate
    playbackRate.value = rate
    setItem(STORAGE_KEYS.PLAYBACK_RATE, rate)
  }

  /** 同步播放器实例的初始状态 */
  function syncInitialState() {
    const player = playerRef.value
    if (!player) return
    player.volume = volume.value
    player.playbackRate = playbackRate.value
    isMuted.value = volume.value === 0
  }

  /** 监听播放器实例变化，自动同步状态 */
  watch(playerRef, player => {
    if (player) syncInitialState()
  })

  return {
    volume,
    playbackRate,
    isMuted,
    play,
    pause,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    setPlaybackRate,
  }
}

/* ======================== 内部工具函数 ======================== */

/** 从 localStorage 读取已存储的音量 */
function _getStoredVolume(): number {
  const value = Number(getItem(STORAGE_KEYS.VOLUME))
  if (Number.isFinite(value) && value >= 0 && value <= 1) return value
  return 0.75
}

/** 从 localStorage 读取已存储的倍速 */
function _getStoredRate(): number {
  const value = Number(getItem(STORAGE_KEYS.PLAYBACK_RATE))
  if (Number.isFinite(value) && value > 0) return value
  return 1.0
}
