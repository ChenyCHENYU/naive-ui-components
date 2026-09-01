import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dir, '..')
const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), 'utf8')

describe('keyboard and status accessibility contracts', () => {
  test('captcha exposes button, busy, label, and live status semantics', () => {
    const source = read('src/components/C_Captcha/index.vue')
    expect(source).toContain('<button')
    expect(source).toContain(':aria-busy="verifying"')
    expect(source).toContain(':aria-label="statusText"')
    expect(source).toContain('aria-live="polite"')
  })

  test('notification and bookmark triggers use native buttons', () => {
    expect(
      read(
        'src/components/C_NotificationCenter/components/NotificationBadge.vue'
      )
    ).toContain('<button')
    expect(
      read('src/components/C_VideoPlayer/components/BookmarkPanel.vue')
    ).toMatch(/<button[\s\S]*?class="vp-bookmark-time"/)
  })

  test('workflow icon actions remain native keyboard controls', () => {
    for (const component of [
      'ApprovalNode.vue',
      'ConditionNode.vue',
      'CopyNode.vue',
      'StartNode.vue',
    ]) {
      const source = read(`src/components/C_WorkFlow/nodes/${component}`)
      expect(source).not.toMatch(/<div class="(?:delete|add)-node-btn"/)
      expect(source).toContain('<button')
    }
  })
})
