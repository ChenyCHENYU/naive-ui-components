import { expect, test } from './fixtures'

test('background tasks distinguish zero from unknown, expand item results, and keep actions host-controlled', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/scenes.html')
  const panel = page.getByRole('region', { name: '销售后台任务' })
  const known = panel.getByRole('progressbar', { name: '销售明细导出的进度' })
  const unknown = panel.getByRole('progressbar', {
    name: '待发运订单导出的进度',
  })
  await expect(known).toHaveAttribute('aria-valuenow', '0')
  await expect(unknown).not.toHaveAttribute('aria-valuenow', /.+/)
  await expect(unknown).toHaveAttribute('aria-valuetext', '进度未知')
  expect((await panel.boundingBox())?.width).toBeLessThan(390)

  await expect(panel.getByText('合同记录已被其他人更新')).toHaveCount(0)
  const details = panel.getByRole('button', { name: '合同批量导入的分项结果' })
  await details.press('Enter')
  await expect(details).toHaveAttribute('aria-expanded', 'true')
  await expect(panel.getByText('合同记录已被其他人更新')).toBeVisible()
  expect(
    await panel.evaluate(root => root.scrollWidth - root.clientWidth)
  ).toBeLessThanOrEqual(1)
  await details.press('Enter')
  await expect(panel.getByText('合同记录已被其他人更新')).toHaveCount(0)

  const lastAction = page.getByTestId('background-task-action')
  await panel.getByRole('button', { name: '下载 月度对账文件' }).click()
  await expect(lastAction).toHaveText('下载 月度对账文件')
  await panel.getByRole('button', { name: '重试 合同批量导入' }).press('Enter')
  await expect(lastAction).toHaveText('重试 合同批量导入')
  await expect(panel.getByText('排队中')).toBeVisible()
  await expect(
    panel.getByRole('listitem').filter({ hasText: '合同批量导入' })
  ).toBeFocused()
})
