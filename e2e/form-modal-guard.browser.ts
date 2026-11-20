import { expect, test } from './fixtures'

test('Escape asks before discarding a dirty form and closes a clean form directly', async ({
  page,
}) => {
  await page.goto('/scenes.html')
  const opener = page.getByRole('button', { name: '编辑发运备注' })
  const editor = page.getByRole('dialog', { name: '编辑发运备注' })
  const confirm = page.getByRole('dialog', { name: '放弃未保存修改？' })
  await opener.click()
  const draft = editor.getByRole('textbox')
  await draft.fill('变更发运时间')
  await draft.press('Escape')

  await expect(confirm).toBeVisible()
  await confirm.getByRole('button', { name: '继续编辑' }).click()
  await expect(confirm).toBeHidden()
  await expect(editor).toBeVisible()
  await expect(draft).toHaveValue('变更发运时间')

  await draft.press('Escape')
  await confirm.getByRole('button', { name: '放弃修改' }).click()
  await expect(confirm).toBeHidden()
  await expect(editor).toBeHidden()

  await opener.click()
  await expect(draft).toHaveValue('按计划装车')
  await draft.press('Escape')
  await expect(editor).toBeHidden()
  await expect(confirm).toBeHidden()
})
