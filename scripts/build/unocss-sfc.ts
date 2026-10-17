/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-06
 * @Description: 在组件发布阶段生成 scoped 工具类，宿主无需 UnoCSS 扫描组件库
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */
import { readFile } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { createGenerator, presetIcons, presetWind3 } from 'unocss'

function isInside(directory: string, filename: string): boolean {
  const path = relative(directory, filename)
  return path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path)
}

async function readLocalScript(
  base: string
): Promise<{ filename: string; code: string } | undefined> {
  const candidates = [
    ...new Set([base, `${base}.ts`, `${base}/index.ts`]),
  ].filter(filename => filename.endsWith('.ts'))
  const sources = await Promise.all(
    candidates.map(async filename => {
      try {
        return { filename, code: await readFile(filename, 'utf8') }
      } catch {
        return undefined
      }
    })
  )
  return sources.find(source => source !== undefined)
}

async function collectSources(
  code: string,
  filename: string,
  componentRoot: string,
  sources: Map<string, string>
): Promise<void> {
  if (sources.has(filename)) return
  sources.set(filename, code)
  const dependencies = [
    ...code.matchAll(/(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)['"](\.[^'"]+)['"]/g),
  ]
  await Promise.all(
    dependencies.map(async match => {
      const base = resolve(dirname(filename), match[1])
      if (!isInside(componentRoot, base)) return
      const dependency = await readLocalScript(base)
      if (dependency)
        await collectSources(
          dependency.code,
          dependency.filename,
          componentRoot,
          sources
        )
    })
  )
}

/** 收集自身目录的脚本与静态动态入口；其他组件独立生成自己的样式。 */
export async function collectComponentSource(
  code: string,
  filename: string
): Promise<string> {
  const absolute = resolve(filename)
  const owner = /^(.*[\\/]src[\\/]components[\\/]C_[^\\/]+)(?:[\\/]|$)/.exec(
    absolute
  )
  const componentRoot = owner?.[1] ?? dirname(absolute)
  const sources = new Map<string, string>()
  await collectSources(code, absolute, componentRoot, sources)
  // Parallel I/O must not make source ordering (and production scope hashes) vary.
  return [...sources]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, source]) => source)
    .join('\n')
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
      ).generate(await collectComponentSource(code, id), { preflights: false })
      if (!css.trim()) return null
      return { code: `${code}\n<style scoped>\n${css}\n</style>`, map: null }
    },
  }
}
