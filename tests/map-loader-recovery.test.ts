/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-31
 * @Description: 高德加载失败的全局配置归还与重试隔离回归
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */
import { expect, test } from 'bun:test'
import { loadAMapApi } from '../src/components/C_Map/amapLoader'
import type { AMapApi, AMapSecurityConfig } from '../src/components/C_Map/types'

function createPlatform(host: {
  AMap?: AMapApi
  _AMapSecurityConfig?: AMapSecurityConfig
}) {
  const scripts: Array<Map<string, () => void>> = []
  const document = {
    querySelector: () => null,
    createElement: () => {
      const listeners = new Map<string, () => void>()
      scripts.push(listeners)
      return {
        dataset: {},
        addEventListener: (event: string, handler: () => void) =>
          listeners.set(event, handler),
        removeEventListener: (event: string) => listeners.delete(event),
        remove: () => undefined,
      }
    },
    head: { appendChild: () => undefined },
  } as unknown as Document
  return {
    scripts,
    platform: {
      clearTimeout: globalThis.clearTimeout,
      setTimeout: globalThis.setTimeout,
      document,
      host,
    },
  }
}

test('failed SDK loading restores the host security configuration by identity', async () => {
  const previous = { serviceHost: '/host/_AMapService' }
  const host = { _AMapSecurityConfig: previous }
  const { scripts, platform } = createPlatform(host)
  const pending = loadAMapApi(
    'failed-key',
    1000,
    { securityJsCode: 'failed-code' },
    platform
  )
  scripts[0].get('error')!()
  await expect(pending).rejects.toThrow('加载失败')
  expect(host._AMapSecurityConfig).toBe(previous)
})

test('failure does not overwrite a security configuration replaced by the host while loading', async () => {
  const host = { _AMapSecurityConfig: { securityJsCode: 'original' } }
  const { scripts, platform } = createPlatform(host)
  const pending = loadAMapApi(
    'failed-key',
    1000,
    { securityJsCode: 'pending' },
    platform
  )
  const updated = { securityJsCode: 'host-updated' }
  host._AMapSecurityConfig = updated
  scripts[0].get('error')!()
  await expect(pending).rejects.toThrow('加载失败')
  expect(host._AMapSecurityConfig).toBe(updated)
})

test('a timed-out first load removes its own config and retry does not inherit failed credentials', async () => {
  const host: { AMap?: AMapApi; _AMapSecurityConfig?: AMapSecurityConfig } = {}
  const { scripts, platform } = createPlatform(host)
  await expect(
    loadAMapApi('timed-out-key', 1, { securityJsCode: 'expired' }, platform)
  ).rejects.toThrow('加载超时')
  expect(Object.hasOwn(host, '_AMapSecurityConfig')).toBe(false)
  const retry = loadAMapApi('retry-key', 1000, undefined, platform)
  expect(host._AMapSecurityConfig).toBeUndefined()
  const api = {} as AMapApi
  host.AMap = api
  scripts[1].get('load')!()
  await expect(retry).resolves.toBe(api)
})
