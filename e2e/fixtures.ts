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
      expect(
        messages,
        'Published-entry consumer must not produce browser errors/warnings'
      ).toEqual([])
    },
    { auto: true },
  ],
})

export { expect }
