/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-19
 * @Description: 清晰度列表响应式同步，与当前播放器实例隔离
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */
import {
  ref,
  watch,
  toValue,
  type ShallowRef,
  type MaybeRefOrGetter,
} from 'vue'
import { XGPLAYER_EVENTS as Events } from '../constants'
import type { PlayerInstance, QualityDefinition, QualityLevel } from '../types'

/** 使用最新来源列表驱动原生清晰度菜单与编程式切换。 */
export function useQualitySwitch(
  playerRef: ShallowRef<PlayerInstance | null>,
  qualityList?: MaybeRefOrGetter<QualityDefinition[] | undefined>
) {
  const currentQuality = ref<QualityLevel | null>(null)
  const isSwitching = ref(false)
  const definitions = () => toValue(qualityList) ?? []
  const nativeDefinition = (target: QualityDefinition) => ({
    url: target.url,
    definition: target.label,
    text: { zh: target.label, en: target.label },
    bitrate: target.bitrate,
  })

  /** 原生 setter 同步自身菜单，调用方无需接触 xgplayer 插件。 */
  function syncDefinitions() {
    const supplied = toValue(qualityList)
    if (supplied === undefined) return
    const list = supplied
    const player = playerRef.value
    if (player) player.definitionList = list.map(nativeDefinition)
    if (!list.some(item => item.label === currentQuality.value)) {
      currentQuality.value = null
      isSwitching.value = false
    }
  }
  watch([playerRef, () => toValue(qualityList)], syncDefinitions, {
    deep: true,
  })

  /** 事件属于绑定时的播放器，旧实例迟到通知不改变新资源。 */
  function bindEvents(player: PlayerInstance) {
    player.on(
      Events.AFTER_DEFINITION_CHANGE,
      (data: { to: string | { definition: string } }) => {
        if (playerRef.value !== player) return
        const label = typeof data.to === 'string' ? data.to : data.to.definition
        if (
          toValue(qualityList) !== undefined &&
          !definitions().some(item => item.label === label)
        )
          return
        currentQuality.value = label as QualityLevel
        isSwitching.value = false
      }
    )
    player.on(Events.BEFORE_DEFINITION_CHANGE, () => {
      if (playerRef.value === player) isSwitching.value = true
    })
  }

  /** 编程式切换只查询当前列表，不捕获首次渲染的数组。 */
  function switchQuality(quality: QualityLevel) {
    const player = playerRef.value
    const target = definitions().find(item => item.label === quality)
    if (!player || !target) return
    isSwitching.value = true
    player.changeDefinition(nativeDefinition(target))
  }
  return { currentQuality, isSwitching, switchQuality, bindEvents }
}
