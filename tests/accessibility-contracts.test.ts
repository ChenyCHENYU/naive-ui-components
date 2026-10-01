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
    expect(source).toContain('<C_Icon')
    expect(source).toContain('type="svg"')
    expect(source).not.toContain('🧩')
    expect(source).not.toContain('⚠️')
    expect(source).toContain("triggerText ?? t('captcha.trigger')")
    expect(source).toContain("emit('visible-change', active)")
  })

  test('altcha remains opt-in, lazy, and server-verified', () => {
    const source = read('src/components/C_Captcha/index.vue')
    const types = read('src/components/C_Captcha/types.ts')

    expect(source).toContain("provider: 'puzzle-captcha'")
    expect(source).toContain("import('altcha')")
    expect(source).toContain("import('altcha/i18n/zh-cn')")
    expect(source).toContain("type: 'altcha'")
    expect(source).toContain('await verifyProof(')
    expect(source).toContain(
      'ALTCHA provider requires a server-owned challengeUrl'
    )
    expect(types).toContain(
      "export type CaptchaProvider = 'puzzle-captcha' | 'altcha'"
    )
  })

  test('login places the explicit captcha action before submit', () => {
    const source = read('src/components/C_Login/index.vue')
    expect(source.indexOf('class="c-login__captcha-wrap"')).toBeLessThan(
      source.indexOf('class="c-login__submit-btn"')
    )
    expect(source).not.toContain('trigger-text=""')
    expect(source).toContain("emit('captcha-visible-change', $event)")
  })

  test('guide preserves the driver default when overlay opacity is omitted', () => {
    const source = read('src/components/C_Guide/index.vue')
    expect(source).toContain('props.theme?.overlayOpacity === undefined')
    expect(source).toContain('...overlayOptions')
    expect(source).not.toContain('overlayOpacity: props.theme?.overlayOpacity')
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

  test('chat preview, file, and retry actions use native keyboard controls', () => {
    const source = read('src/components/C_Chat/index.vue')
    expect(source).toMatch(/<button\s+v-else-if="msg\.type === 'image'"/)
    expect(source).toMatch(/<button\s+v-else-if="msg\.type === 'file'"/)
    expect(source).toMatch(
      /<button\s+v-if="msg\.sender === 'self' && msg\.status === 'failed'"/
    )
    expect(source).toContain(':alt="msg.fileName || \'聊天图片\'"')
  })

  test('action labels are not prefixed by decorative icon names', () => {
    const source = read('src/components/C_ActionBar/index.vue')
    expect(source.match(/'aria-hidden': true/g)).toHaveLength(2)
  })

  test('editor focus does not mutate an application-owned container', () => {
    const source = read('src/components/C_Editor/index.vue')
    expect(source).not.toContain("closest('.form-demo')")
    expect(source).not.toContain('container.style.maxWidth')
    expect(source).toContain("'editor-focused': isFocused")
  })

  test('file preview auto mode opens and refreshes when its source changes', () => {
    const source = read('src/components/C_FilePreview/index.vue')
    expect(source).toContain('watch(')
    expect(source).toContain('[file, url, autoPreview]')
    expect(source).toContain('void openPreview()')
    expect(source).toContain('void loadFile()')
  })
})
