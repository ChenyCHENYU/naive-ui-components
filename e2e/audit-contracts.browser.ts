import { test, expect } from './fixtures'

test('command search traps sequential focus and restores its keyboard opener', async ({
  page,
}) => {
  await page.goto('/contracts.html')
  const trigger = page.locator('.robot-search-trigger')
  await trigger.focus()
  await trigger.press('Enter')
  const dialog = page.getByRole('dialog', { name: '全局搜索' })
  const input = dialog.getByRole('combobox')
  const close = dialog.getByRole('button', { name: '关闭搜索' })
  await expect(input).toBeFocused()
  await input.press('Shift+Tab')
  await expect(close).toBeFocused()
  await close.press('Tab')
  await expect(input).toBeFocused()
  await input.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()

  await trigger.press('Enter')
  await expect(input).toBeFocused()
  await close.click()
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('published display components retain fractional endpoints and sanitize changed rich content', async ({
  page,
}) => {
  await page.goto('/contracts.html')
  const area = page.getByTestId('display-contracts')
  await expect(area.getByRole('progressbar')).toHaveAttribute(
    'aria-valuenow',
    '12.5'
  )
  const content = area.locator('.c-timeline__content')
  await expect(content.locator('strong.safe-body')).toHaveText('净化后的内容')
  await expect(
    content.locator('[onclick], script, [href^="javascript:"]')
  ).toHaveCount(0)
  const tag = area.locator('.c-timeline__tag')
  await expect(tag).toHaveText('已校验')
  const initialColor = await tag.evaluate(
    element => getComputedStyle(element).color
  )

  await area.getByRole('button', { name: '更新显示数据' }).click()
  await expect(area.getByRole('progressbar')).toHaveAttribute(
    'aria-valuenow',
    '24.125'
  )
  await expect(content.locator('strong.safe-body')).toHaveText('更新后的内容')
  await expect(
    content.locator('[onclick], script, [href^="javascript:"]')
  ).toHaveCount(0)
  await expect(tag).toHaveText('需关注')
  await expect
    .poll(() => tag.evaluate(element => getComputedStyle(element).color))
    .not.toBe(initialColor)
  expect(
    await page.evaluate(() => Reflect.get(window, '__timelineUnsafe'))
  ).toBeUndefined()
})
