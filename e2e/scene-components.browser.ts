import { expect, test } from './fixtures'
import { fileURLToPath } from 'node:url'

test('paste keeps leading zeros, shows unmatched entries, and stages a single draft before confirmation', async ({
  page,
}) => {
  await page.goto('/scenes.html')
  const picker = page.getByTestId('paste-material-codes')
  const value = picker.getByTestId('material-ids')
  await picker.getByRole('button', { name: '打开物料选择' }).click()
  await picker.getByRole('button', { name: '批量粘贴' }).click()
  await picker
    .getByRole('textbox', { name: '待匹配编码' })
    .fill('0002\n0002\n9999')
  await picker.getByRole('button', { name: '匹配编码' }).click()
  await expect(picker.getByText('未匹配', { exact: true })).toBeVisible()
  await picker.getByRole('button', { name: '加入 1 项' }).click()
  await expect(value).toHaveText('[]')
  await picker.getByRole('button', { name: '确定', exact: true }).click()
  await expect(value).toHaveText('[2]')
})

test('reviewed contract changes update the displayed order details on a narrow screen', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/scenes.html')
  const contract = page.getByTestId('contract-review')
  const detail = contract.getByRole('region', { name: '订单摘要' })
  await expect(detail).toContainText('0 t')
  const changedOnly = contract.getByRole('checkbox', { name: '仅看变更' })
  await expect(changedOnly).toBeChecked()
  await changedOnly.press('Space')
  await expect(contract.getByRole('rowheader', { name: '客户' })).toBeVisible()
  await changedOnly.press('Space')
  await expect(contract.getByRole('rowheader', { name: '客户' })).toHaveCount(0)
  await contract.getByRole('checkbox', { name: '采纳 计划量' }).click()
  await contract.getByRole('button', { name: '采纳所选字段' }).click()
  await expect(detail).toContainText('12 t')
  expect((await detail.boundingBox())?.width).toBeLessThan(390)
})

test('nested quality conditions update a structured model and can be edited in place', async ({
  page,
}) => {
  await page.goto('/scenes.html')
  const filter = page.getByTestId('quality-conditions')
  await filter.getByRole('button', { name: '添加条件组' }).first().click()
  await filter
    .getByRole('group', { name: '条件组', exact: true })
    .getByRole('button', { name: '添加条件', exact: true })
    .click()
  await filter.getByRole('textbox', { name: '条件值' }).fill('HEAT-7')
  await expect(filter.getByTestId('filter-model')).toContainText(
    '"field":"heat"'
  )
  await expect(filter.getByTestId('filter-model')).toContainText(
    '"value":"HEAT-7"'
  )
  await filter.getByRole('button', { name: '移除条件组' }).click()
  await expect(filter.getByTestId('filter-model')).not.toContainText('HEAT-7')
})

test('the import wizard waits for explicit confirmation and opens the lazy batch result', async ({
  page,
}) => {
  await page.goto('/scenes.html')
  const importer = page.getByTestId('material-import')
  await importer.getByLabel('选择文件').setInputFiles({
    name: 'material.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('code\n0001\n0002\n'),
  })
  await importer.getByRole('button', { name: '运行预检' }).click()
  await expect(importer.getByText('待导入 2 行')).toBeVisible()
  await expect(importer.getByTestId('import-commits')).toHaveText('0')
  await importer.getByRole('button', { name: '确认导入' }).click()
  await expect(importer.getByText('批量操作结果')).toBeVisible()
  await expect(importer.getByTestId('import-commits')).toHaveText('1')
})

test('task board drag sends one controlled move request and keeps blocked cards in place', async ({
  page,
}) => {
  await page.goto('/scenes.html')
  const board = page.getByTestId('shipping-board')
  const queued = board.getByRole('region', { name: '待安排' })
  const ready = board.getByRole('region', { name: '已安排' })
  await queued
    .locator('.c-task-board__handle')
    .dragTo(ready.locator('.c-task-board__cards'))
  await expect(board.getByTestId('board-move-source')).toHaveText('drag')
  await expect(ready.getByText('核对发运单')).toBeVisible()
  await expect(queued.getByText('打印标签')).toBeVisible()
  await expect(queued.getByText('核对发运单')).toHaveCount(0)
})

test('resource booking conflicts are keyboard reachable and the range is controlled by the application', async ({
  page,
}) => {
  await page.goto('/scenes.html')
  const planner = page.getByTestId('loading-docks')
  const booking = planner.getByRole('button', {
    name: /发运任务乙.*预约时间冲突/,
  })
  await booking.press('Enter')
  await expect(booking).toHaveAttribute('aria-pressed', 'true')
  await expect(planner.getByTestId('active-booking')).toHaveText('slot-2')
  await planner.getByRole('button', { name: '下个时段' }).click()
  await expect(booking).toHaveCount(0)
})

test('choosing a Word attachment loads the document parser and renders its contents', async ({
  page,
}) => {
  await page.goto('/scenes.html')
  const evidence = page.getByTestId('loading-evidence')
  await evidence
    .getByLabel('装车资料')
    .setInputFiles(
      fileURLToPath(new URL('./files/loading-note.docx', import.meta.url))
    )
  await expect(evidence.getByText('装车窗口已确认')).toHaveCount(0)
  await evidence.getByRole('button', { name: /loading-note\.docx/ }).click()
  await expect(evidence.getByText('装车窗口已确认')).toBeVisible()
})

test('a narrow toolbar loads its overflow menu on demand and reuses the application action', async ({
  page,
}) => {
  await page.goto('/scenes.html')
  const toolbar = page.getByTestId('narrow-toolbar')
  await expect(toolbar.getByRole('button', { name: '保存' })).toBeVisible()
  await toolbar.getByRole('button', { name: '更多' }).click()
  await page.getByText('导出', { exact: true }).click()
  await expect(toolbar.getByTestId('toolbar-exports')).toHaveText('1')
})
