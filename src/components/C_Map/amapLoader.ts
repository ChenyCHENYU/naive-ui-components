/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2025-12-02
 * @LastEditTime: 2026-09-02
 * @FilePath: \naive-ui-components\src\components\C_Map\amapLoader.ts
 * @Description: 可重试、可超时且跨实例复用的高德地图 SDK 加载器
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
 */

import { AMAP_CONFIG } from './data'
import type { AMapApi } from './types'

const DEFAULT_LOAD_TIMEOUT = 15_000
const SCRIPT_SELECTOR = 'script[data-c-map-amap="true"]'

let loader: Promise<AMapApi> | null = null

/** 为全部组件实例只加载一次高德 SDK，失败或超时后允许安全重试。 */
export function loadAMapApi(
  key: string,
  timeout = DEFAULT_LOAD_TIMEOUT
): Promise<AMapApi> {
  const normalizedKey = key.trim()
  if (!normalizedKey)
    return Promise.reject(new Error('高德地图 API Key 不能为空'))
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('高德地图 API 只能在浏览器环境加载'))
  }

  const host = window as typeof window & { AMap?: AMapApi }
  if (host.AMap) return Promise.resolve(host.AMap)
  if (loader) return loader

  loader = new Promise((resolve, reject) => {
    const existingScript =
      document.querySelector<HTMLScriptElement>(SCRIPT_SELECTOR)
    const script = existingScript || document.createElement('script')
    let settled = false
    const loadTimeout =
      Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_LOAD_TIMEOUT

    const cleanup = () => {
      window.clearTimeout(timer)
      script.removeEventListener('load', handleLoad)
      script.removeEventListener('error', handleError)
    }
    const fail = (error: Error) => {
      if (settled) return
      settled = true
      cleanup()
      script.remove()
      loader = null
      reject(error)
    }
    const handleLoad = () => {
      if (settled) return
      if (!host.AMap) {
        fail(new Error('高德地图 API 加载完成但未找到全局对象'))
        return
      }
      settled = true
      cleanup()
      resolve(host.AMap)
    }
    const handleError = () => fail(new Error('高德地图 API 加载失败'))
    const timer = window.setTimeout(
      () => fail(new Error(`高德地图 API 加载超时（${loadTimeout}ms）`)),
      loadTimeout
    )

    script.addEventListener('load', handleLoad, { once: true })
    script.addEventListener('error', handleError, { once: true })
    if (existingScript) return

    script.async = true
    script.dataset.cMapAmap = 'true'
    script.src = `${AMAP_CONFIG.apiUrl}${encodeURIComponent(normalizedKey)}`
    document.head.appendChild(script)
  })

  return loader
}
