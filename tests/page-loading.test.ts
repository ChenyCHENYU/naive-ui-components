/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-07
 * @Description: 页面加载的快速完成、并发导航与释放资源回归
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
 */
import { describe, expect, test } from 'bun:test'
import { createPageLoading } from '../src/components/C_PageLoading/createPageLoading'

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

describe('页面加载控制器', () => {
  test('快速完成不显示，也不会由未清理的定时器重新显示', async () => {
    const loading = createPageLoading({ delay: 10 })
    const id = loading.start()
    expect(loading.visible.value).toBe(false)
    loading.finish(id)
    await wait(25)
    expect(loading.visible.value).toBe(false)
  })

  test('慢导航显示，结束立即释放状态', async () => {
    const loading = createPageLoading({ delay: 5 })
    const id = loading.start()
    await wait(20)
    expect(loading.visible.value).toBe(true)
    loading.finish(id)
    expect(loading.visible.value).toBe(false)
  })

  test('取消的旧导航完成不能关闭新导航，连续跳转不闪烁', async () => {
    const loading = createPageLoading({ delay: 5 })
    const old = loading.start()
    await wait(20)
    const current = loading.start()
    expect(loading.visible.value).toBe(true)
    loading.finish(old)
    expect(loading.visible.value).toBe(true)
    loading.finish(current)
    expect(loading.visible.value).toBe(false)
  })

  test('未显示的旧任务、销毁与迟到完成均不会留下遮罩', async () => {
    const loading = createPageLoading({ delay: 5 })
    const old = loading.start()
    const current = loading.start()
    loading.finish(old)
    await wait(20)
    expect(loading.visible.value).toBe(true)
    loading.reset()
    loading.finish(current)
    const pending = loading.start()
    loading.reset()
    await wait(20)
    loading.finish(pending)
    expect(loading.visible.value).toBe(false)
  })
})
