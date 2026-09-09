/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-09-09
 * @FilePath: \naive-ui-components\src\components\C_Map\leafletLoader.ts
 * @Description: Leaflet ESM 与 CommonJS 运行时互操作加载器
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */

type LeafletApi = typeof import('leaflet')

const isLeafletApi = (value: unknown): value is LeafletApi => {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<LeafletApi>
  return (
    typeof candidate.map === 'function' &&
    typeof candidate.marker === 'function' &&
    typeof candidate.tileLayer === 'function'
  )
}

/**
 * Leaflet 1.x 发布为 CommonJS/UMD。不同构建器会将动态导入归一化为命名空间
 * 或 `{ default: Leaflet }`，组件需要同时接受两种标准形态。
 */
export const resolveLeafletApi = (module: unknown): LeafletApi => {
  if (isLeafletApi(module)) return module

  const defaultExport =
    module && typeof module === 'object'
      ? (module as { default?: unknown }).default
      : undefined
  if (isLeafletApi(defaultExport)) return defaultExport

  throw new Error('Leaflet 模块加载失败：未找到 map、marker 和 tileLayer API')
}

export const loadLeafletApi = async (): Promise<LeafletApi> =>
  resolveLeafletApi(await import('leaflet'))
