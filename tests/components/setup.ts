/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-08
 * @FilePath: \naive-ui-components\tests\components\setup.ts
 * @Description: 逐例卸载组件并隔离存储
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */
import { beforeEach, afterEach } from 'vitest'
import { enableAutoUnmount } from '@vue/test-utils'
import { addCollection } from '@iconify/vue'
import mdi from '@iconify-json/mdi/icons.json'
// 使用真实离线 SVG 集合，组件挂载不依赖 Iconify 外网。
addCollection(mdi)
enableAutoUnmount(afterEach)
beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})
afterEach(() => {
  document.body.innerHTML = ''
})
