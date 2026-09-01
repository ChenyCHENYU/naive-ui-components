import { describe, expect, test } from 'bun:test'
import { useHighlight } from '../src/plugins/highlight'

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
})
