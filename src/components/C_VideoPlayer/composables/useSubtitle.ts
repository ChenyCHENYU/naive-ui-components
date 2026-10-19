/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-26
 * @Description: 字幕管理（原生 VTT 解析 + Overlay 渲染）
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */

import {
  ref,
  shallowRef,
  computed,
  onBeforeUnmount,
  type Ref,
  type ShallowRef,
} from 'vue'
import type { PlayerInstance, SubtitleTrack } from '../types'

/** 解析后的字幕条目 */
export interface SubtitleCue {
  /** 起始时间（秒） */
  start: number
  /** 结束时间（秒） */
  end: number
  /** 字幕文本 */
  text: string
}

/** 将 WebVTT 时间戳转为秒；不把缺失或非法片段当作 0。 */
function parseVttTime(raw: string): number {
  const match = raw.trim().match(/^(?:(\d{2,}):)?(\d{2}):(\d{2})\.(\d{3})$/)
  if (!match) return Number.NaN
  const [, hours = '0', minutes, seconds, milliseconds] = match
  if (Number(minutes) > 59 || Number(seconds) > 59) return Number.NaN
  return (
    Number(hours) * 3600 +
    Number(minutes) * 60 +
    Number(seconds) +
    Number(milliseconds) / 1000
  )
}

/** 解析 WebVTT 文本为 cue 列表，保留源文件中的重叠字幕顺序。 */
function parseVtt(vttText: string): SubtitleCue[] {
  const cues: SubtitleCue[] = []
  const blocks = vttText
    .replace(/\r\n?/g, '\n')
    .trim()
    .split(/\n\s*\n/)

  for (const block of blocks) {
    const lines = block.trim().split('\n')
    if (/^(?:NOTE|STYLE|REGION)(?:\s|$)/.test(lines[0])) continue
    const timeLineIdx = lines.findIndex(line => line.includes('-->'))
    if (timeLineIdx === -1) continue

    const [startRaw, endRaw] = lines[timeLineIdx].split('-->')
    if (!startRaw || !endRaw) continue

    const start = parseVttTime(startRaw)
    const end = parseVttTime(endRaw.trim().split(/\s+/)[0])
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
      continue
    const text = lines
      .slice(timeLineIdx + 1)
      .join('\n')
      .replace(/<[^>]+>/g, '')
      .trim()
    if (text) cues.push({ start, end, text })
  }

  return cues
}

/** 字幕管理：复用轨道请求，且迟到的请求不能覆盖新的语言选择。 */
export function useSubtitle(
  playerRef: ShallowRef<PlayerInstance | null>,
  subtitles: SubtitleTrack[] = [],
  currentTime: Ref<number> = ref(0)
) {
  const activeLanguage = ref<string | null>(null)
  const subtitleList = ref<SubtitleTrack[]>([...subtitles])
  // Cue 数据按轨道整体替换；播放时间高频读取不需要为每条 cue 创建深层代理。
  const cueMap = shallowRef<Record<string, SubtitleCue[]>>({})
  const isLoading = ref(false)
  const pendingTracks = new Map<
    string,
    { controller: AbortController; promise: Promise<SubtitleCue[]> }
  >()
  let selectionVersion = 0
  let disposed = false

  const currentText = computed(() => {
    if (!activeLanguage.value) return ''
    const cues = cueMap.value[activeLanguage.value]
    if (!cues?.length) return ''
    const t = currentTime.value
    return cues.find(cue => t >= cue.start && t < cue.end)?.text ?? ''
  })
  const hasSubtitles = computed(() => subtitleList.value.length > 0)

  /** 同一轨道的初始化与快速切换共享网络请求。 */
  function loadTrack(language: string): Promise<SubtitleCue[]> {
    if (disposed) return Promise.resolve([])
    if (Object.prototype.hasOwnProperty.call(cueMap.value, language))
      return Promise.resolve(cueMap.value[language])
    const pending = pendingTracks.get(language)
    if (pending) return pending.promise
    const track = subtitleList.value.find(item => item.language === language)
    if (!track) return Promise.resolve([])

    const controller = new AbortController()
    isLoading.value = true
    // 延后一拍启动，保证同步抛错的 fetch 也在登记 pending 后进入 finally。
    const promise = Promise.resolve()
      .then(async () => {
        const response = await fetch(track.src, { signal: controller.signal })
        if (!response.ok)
          throw new Error(`字幕加载失败: ${track.src} (${response.status})`)
        const text = await response.text()
        if (disposed || controller.signal.aborted) return []
        const cues = parseVtt(text)
        cueMap.value = { ...cueMap.value, [language]: cues }
        return cues
      })
      .catch(error => {
        if (!disposed && !controller.signal.aborted)
          console.warn('[C_VideoPlayer] 字幕加载异常:', error)
        return []
      })
      .finally(() => {
        pendingTracks.delete(language)
        if (!disposed) isLoading.value = pendingTracks.size > 0
      })
    pendingTracks.set(language, { controller, promise })
    return promise
  }

  /** 切换字幕语言；关闭或下一次选择会使旧请求的结果失效。 */
  async function switchSubtitle(language: string) {
    if (disposed) return
    const track = subtitleList.value.find(item => item.language === language)
    if (!track) {
      console.warn(`[C_VideoPlayer] 未找到字幕轨道: ${language}`)
      return
    }
    const version = ++selectionVersion
    await loadTrack(language)
    if (!disposed && version === selectionVersion)
      activeLanguage.value = language
  }

  async function initSubtitles() {
    const track =
      subtitleList.value.find(item => item.default) ?? subtitleList.value[0]
    if (track) await switchSubtitle(track.language)
  }

  function closeSubtitle() {
    selectionVersion++
    activeLanguage.value = null
  }

  function toggleSubtitle() {
    if (activeLanguage.value) closeSubtitle()
    else void initSubtitles()
  }

  onBeforeUnmount(() => {
    disposed = true
    selectionVersion++
    pendingTracks.forEach(({ controller }) => controller.abort())
    pendingTracks.clear()
    isLoading.value = false
  })

  return {
    activeLanguage,
    subtitleList,
    currentText,
    hasSubtitles,
    isLoading,
    initSubtitles,
    switchSubtitle,
    closeSubtitle,
    toggleSubtitle,
  }
}
