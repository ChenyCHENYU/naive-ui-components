import type { Page, TestInfo } from '@playwright/test'
import { test, expect } from './fixtures'

interface Metric {
  sequence: number
  action: string
  durationMs: number
  domNodes: number
}

test.afterEach(async ({ page }, testInfo) => {
  const last = await page
    .getByTestId('metrics')
    .textContent()
    .catch(() => null)
  if (last)
    await testInfo.attach('last-fixture-measurement.json', {
      body: last,
      contentType: 'application/json',
    })
})

async function readMetric(page: Page, action: string): Promise<Metric> {
  const output = page.getByTestId('metrics')
  await expect(output).toContainText(`"action":"${action}"`)
  return JSON.parse(await output.innerText()) as Metric
}

async function record(testInfo: TestInfo, metrics: object) {
  await testInfo.attach('performance-metrics.json', {
    body: JSON.stringify(
      {
        browser: testInfo.project.name,
        viewport: { width: 1440, height: 1000 },
        ...metrics,
      },
      null,
      2
    ),
    contentType: 'application/json',
  })
}

for (const count of [100, 500]) {
  test(`${count} expanded organization cards have bounded DOM and mount/locate cost`, async ({
    page,
  }, testInfo) => {
    await page.goto('/performance.html')
    await page
      .getByRole('button', { name: `挂载 ${count} 节点`, exact: true })
      .click()
    const mount = await readMetric(page, `org-${count}`)
    await expect(page.locator('.c-orgchart__node')).toHaveCount(count)
    expect(mount.durationMs).toBeLessThan(count === 100 ? 2000 : 4000)
    expect(mount.domNodes).toBeLessThan(count * 18 + 100)
    await page.getByRole('button', { name: '定位末节点' }).click()
    const locate = await readMetric(page, 'locate')
    await expect(page.locator('.c-orgchart__node--selected')).toContainText(
      `部门 ${count - 1}`
    )
    expect(locate.durationMs).toBeLessThan(800)
    await page.getByRole('button', { name: '卸载场景' }).click()
    const unmount = await readMetric(page, 'unmount')
    await expect(page.locator('.c-orgchart')).toHaveCount(0)
    expect(unmount.domNodes).toBe(0)
    await record(testInfo, {
      scenario: 'orgchart',
      count,
      mount,
      locate,
      unmount,
    })
  })
}

test('300+300 rows and 240 live editors retain bounded rendering and responsive edits', async ({
  page,
}, testInfo) => {
  await page.goto('/performance.html')
  await page.getByRole('button', { name: '挂载组合工作台' }).click()
  const mount = await readMetric(page, 'workbench')
  expect(mount.durationMs).toBeLessThan(3000)
  expect(mount.domNodes).toBeLessThan(12000)
  const master = page.getByTestId('benchmark-master')
  const detail = page.getByTestId('benchmark-detail')
  // The two read-only tables use native virtualization; all 240 editable inputs are deliberately mounted.
  expect(await master.locator('tbody tr').count()).toBeLessThan(80)
  expect(await detail.locator('tbody tr').count()).toBeLessThan(80)
  await expect(
    page.getByTestId('benchmark-quality').getByRole('textbox')
  ).toHaveCount(240)
  await master.getByRole('row').filter({ hasText: 'SO-1' }).first().click()
  const selection = await readMetric(page, 'master-selection')
  await expect(detail).toContainText('H-1-0')
  expect(selection.durationMs).toBeLessThan(800)
  const start = await page.evaluate(() => performance.now())
  await page
    .getByTestId('benchmark-quality')
    .getByRole('textbox')
    .first()
    .fill('0.00001')
  await expect(page.getByTestId('first-measurement')).toHaveText('0.00001')
  const inputMs = await page.evaluate(
    started => performance.now() - started,
    start
  )
  expect(inputMs).toBeLessThan(800)
  await page.getByRole('button', { name: '卸载场景' }).click()
  const unmount = await readMetric(page, 'unmount')
  expect(unmount.domNodes).toBe(0)
  await expect(
    page.getByTestId('performance-host').locator('.n-data-table')
  ).toHaveCount(0)
  await record(testInfo, {
    scenario: 'workbench',
    rows: [300, 300],
    editors: 240,
    mount,
    selection,
    inputMs,
    unmount,
  })
})
