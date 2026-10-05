/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-06
 * @Description: 在组件发布阶段生成 scoped 工具类，宿主无需 UnoCSS 扫描组件库
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { createGenerator, presetIcons, presetWind3 } from 'unocss'

/** 收集组件自身脚本引用的静态工具类；不扫描其他组件或第三方依赖。 */
async function collectSource(
  code: string,
  filename: string,
  seen = new Set<string>()
): Promise<string> {
  if (seen.has(filename)) return ''
  seen.add(filename)
  const dependencies = [
    ...code.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g),
  ]
  const parts = await Promise.all(
    dependencies.map(async match => {
      const base = resolve(dirname(filename), match[1])
      for (const candidate of [base, `${base}.ts`, `${base}/index.ts`]) {
        if (!candidate.endsWith('.ts')) continue
        try {
          return await collectSource(
            await readFile(candidate, 'utf8'),
            candidate,
            seen
          )
        } catch {
          /* 非 TypeScript 入口由所属组件处理。 */
        }
      }
      return ''
    })
  )
  return [code, ...parts].join('\n')
}

/** 将工具类放入 Vue 的 scoped 编译链，不引入全局重置或运行时依赖。 */
export function componentUtilitiesPlugin() {
  const generator = createGenerator({
    presets: [
      presetWind3(),
      presetIcons({
        collections: {
          mdi: () => import('@iconify-json/mdi').then(module => module.icons),
          carbon: () =>
            import('@iconify-json/carbon').then(module => module.icons),
          ic: () => import('@iconify-json/ic').then(module => module.icons),
          la: () => import('@iconify-json/la').then(module => module.icons),
          ri: () => import('@iconify-json/ri').then(module => module.icons),
        },
        extraProperties: {
          display: 'inline-block',
          'vertical-align': 'middle',
        },
      }),
    ],
  })
  return {
    name: 'component-scoped-utilities',
    async transform(code: string, id: string) {
      if (!id.endsWith('.vue') || id.includes('node_modules')) return null
      const { css } = await (
        await generator
      ).generate(await collectSource(code, id), { preflights: false })
      if (!css.trim()) return null
      return { code: `${code}\n<style scoped>\n${css}\n</style>`, map: null }
    },
  }
}
