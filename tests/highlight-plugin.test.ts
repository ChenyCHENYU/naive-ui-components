import { describe, expect, test } from 'bun:test'
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import {
  createHighlight,
  setupHighlight,
  useHighlight,
  type HighlightAPI,
} from '../src/plugins/highlight'

describe('highlight plugin language loading', () => {
  test('does not report unsupported languages as successfully loaded', async () => {
    const warnings: string[] = []
    const highlight = useHighlight({
      logger: {
        info: () => undefined,
        warn: message => warnings.push(String(message)),
        error: () => undefined,
      },
    })

    expect(await highlight.loadLanguages(['not-a-language'])).toEqual([])
    expect(warnings).toHaveLength(1)
    expect(highlight.getLoadedLanguages()).not.toContain('not-a-language')
  })

  test('normalizes and deduplicates concurrent optional language loads', async () => {
    const highlight = useHighlight()
    const [upper, lower] = await Promise.all([
      highlight.loadLanguage('SQL'),
      highlight.loadLanguage('sql'),
    ])

    expect([upper, lower]).toEqual([true, true])
    expect(
      highlight.getLoadedLanguages().filter(language => language === 'sql')
    ).toHaveLength(1)
  })

  test('standalone highlighters initialize core languages and isolate configuration', async () => {
    const first = createHighlight({ autoDetect: true })
    const second = useHighlight({ autoDetect: false })
    const code = 'const answer = 42; console.log(answer)'

    expect(first.getHljs()).not.toBe(second.getHljs())
    expect(useHighlight().getHljs()).not.toBe(useHighlight().getHljs())
    expect(first.getHljs().highlightAuto(code).relevance).toBeGreaterThan(0)
    expect(second.getHljs().highlightAuto(code).relevance).toBe(0)
    expect(
      second.getHljs().highlight(code, { language: 'javascript' }).value
    ).toContain('hljs-keyword')
    expect(await first.loadLanguage('sql')).toBe(true)
    expect(first.getHljs().getLanguage('sql')).toBeDefined()
    expect(first.getLoadedLanguages()).toContain('sql')
    expect(second.getHljs().getLanguage('sql')).toBeUndefined()
    expect(second.getLoadedLanguages()).not.toContain('sql')
  })

  test('each SSR app provides its own highlighter without changing another app', async () => {
    const injected: HighlightAPI[] = []
    const root = {
      setup() {
        injected.push(useHighlight())
        return () => h('div')
      },
    }
    const firstApp = createSSRApp(root)
    const first = setupHighlight(firstApp, { autoDetect: true })
    const secondApp = createSSRApp(root)
    const second = setupHighlight(secondApp, { autoDetect: false })
    await first.loadLanguage('sql')
    await renderToString(firstApp)
    await renderToString(secondApp)

    expect(injected).toEqual([first, second])
    expect(firstApp.config.globalProperties.$highlight).toBe(first)
    expect(secondApp.config.globalProperties.$highlight).toBe(second)
    expect(
      first.getHljs().highlightAuto('const value = true').relevance
    ).toBeGreaterThan(0)
    expect(second.getHljs().highlightAuto('const value = true').relevance).toBe(
      0
    )
    expect(second.getLoadedLanguages()).not.toContain('sql')
  })
})
