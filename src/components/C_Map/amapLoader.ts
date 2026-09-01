/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2025-12-02
 * @LastEditTime: 2026-09-02
 * @FilePath: \naive-ui-components\src\components\C_Map\amapLoader.ts
 * @Description: 可重试、可超时且跨实例复用的高德地图 SDK 加载器
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
 */

import { AMAP_CONFIG } from './data'
import type { AMapApi, AMapSecurityConfig } from './types'

const DEFAULT_LOAD_TIMEOUT = 15_000
const SCRIPT_SELECTOR = 'script[data-c-map-amap="true"]'

let loader: Promise<AMapApi> | null = null
let loaderIdentity: string | null = null

/** 规范化并校验高德安全配置，保证两种认证模式互斥。 */
export function normalizeAMapSecurityConfig(
  config?: AMapSecurityConfig
): AMapSecurityConfig | undefined {
  if (!config) return undefined

  const serviceHost = config.serviceHost?.trim()
  const securityJsCode = config.securityJsCode?.trim()
  if (serviceHost && securityJsCode) {
    throw new Error('高德地图安全配置只能选择 serviceHost 或 securityJsCode')
  }
  if (serviceHost) {
    if (!serviceHost.endsWith('/_AMapService')) {
      throw new Error('高德地图 serviceHost 必须以 /_AMapService 结尾')
    }
    return { serviceHost }
  }
  if (securityJsCode) return { securityJsCode }
  throw new Error('高德地图安全配置不能为空')
}

interface AMapHost {
  AMap?: AMapApi
  _AMapSecurityConfig?: AMapSecurityConfig
}

interface AMapLoaderPlatform {
  clearTimeout: typeof window.clearTimeout
  document: Document
  host: AMapHost
  setTimeout: typeof window.setTimeout
}

const resolvePlatform = (platform?: AMapLoaderPlatform): AMapLoaderPlatform => {
  if (platform) return platform
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('高德地图 API 只能在浏览器环境加载')
  }
  return {
    clearTimeout: window.clearTimeout.bind(window),
    document,
    host: window as AMapHost,
    setTimeout: window.setTimeout.bind(window),
  }
}

const prepareAMapLoad = (
  key: string,
  securityConfig?: AMapSecurityConfig,
  platform?: AMapLoaderPlatform
): {
  identity: string
  normalizedKey: string
  normalizedSecurityConfig?: AMapSecurityConfig
  platform: AMapLoaderPlatform
} => {
  const normalizedKey = key.trim()
  if (!normalizedKey) throw new Error('高德地图 API Key 不能为空')
  const normalizedSecurityConfig = normalizeAMapSecurityConfig(securityConfig)
  return {
    identity: JSON.stringify([normalizedKey, normalizedSecurityConfig]),
    normalizedKey,
    normalizedSecurityConfig,
    platform: resolvePlatform(platform),
  }
}

/** 为全部组件实例只加载一次高德 SDK，失败或超时后允许安全重试。 */
export function loadAMapApi(
  key: string,
  timeout = DEFAULT_LOAD_TIMEOUT,
  securityConfig?: AMapSecurityConfig,
  platform?: AMapLoaderPlatform
): Promise<AMapApi> {
  let context: ReturnType<typeof prepareAMapLoad>
  try {
    context = prepareAMapLoad(key, securityConfig, platform)
  } catch (error) {
    return Promise.reject(error)
  }
  const { identity, normalizedKey, normalizedSecurityConfig } = context
  const {
    clearTimeout,
    document: documentRef,
    host,
    setTimeout,
  } = context.platform
  if (loaderIdentity && loaderIdentity !== identity) {
    return Promise.reject(
      new Error('同一页面不能使用不同的高德地图 Key 或安全配置')
    )
  }
  if (host.AMap) return Promise.resolve(host.AMap)
  if (loader) return loader

  loaderIdentity = identity
  if (normalizedSecurityConfig) {
    host._AMapSecurityConfig = { ...normalizedSecurityConfig }
  }

  loader = new Promise((resolve, reject) => {
    const existingScript =
      documentRef.querySelector<HTMLScriptElement>(SCRIPT_SELECTOR)
    const script = existingScript || documentRef.createElement('script')
    let settled = false
    const loadTimeout =
      Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_LOAD_TIMEOUT

    const cleanup = () => {
      clearTimeout(timer)
      script.removeEventListener('load', handleLoad)
      script.removeEventListener('error', handleError)
    }
    const fail = (error: Error) => {
      if (settled) return
      settled = true
      cleanup()
      script.remove()
      loader = null
      loaderIdentity = null
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
    const timer = setTimeout(
      () => fail(new Error(`高德地图 API 加载超时（${loadTimeout}ms）`)),
      loadTimeout
    )

    script.addEventListener('load', handleLoad, { once: true })
    script.addEventListener('error', handleError, { once: true })
    if (existingScript) return

    script.async = true
    script.dataset.cMapAmap = 'true'
    script.src = `${AMAP_CONFIG.apiUrl}${encodeURIComponent(normalizedKey)}`
    documentRef.head.appendChild(script)
  })

  return loader
}
