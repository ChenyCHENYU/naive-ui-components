import { test as base, expect } from '@playwright/test'

export const test = base.extend<{ browserErrors: void }>({
  browserErrors: [
    async ({ page }, use, testInfo) => {
      const messages: string[] = []
      page.on('pageerror', error => messages.push(error.message))
      page.on('console', message => {
        if (message.type() === 'error' || message.type() === 'warning') {
          messages.push(`${message.type()}: ${message.text()}`)
        }
      })
      const build = await page.request.get('/consumer-build.json')
      expect(build.ok()).toBe(true)
      expect(await build.json()).toMatchObject({
        runtime: 'dist',
        sourceModules: 0,
      })
      await use()
      await testInfo.attach('browser-console.json', {
        body: JSON.stringify(messages, null, 2),
        contentType: 'application/json',
      })
      const expectsNativeScrollDiagnostic =
        testInfo.project.name === 'firefox' &&
        testInfo.annotations.some(
          ({ type }) => type === 'firefox-virtual-scroll'
        )
      // 真正跨越虚拟窗口会触发 Firefox 的滚动性能提示。原始日志保留，只有显式标记的测试允许这一条。
      const unexpected = expectsNativeScrollDiagnostic
        ? messages.filter(
            message =>
              !message.startsWith(
                'warning: [JavaScript Warning: "This site appears to use a scroll-linked positioning effect.'
              ) ||
              !message.includes(
                'https://firefox-source-docs.mozilla.org/performance/scroll-linked_effects.html'
              )
          )
        : messages
      expect(
        unexpected,
        'Published-entry consumer must not produce browser errors/warnings'
      ).toEqual([])
    },
    { auto: true },
  ],
})

export { expect }
