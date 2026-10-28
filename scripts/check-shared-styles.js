import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parse } from 'postcss'
import { build } from 'vite'
import { getRelativeCssAssets } from './leaflet-assets.js'

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
)

/** 通过真实包子路径、消费侧 CSS 构建和本地图片解析验证共享依赖，而非检查入口文本。 */
export async function checkSharedStyleConsumer(directory = packageRoot) {
  const consumer = fs.mkdtempSync(
    path.join(os.tmpdir(), 'robot-shared-style-consumer-')
  )
  try {
    const scope = path.join(consumer, 'node_modules', '@robot-admin')
    fs.mkdirSync(scope, { recursive: true })
    fs.symlinkSync(directory, path.join(scope, 'naive-ui-components'), 'dir')
    const entry = 'virtual:published-component-styles'
    const components = [
      'C_Form',
      'C_Table',
      'C_FormModal',
      'C_DataPicker',
      'C_BatchResult',
      'C_Map',
    ]
    const source = components
      .map(
        name => `import '@robot-admin/naive-ui-components/${name}/style.css';`
      )
      .join('\n')
    const result = await build({
      root: consumer,
      base: './',
      configFile: false,
      logLevel: 'silent',
      plugins: [
        {
          name: 'published-style-consumer',
          resolveId: id => (id === entry ? `\0${entry}` : undefined),
          load: id => (id === `\0${entry}` ? source : undefined),
        },
      ],
      build: {
        write: false,
        assetsInlineLimit: 0,
        emptyOutDir: false,
        reportCompressedSize: false,
        rolldownOptions: { input: entry },
      },
    })
    const outputs = (Array.isArray(result) ? result : [result]).flatMap(
      output => output.output
    )
    const assets = outputs.filter(output => output.type === 'asset')
    const cssAssets = assets.filter(asset => asset.fileName.endsWith('.css'))
    assert(cssAssets.length > 0, 'Consumer must emit component CSS')
    const css = cssAssets.map(asset => String(asset.source)).join('\n')
    for (const selector of [
      '.c-data-picker[',
      '.c-batch-result[',
      '.c-table-wrapper[',
      '.c-form-modal[',
      '.c-form-actions[',
      '.w-e-text-container',
      '.leaflet-container',
    ]) {
      assert(
        css.includes(selector),
        `Consumer missing dependency styles: ${selector}`
      )
    }
    parse(css).walkAtRules('import', rule => {
      throw new Error(`Consumer left unresolved CSS import: ${rule.params}`)
    })
    const filenames = new Set(assets.map(asset => asset.fileName))
    let relativeAssets = 0
    for (const asset of cssAssets) {
      for (const relative of getRelativeCssAssets(String(asset.source))) {
        const target = path.posix.normalize(
          path.posix.join(
            path.posix.dirname(asset.fileName),
            relative.split(/[?#]/)[0]
          )
        )
        assert(
          filenames.has(target),
          `Consumer CSS references missing local asset: ${relative}`
        )
        relativeAssets++
      }
    }
    assert(
      relativeAssets > 0,
      'Consumer must resolve actual local Leaflet images'
    )
    return {
      components: components.length,
      cssAssets: cssAssets.length,
      relativeAssets,
    }
  } finally {
    fs.rmSync(consumer, { recursive: true, force: true })
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  console.log(
    'Shared stylesheet consumer passed:',
    await checkSharedStyleConsumer()
  )
}
