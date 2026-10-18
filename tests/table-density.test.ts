import { describe, expect, test } from 'bun:test'
import { computed, effectScope, ref } from 'vue'
import { resolveComponentDensity } from '../src/core/density'
import {
  resolveConfig,
  type TableConfig,
} from '../src/components/C_Table/composables/useTableConfig'
import { mergeGlobalConfig } from '../src/components/C_Table/composables/useTableGlobalConfig'
import { useTableManager } from '../src/components/C_Table/composables/useTableManager'
import type { DataRecord, EditMode } from '../src/components/C_Table/types'

describe('shared density and concise table config', () => {
  test('density presets are independent and explicit native sizes win', () => {
    const preset = resolveComponentDensity('compact')
    preset.gap = 999
    expect(resolveComponentDensity('compact').gap).toBe(8)
    expect(resolveConfig().size).toBe('medium')
    expect(resolveConfig().toolbarActionBarConfig).toEqual({})
    for (const [density, size] of [
      ['compact', 'small'],
      ['default', 'medium'],
      ['comfortable', 'large'],
    ] as const) {
      const config = resolveConfig({ density })
      expect(config.size).toBe(size)
      expect(config.pagination?.size).toBe(size)
      expect(config.toolbarActionBarConfig.size).toBe(size)
    }
    const config = resolveConfig({
      density: 'compact',
      display: { size: 'large' },
      pagination: { size: 'medium' },
      toolbar: { actionBar: { size: 'tiny', compact: false } },
    })
    expect(config.size).toBe('large')
    expect(config.pagination?.size).toBe('medium')
    expect(config.toolbarActionBarConfig).toMatchObject({
      size: 'tiny',
      compact: false,
    })
  })

  test('all edit shorthands match grouped config without changing old booleans', () => {
    for (const mode of [
      'none',
      'cell',
      'row',
      'both',
      'modal',
    ] satisfies EditMode[]) {
      expect(resolveConfig({ edit: mode })).toEqual(
        resolveConfig({ edit: { mode } })
      )
    }
    expect(resolveConfig({ edit: true }).editMode).toBe('modal')
    expect(resolveConfig({ edit: false }).editable).toBe(false)
    expect(
      resolveConfig({ edit: { enabled: false, mode: 'row' } }).showRowActions
    ).toBe(false)
    expect(
      resolveConfig(
        mergeGlobalConfig(
          { density: 'compact', edit: 'cell' },
          { defaults: { density: 'comfortable', edit: { mode: 'row' } } }
        )
      )
    ).toMatchObject({ size: 'small', editMode: 'cell' })
  })

  test('edit shorthand preserves global save hooks and works as a global default', () => {
    const onSave = () => undefined
    const defaults: TableConfig = {
      edit: { mode: 'row', onSave, modalWidth: 900 },
    }
    const shorthand = resolveConfig(
      mergeGlobalConfig({ edit: 'cell' }, { defaults })
    )
    const grouped = resolveConfig(
      mergeGlobalConfig({ edit: { mode: 'cell' } }, { defaults })
    )
    expect(shorthand).toEqual(grouped)
    expect(shorthand.onEditSave).toBe(onSave)
    expect(shorthand.modalWidth).toBe(900)
    expect(
      resolveConfig(
        mergeGlobalConfig({ edit: { onSave } }, { defaults: { edit: 'cell' } })
      )
    ).toMatchObject({ editMode: 'cell', onEditSave: onSave })
    expect(
      resolveConfig(mergeGlobalConfig({ edit: false }, { defaults })).editable
    ).toBe(false)
  })
})

describe('table mode changes own their drafts', () => {
  function setup(onSave?: () => Promise<void>) {
    const scope = effectScope()
    const config = ref<TableConfig>({
      density: 'compact',
      edit: { mode: 'row', onSave },
    })
    const data: DataRecord[] = [{ id: 1, name: 'original' }]
    const updates: unknown[] = []
    const manager = scope.run(() =>
      useTableManager({
        config: computed(() => resolveConfig(config.value)),
        data: () => data,
        rowKey: row => row.id as number,
        emit: (event, ...args) => {
          if (event === 'update:data') updates.push(args[0])
        },
      })
    )!
    return { scope, config, data, updates, manager }
  }

  test('density switching preserves a draft; changing edit mode discards it', () => {
    const { scope, config, manager, data } = setup()
    manager.stateManager.edit.start(1)
    manager.editStates.rowEdit.updateEditingRowData(1, 'name', 'draft')
    config.value.density = 'comfortable'
    expect(manager.stateManager.edit.getEditingData()?.name).toBe('draft')
    config.value.edit = 'cell'
    expect(manager.editStates.rowEdit.editingRowKey.value).toBeNull()
    manager.stateManager.edit.start(1, 'name')
    expect(manager.editStates.cellEdit.isEditingCell(1, 'name')).toBe(true)
    config.value.edit = false
    expect(manager.editStates.cellEdit.editingCell.value.rowKey).toBeNull()
    manager.stateManager.edit.start(1)
    expect(manager.stateManager.edit.getEditingData()).toBeNull()
    expect(data[0].name).toBe('original')
    scope.stop()
  })

  test('late save completion cannot emit a local data patch after mode change', async () => {
    let complete!: () => void
    let started!: () => void
    const pending = new Promise<void>(done => {
      complete = done
    })
    const entered = new Promise<void>(done => {
      started = done
    })
    const { scope, config, manager, updates } = setup(async () => {
      started()
      await pending
    })
    manager.stateManager.edit.start(1)
    const save = manager.stateManager.edit.save()
    await entered
    config.value.edit = 'none'
    complete()
    await save
    expect(updates).toEqual([])
    expect(manager.editStates.rowEdit.isSaving.value).toBe(false)
    expect(manager.editStates.rowEdit.editingRowKey.value).toBeNull()
    scope.stop()
  })

  test('disposing a table prevents a late save from patching application rows', async () => {
    let complete!: () => void
    let started!: () => void
    const pending = new Promise<void>(done => {
      complete = done
    })
    const entered = new Promise<void>(done => {
      started = done
    })
    const { scope, manager, updates } = setup(async () => {
      started()
      await pending
    })
    manager.stateManager.edit.start(1)
    const save = manager.stateManager.edit.save()
    await entered
    scope.stop()
    complete()
    await save
    expect(updates).toEqual([])
  })

  test('late modal cancellation cannot clear a new draft after a mode change', async () => {
    let complete!: () => void
    const pending = new Promise<void>(done => {
      complete = done
    })
    const { scope, config, manager } = setup()
    config.value.edit = { mode: 'modal', onCancel: () => pending }
    manager.stateManager.edit.start(1)
    const cancel = manager.editStates.modalEdit.cancelEdit()
    config.value.edit = 'row'
    config.value.edit = 'modal'
    manager.stateManager.edit.start(1)
    manager.editStates.modalEdit.updateEditingData({ id: 1, name: 'new draft' })
    complete()
    await cancel
    expect(manager.editStates.modalEdit.isModalVisible.value).toBe(true)
    expect(manager.stateManager.edit.getEditingData()?.name).toBe('new draft')
    scope.stop()
  })
})
