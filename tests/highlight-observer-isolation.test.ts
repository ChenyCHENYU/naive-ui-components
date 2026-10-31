import { describe, expect, test } from 'bun:test'
import { createSSRApp } from 'vue'
import { createHighlight, setupHighlight } from '../src/plugins/highlight'

describe('highlight diagnostics remain observers', () => {
  test('an unsupported-language warning cannot reject the public boolean result', async () => {
    const highlight = createHighlight({
      logger: {
        info: () => undefined,
        error: () => undefined,
        warn: () => {
          throw new Error('logger unavailable')
        },
      },
    })
    expect(await highlight.loadLanguage('unknown-language')).toBe(false)
  })

  test('debug logging cannot turn a registered language into a failed load', async () => {
    const highlight = createHighlight({
      debug: true,
      logger: {
        info: () => {
          throw new Error('logger unavailable')
        },
        warn: () => undefined,
        error: () => undefined,
      },
    })
    expect(await highlight.loadLanguage('sql')).toBe(true)
    expect(highlight.getLoadedLanguages()).toContain('sql')
    const app = createSSRApp({ render: () => null })
    expect(() =>
      setupHighlight(app, {
        debug: true,
        logger: {
          info: () => {
            throw new Error('logger unavailable')
          },
          warn: () => undefined,
          error: () => undefined,
        },
      })
    ).not.toThrow()
    expect(app.config.globalProperties.$highlight).toBeDefined()
  })

  test('failed-load observers cannot reject or prevent a later retry', async () => {
    const highlight = createHighlight({
      onError: () => {
        throw new Error('error observer unavailable')
      },
      logger: {
        info: () => undefined,
        warn: () => undefined,
        error: async () => {
          throw new Error('async logger unavailable')
        },
      },
    })
    const instance = highlight.getHljs()
    const register = instance.registerLanguage
    instance.registerLanguage = () => {
      throw new Error('registration failed')
    }
    expect(await highlight.loadLanguage('rust')).toBe(false)
    instance.registerLanguage = register
    expect(await highlight.loadLanguage('rust')).toBe(true)
  })
})
