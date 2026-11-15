import { test, expect } from './fixtures'

test('master/detail switches cancel old work and clearing removes both children', async ({
  page,
}) => {
  await page.goto('/business-scenarios.html')
  const production = page.getByTestId('production-scenario')
  await production.getByRole('row').filter({ hasText: 'Q355B' }).click()
  await production.getByRole('row').filter({ hasText: 'HRB400E' }).click()
  await expect(page.getByTestId('bound-heats')).toContainText('H-02')
  await expect(page.getByTestId('slab-candidates')).toContainText('MAT-02')
  await expect(page.getByTestId('bound-heats')).not.toContainText('H-01')
  await production.getByRole('button', { name: '清空订单' }).click()
  await expect(page.getByTestId('bound-heats')).not.toContainText('H-02')
  await expect(page.getByTestId('slab-candidates')).not.toContainText('MAT-02')
})

test('one child error and retry leave its sibling usable', async ({ page }) => {
  await page.goto('/business-scenarios.html')
  await page.getByRole('button', { name: '下次炉次查询失败' }).click()
  await page
    .getByTestId('production-scenario')
    .getByRole('row')
    .filter({ hasText: 'Q355B' })
    .click()
  await expect(page.getByTestId('bound-heats').getByRole('alert')).toBeVisible()
  await expect(page.getByTestId('slab-candidates')).toContainText('MAT-01')
  await page.getByRole('button', { name: '重试炉次' }).click()
  await expect(page.getByTestId('bound-heats')).toContainText('H-01')
  await expect(page.getByTestId('bound-heats').getByRole('alert')).toHaveCount(
    0
  )
  await expect(page.getByTestId('slab-candidates')).toContainText('MAT-01')
})

test('real consecutive inputs preserve exact quality values and separate sample drafts', async ({
  page,
}) => {
  await page.goto('/business-scenarios.html')
  const device = page.getByTestId('device-04')
  const inputs = device.getByRole('textbox')
  await inputs.nth(0).fill('0.00000')
  await inputs.nth(0).press('Tab')
  await expect(inputs.nth(1)).toBeFocused()
  await inputs.nth(1).fill('0.01000')
  await page.getByRole('button', { name: '生成整合载荷' }).click()
  await expect(page.getByTestId('integrated-results')).toContainText('0.00000')
  await expect(page.getByTestId('integrated-results')).toContainText('0.01000')
  await inputs.nth(1).fill('0.02000')
  await expect(page.getByTestId('integrated-results')).toContainText('0.01000')
  await page.getByRole('button', { name: 'S-002', exact: true }).click()
  await expect(inputs.nth(0)).toHaveValue('')
  await expect(inputs.nth(1)).toHaveValue('')
  await inputs.nth(1).fill('ND')
  await page.getByRole('button', { name: 'S-001', exact: true }).click()
  await expect(inputs.nth(0)).toHaveValue('0.00000')
  await expect(inputs.nth(1)).toHaveValue('0.02000')
  await page.getByRole('button', { name: '新增04设备行' }).click()
  await expect(inputs).toHaveCount(4)
  await page.getByRole('button', { name: '删除04设备末行' }).click()
  await expect(inputs).toHaveCount(2)
  await expect(inputs.nth(1)).toHaveValue('0.02000')
})

test('nested split tables recover their measured width after hidden resize', async ({
  page,
}) => {
  await page.goto('/business-scenarios.html')
  await page
    .getByTestId('production-scenario')
    .getByRole('row')
    .filter({ hasText: 'Q355B' })
    .click()
  await expect(page.getByTestId('bound-heats')).toContainText('H-01')
  const layout = page.getByTestId('production-layout')
  const before = await layout.boundingBox()
  expect(before).not.toBeNull()
  await page.getByRole('button', { name: '隐藏分配工作台' }).click()
  await expect(layout).toBeHidden()
  await page.setViewportSize({ width: 900, height: 900 })
  await page.getByRole('button', { name: '显示分配工作台' }).click()
  await expect(layout).toBeVisible()
  await expect(page.getByTestId('bound-heats')).toContainText('H-01')
  await expect
    .poll(() => layout.evaluate(element => element.clientWidth))
    .toBeLessThan(before!.width)
  const panels = await layout.locator('.n-data-table').evaluateAll(elements =>
    elements.map(element => {
      const rect = element.getBoundingClientRect()
      return { width: rect.width, height: rect.height }
    })
  )
  expect(panels).toHaveLength(3)
  for (const panel of panels) {
    expect(panel.width).toBeGreaterThan(150)
    expect(panel.height).toBeGreaterThan(60)
  }
})

test('material navigation cancels drafts, returns focus, and commits only the confirmed identity', async ({
  page,
}) => {
  await page.goto('/business-scenarios.html')
  const trigger = page
    .getByTestId('material-picker')
    .getByRole('button')
    .first()
  await expect(trigger).toHaveText('圆钢 1')
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: '选择合同物料' })
  await expect(dialog).toBeVisible()
  await dialog.getByText('合金', { exact: true }).click()
  const alloy = dialog.getByRole('row').filter({ hasText: 'M-6' })
  await alloy.locator('.n-radio').click()
  await expect(alloy.getByRole('radio')).toBeChecked()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
  await expect(page.getByTestId('material-value')).toHaveText(
    '已提交物料：material-1'
  )
  await trigger.click()
  await dialog.getByText('合金', { exact: true }).click()
  await alloy.locator('.n-radio').click()
  await expect(alloy.getByRole('radio')).toBeChecked()
  await dialog.getByRole('button', { name: '确定', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByTestId('material-value')).toHaveText(
    '已提交物料：material-6'
  )
  await expect(trigger).toHaveText('合金 2')
})

test('organization selection distinguishes same-name people by the configured code', async ({
  page,
}) => {
  await page.goto('/business-scenarios.html')
  await page.getByTestId('operator-picker').getByRole('button').first().click()
  const dialog = page.getByRole('dialog', { name: '选择配料人员' })
  await expect(dialog).toBeVisible()
  await dialog.getByText('轧钢班组', { exact: true }).first().click()
  const person = dialog.getByRole('row').filter({ hasText: 'U002' })
  await person.locator('.n-radio').click()
  await expect(person.getByRole('radio')).toBeChecked()
  await dialog.getByRole('button', { name: '确定', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByTestId('operator-value')).toHaveText(
    '已提交工号：U002'
  )
})

test('quick picker Escape preserves committed data and a new scope replaces old candidates', async ({
  page,
}) => {
  await page.goto('/')
  const quick = page.getByPlaceholder('输入物料编码，或打开完整选择')
  await quick.fill('M0002')
  const popup = page.getByRole('dialog', { name: '选择可用物料' })
  await expect(
    popup.getByRole('row').filter({ hasText: 'M0002' })
  ).toBeVisible()
  const candidate = popup.getByRole('row').filter({ hasText: 'M0002' })
  await candidate.locator('.n-checkbox').click()
  await expect(candidate.getByRole('checkbox')).toBeChecked()
  await page.keyboard.press('Escape')
  await expect(popup).toBeHidden()
  await expect(quick).toBeFocused()
  await expect(page.getByTestId('picker-result')).toHaveText('尚未确认选择')
  await page.getByText('验证异常与上下文', { exact: true }).click()
  await page.getByRole('button', { name: '切换工厂（F01）' }).click()
  await quick.fill('M00')
  await expect(
    popup.getByRole('row').filter({ hasText: 'M0025' })
  ).toBeVisible()
  await expect(popup).not.toContainText('M0002')
  await expect(popup).toContainText('已选 0')
})

test('remote tree error retries and scope replacement cannot restore obsolete search results', async ({
  page,
}) => {
  await page.goto('/contracts.html')
  const tree = page.locator('.c-tree').first()
  const search = tree.getByRole('textbox').first()
  await page.getByRole('button', { name: '下次查询失败', exact: true }).click()
  await search.fill('水泵')
  await expect(
    tree.getByRole('button', { name: '重试', exact: true })
  ).toBeVisible()
  await tree.getByRole('button', { name: '重试', exact: true }).click()
  await expect(tree.getByText('循环水泵', { exact: true })).toBeVisible()
  await search.fill('备用')
  await page.getByRole('button', { name: '切换范围', exact: true }).click()
  await expect(search).toHaveValue('')
  await expect(page.locator('.contract-output').first()).toContainText(
    'factory-B'
  )
  await search.fill('轴承')
  await expect(tree.getByText('轧机轴承', { exact: true })).toBeVisible()
  await expect(tree.getByText('备用轴承', { exact: true })).toBeVisible()
  await expect(tree.getByText('循环水泵', { exact: true })).toHaveCount(0)
})
