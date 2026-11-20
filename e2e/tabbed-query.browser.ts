import { expect, test } from './fixtures'

test('tabbed queries preserve independent pages and reset them after submitting shared filters', async ({
  page,
}) => {
  await page.goto('/scenes.html')
  const scenario = page.getByRole('region', { name: '发运分页查询' })
  const summary = scenario.getByTestId('tabbed-query-summary')
  const pending = scenario.getByText('待发运', { exact: true })
  const shipped = scenario.getByText('已发运', { exact: true })
  const secondPage = scenario
    .locator('.n-pagination')
    .getByText('2', { exact: true })

  await expect(scenario.getByRole('cell', { name: 'WAIT-01' })).toBeVisible()
  await expect(summary).toHaveText('全部仓库 · 请求 1 次')
  await secondPage.click()
  await expect(scenario.getByRole('cell', { name: 'WAIT-03' })).toBeVisible()

  await shipped.click()
  await expect(scenario.getByRole('cell', { name: 'DONE-01' })).toBeVisible()
  await secondPage.click()
  await expect(scenario.getByRole('cell', { name: 'DONE-03' })).toBeVisible()
  await pending.click()
  await expect(scenario.getByRole('cell', { name: 'WAIT-03' })).toBeVisible()
  await expect(summary).toHaveText('全部仓库 · 请求 5 次')

  await scenario.getByPlaceholder('输入仓库名称').fill('华北')
  await expect(scenario.getByRole('cell', { name: 'WAIT-04' })).toBeVisible()
  await expect(summary).toHaveText('全部仓库 · 请求 5 次')
  await scenario.getByRole('button', { name: '搜索', exact: true }).click()
  await expect(scenario.getByRole('cell', { name: 'WAIT-01' })).toBeVisible()
  await expect(scenario.getByRole('cell', { name: 'WAIT-02' })).toHaveCount(0)
  await expect(summary).toHaveText('华北 · 请求 6 次')

  await shipped.click()
  await expect(scenario.getByRole('cell', { name: 'DONE-01' })).toBeVisible()
  await expect(scenario.getByRole('cell', { name: 'DONE-02' })).toHaveCount(0)
  await expect(summary).toHaveText('华北 · 请求 7 次')
})

test('matching export schedules a host task with the applied filters, even while the search draft changes', async ({
  page,
}) => {
  await page.goto('/scenes.html')
  const scenario = page.getByRole('region', { name: '发运分页查询' })
  const draft = scenario.getByPlaceholder('输入仓库名称')
  await draft.fill('华北')
  await scenario.getByRole('button', { name: '搜索', exact: true }).click()
  await expect(scenario.getByTestId('tabbed-query-summary')).toHaveText(
    '华北 · 请求 2 次'
  )
  await draft.fill('华南')
  await scenario.getByRole('button', { name: '导出', exact: true }).click()
  await expect(page.getByText('导出本页', { exact: true })).toBeVisible()
  await page.getByText('导出全部匹配结果', { exact: true }).click()
  const tasks = scenario.getByRole('region', { name: '发运导出任务' })
  await expect(tasks.getByText('待发运 · 华北')).toBeVisible()
  await expect(tasks.getByText('排队中')).toBeVisible()
  await expect(scenario.getByTestId('tabbed-query-summary')).toHaveText(
    '华北 · 请求 2 次'
  )
})
