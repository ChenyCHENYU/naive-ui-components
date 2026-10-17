import { describe, expect, test } from 'bun:test'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import {
  collectComponentSource,
  componentUtilitiesPlugin,
} from '../scripts/build/unocss-sfc'
import { createComponentStyleCollector } from '../scripts/build/component-style-manifest'

describe('component utility source ownership', () => {
  test('parallel diamond/cycle imports keep each local script exactly once in deterministic order', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'component-source-'))
    const owner = join(directory, 'src/components/C_One')
    const files = {
      'src/components/C_One/a.ts':
        "import './shared'; export const a = 'local-a flex';",
      'src/components/C_One/b.ts':
        "import './shared'; export const b = 'local-b grid';",
      'src/components/C_One/shared.ts':
        "import './a'; export const shared = 'local-shared i-carbon:add';",
      'src/components/C_One/lazy.ts': "export const lazy = 'local-lazy gap-7';",
      'src/components/C_Two/options.ts':
        "export const foreign = 'foreign-only i-mdi:account';",
      'src/composables/shared.ts':
        "export const external = 'external-only i-mdi:delete';",
    }
    try {
      await Promise.all(
        Object.entries(files).map(async ([path, source]) => {
          const filename = join(directory, path)
          await mkdir(dirname(filename), { recursive: true })
          await writeFile(filename, source)
        })
      )
      const source =
        "<script>import './a'; import './b'; import('../C_Two/options'); import '../../composables/shared'; const lazy = () => import('./lazy')</script>"
      const collected = await Promise.all(
        Array.from({ length: 6 }, () =>
          collectComponentSource(source, join(owner, 'index.vue'))
        )
      )
      expect(new Set(collected).size).toBe(1)
      expect(collected[0].match(/local-shared/g)).toHaveLength(1)
      expect(collected[0]).toContain('local-a')
      expect(collected[0]).toContain('local-b')
      expect(collected[0]).toContain('local-lazy')
      expect(collected[0]).not.toContain('foreign-only')
      expect(collected[0]).not.toContain('external-only')
      const output = await componentUtilitiesPlugin().transform(
        source,
        join(owner, 'index.vue')
      )
      const css =
        output?.code.slice(output.code.lastIndexOf('<style scoped>')) ?? ''
      expect(css).toContain('i-carbon')
      expect(css).toContain('.gap-7')
      expect(css).not.toContain('i-mdi')
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  test('one generator keeps concurrent SFC utilities isolated', async () => {
    const plugin = componentUtilitiesPlugin()
    const [first, second] = await Promise.all([
      plugin.transform(
        '<template><div class="gap-3"/></template>',
        '/fixture/src/components/C_One/index.vue'
      ),
      plugin.transform(
        '<template><div class="gap-9"/></template>',
        '/fixture/src/components/C_Two/index.vue'
      ),
    ])
    expect(first?.code).toContain('.gap-3')
    expect(first?.code).not.toContain('.gap-9')
    expect(second?.code).toContain('.gap-9')
    expect(second?.code).not.toContain('.gap-3')
  })
})

describe('component style source blocks', () => {
  const filename = '/fixture/src/components/C_Table/index.vue'

  test('two output formats deduplicate the same source block without dropping other blocks', () => {
    const collector = createComponentStyleCollector()
    const first = '.table[data-v-root]{display:flex}'
    const second = '.tools[data-v-root]{gap:4px}'
    collector.add(
      `${filename}?vue&type=style&index=0&scoped=root&lang.scss`,
      `/* unplugin-vue-components disabled */${first}`
    )
    collector.add(
      `${filename}?lang.scss&index=0&type=style&vue&scoped=root`,
      first
    )
    collector.add(
      `${filename}?vue&type=style&index=1&scoped=root&lang.css`,
      second
    )
    collector.add(
      '/fixture/src/components/C_Table/Child.vue?vue&type=style&index=0',
      '.child[data-v-child]{color:red}'
    )
    const css = collector.manifest().C_Table
    expect(css.match(/\.table\[/g)).toHaveLength(1)
    expect(css).not.toContain('unplugin-vue-components disabled')
    expect(css).toContain(second)
    expect(css).toContain('.child[data-v-child]')
  })

  test('different compiled styles for one source block fail instead of publishing two scope versions', () => {
    const collector = createComponentStyleCollector()
    collector.add(
      `${filename}?vue&type=style&index=0&scoped=old&lang.scss`,
      '.table[data-v-old]{display:flex}'
    )
    expect(() =>
      collector.add(
        `${filename}?vue&type=style&index=0&scoped=new&lang.scss`,
        '.table[data-v-new]{display:flex}'
      )
    ).toThrow('Inconsistent compiled CSS')
  })
})
