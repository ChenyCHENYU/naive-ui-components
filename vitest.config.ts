/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-08
 * @FilePath: \naive-ui-components\vitest.config.ts
 * @Description: 真实组件挂载测试，不加载整包构建插件
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
export default defineConfig({
  plugins: [vue()],
  resolve: { dedupe: ['vue'] },
  test: {
    environment: 'happy-dom',
    include: ['tests/components/**/*.component.ts'],
    setupFiles: ['tests/components/setup.ts'],
    clearMocks: true,
    restoreMocks: true,
  },
})
