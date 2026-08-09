import { describe, expect, test } from 'bun:test'

const stylePath = new URL(
  '../src/components/C_NotificationCenter/index.scss',
  import.meta.url
)

describe('C_NotificationCenter theme bridge', () => {
  test('Popover 使用 Naive UI 动态主题变量而非固定文本色', async () => {
    const style = await Bun.file(stylePath).text()

    expect(style).toContain('--c-bg-card: var(--n-color')
    expect(style).toContain('--c-text-1: var(--n-text-color')
    expect(style).toContain('color: var(--n-text-color)')
    expect(style).toContain('background-color: var(--n-color)')
  })
})
