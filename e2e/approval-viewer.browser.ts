import { expect, test } from './fixtures'

test('the running approval opens first and earlier submissions remain reachable', async ({
  page,
}) => {
  await page.goto('/scenes.html')
  await page.getByRole('button', { name: '查看 SO-2026-0821 审批' }).click()

  const dialog = page.getByRole('dialog', { name: '审批详情' })
  const attempts = dialog.getByRole('combobox', { name: '历次审批' })
  await expect(attempts).toHaveValue('approval-2')
  await expect(dialog.getByText('王宁')).toBeVisible()
  await expect(dialog.getByText('补充材料后重新提交')).toBeVisible()

  await attempts.selectOption('approval-1')
  await expect(dialog.getByText('请补充交货周期和合同附件。')).toBeVisible()
  await expect(dialog.getByText('王宁')).toHaveCount(0)

  await attempts.selectOption('approval-2')
  await expect(dialog.getByText('补充材料后重新提交')).toBeVisible()
  await expect(dialog.getByText('请补充交货周期和合同附件。')).toHaveCount(0)
  await dialog.getByRole('button', { name: 'close' }).click()
  await expect(dialog).toBeHidden()
})

test('a notification opens the specified instance on a narrow screen and Escape restores focus', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/scenes.html')
  const opener = page.getByRole('button', { name: '打开驳回通知对应的审批' })
  await opener.focus()
  await opener.press('Enter')

  const dialog = page.getByRole('dialog', { name: '审批详情' })
  await expect(dialog.getByText('销售主管驳回')).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'close' })).toBeVisible()
  const fitsViewport = await dialog.evaluate(element => {
    const { left, right } = element.getBoundingClientRect()
    return left >= 0 && right <= window.innerWidth
  })
  expect(fitsViewport).toBe(true)

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(opener).toBeFocused()
})
