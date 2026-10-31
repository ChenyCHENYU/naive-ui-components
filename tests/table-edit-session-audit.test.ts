/*
 * @Description: 公开表格编辑 hook 的异步校验会话和作用域隔离
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */
import { expect, test } from 'bun:test'
import { effectScope } from 'vue'
import { useCellEdit } from '../src/components/C_Table/composables/useCellEdit'
import { useRowEdit } from '../src/components/C_Table/composables/useRowEdit'
import type { DataRecord } from '../src/components/C_Table/types'

function setup(
  mode: 'row' | 'cell',
  validation: Promise<string | undefined>,
  onSave = () => {}
) {
  const source: DataRecord[] = [{ id: 1, name: 'original' }]
  const options = {
    data: () => source,
    rowKey: (row: DataRecord) => row.id as number,
    columns: () => [
      {
        key: 'name',
        title: '名称',
        editProps: {
          rules: [
            {
              asyncValidator: () =>
                validation.then(message => {
                  if (message) throw new Error(message)
                }),
            },
          ],
        },
      },
    ],
    onSave,
  }
  if (mode === 'row') {
    const editor = useRowEdit(options)
    return {
      start: () => editor.startEditRow(1),
      update: () => editor.updateEditingRowData(1, 'name', 'current'),
      cancel: () => editor.cancelEditRow(),
      validate: editor.validateRow,
      error: () => editor.validationErrors.value,
      save: editor.saveEditRow,
    }
  }
  const editor = useCellEdit(options)
  return {
    start: () => editor.startEditCell(1, 'name'),
    update: () => editor.updateEditingCellValue(1, 'name', 'current'),
    cancel: () => editor.cancelEditCell(),
    validate: editor.validateCell,
    error: () => editor.cellValidationError.value,
    save: editor.saveEditCell,
  }
}

for (const mode of ['row', 'cell'] as const) {
  test(`${mode}: a validation from a cancelled/reopened draft cannot populate the current draft`, async () => {
    let finish!: (message?: string) => void
    const validation = new Promise<string | undefined>(resolve => {
      finish = resolve
    })
    const editor = setup(mode, validation)
    editor.start()
    const pending = editor.validate()
    await editor.cancel()
    editor.start()
    finish('旧值错误')
    expect(await pending).toBe(false)
    expect(editor.error()).toEqual(mode === 'row' ? [] : null)
  })

  test(`${mode}: editing after validation begins invalidates its result`, async () => {
    let finish!: (message?: string) => void
    const validation = new Promise<string | undefined>(resolve => {
      finish = resolve
    })
    const editor = setup(mode, validation)
    editor.start()
    const pending = editor.validate()
    editor.update()
    finish('旧值错误')
    expect(await pending).toBe(false)
    expect(editor.error()).toEqual(mode === 'row' ? [] : null)
  })

  test(`${mode}: stopping a public hook's scope during validation prevents a late save callback`, async () => {
    let finish!: () => void
    let saves = 0
    const validation = new Promise<string | undefined>(resolve => {
      finish = () => resolve(undefined)
    })
    const scope = effectScope()
    const editor = scope.run(() =>
      setup(mode, validation, () => {
        saves++
      })
    )!
    editor.start()
    const pending = editor.save()
    scope.stop()
    finish()
    await pending
    expect(saves).toBe(0)
  })
}
