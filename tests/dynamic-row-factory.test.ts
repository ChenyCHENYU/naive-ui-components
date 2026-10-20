import { describe, expect, spyOn, test } from 'bun:test'
import { effectScope, shallowRef } from 'vue'
import { useDynamicRows } from '../src/components/C_Table/composables/useDynamicRow'
import type { DataRecord } from '../src/components/C_Table/types'

interface Employee {
  id: number
  name: string
  details: { level: number }
}

function setupEmployees(factory: (source?: Employee) => Employee) {
  const source = shallowRef<Employee[]>([
    { id: 1, name: 'Original', details: { level: 3 } },
  ])
  const changes: Employee[][] = []
  const warnings: string[] = []
  const errors: unknown[] = []
  const scope = effectScope()
  const dynamic = scope.run(() =>
    useDynamicRows<Employee>(source, {
      rowKey: 'id',
      defaultRowData: factory,
      feedback: {
        success: () => undefined,
        warning: message => {
          warnings.push(message)
        },
        error: (_message, cause) => {
          errors.push(cause)
        },
      },
      onRowChange: next => {
        changes.push(next)
      },
    })
  )!
  return {
    source,
    changes,
    warnings,
    errors,
    dynamic,
    stop: () => scope.stop(),
  }
}

describe('C_Table dynamic business row factories', () => {
  test('add and insert preserve factory numeric keys including zero and complete business values', () => {
    let id = 0
    const state = setupEmployees(() => ({
      id: id++ === 0 ? 0 : 2,
      name: 'New',
      details: { level: 1 },
    }))
    state.dynamic.addRow()
    expect(state.changes[0][1]).toEqual({
      id: 0,
      name: 'New',
      details: { level: 1 },
    })
    state.dynamic.selectRow(1)
    state.dynamic.insertRow()
    expect(state.changes[1][1].id).toBe(2)
    expect(state.source.value).toHaveLength(1)
    state.stop()
  })

  test('string-field copy takes a fresh factory key and deep-copies the original business values', () => {
    const state = setupEmployees(() => ({
      id: 2,
      name: 'Default',
      details: { level: 0 },
    }))
    state.dynamic.selectRow(1)
    state.dynamic.copyRow()
    const copied = state.changes[0][1]
    expect(copied).toEqual({ id: 2, name: 'Original', details: { level: 3 } })
    copied.details.level = 9
    expect(state.source.value[0].details.level).toBe(3)
    state.stop()
  })

  test('duplicate, missing and non-finite factory keys reject without publishing a new row', () => {
    for (const id of [1, undefined, NaN, Infinity]) {
      const state = setupEmployees(
        () => ({ id, name: 'Invalid', details: { level: 0 } }) as Employee
      )
      state.dynamic.addRow()
      state.dynamic.selectRow(1)
      state.dynamic.copyRow()
      expect(state.changes).toEqual([])
      expect(state.warnings).toHaveLength(2)
      expect(state.source.value[0].name).toBe('Original')
      state.stop()
    }
  })

  test('non-record or throwing factories fail with feedback and no data mutation', () => {
    for (const value of [null, undefined, [], 1]) {
      const state = setupEmployees(() => value as unknown as Employee)
      state.dynamic.addRow()
      expect(state.changes).toEqual([])
      expect(state.warnings).toHaveLength(1)
      state.stop()
    }
    const failure = new Error('Factory failed')
    const state = setupEmployees(() => {
      throw failure
    })
    expect(() => state.dynamic.addRow()).not.toThrow()
    expect(state.changes).toEqual([])
    expect(state.errors).toEqual([failure])
    state.stop()
  })

  test('function row keys use a complete source-aware factory without inventing an id field', () => {
    interface Project {
      namespace: string
      sequence: number
      title: string
    }
    const source = shallowRef<Project[]>([
      { namespace: 'engineering', sequence: 1, title: 'Original' },
    ])
    let sequence = 1
    let changed: Project[] = []
    const scope = effectScope()
    const dynamic = scope.run(() =>
      useDynamicRows<Project>(source, {
        rowKey: row => `${row.namespace}:${row.sequence}`,
        defaultRowData: original => ({
          namespace: original?.namespace ?? 'engineering',
          sequence: ++sequence,
          title: original?.title ?? 'New',
        }),
        feedback: { success: () => undefined },
        onRowChange: next => {
          changed = next
        },
      })
    )!
    dynamic.addRow()
    expect(changed[1]).toEqual({
      namespace: 'engineering',
      sequence: 2,
      title: 'New',
    })
    dynamic.selectRow('engineering:1')
    dynamic.copyRow()
    expect(changed[1]).toEqual({
      namespace: 'engineering',
      sequence: 3,
      title: 'Original',
    })
    expect('id' in changed[1]).toBe(false)
    expect(source.value[0].sequence).toBe(1)
    scope.stop()
  })

  test('the factory receives a detached copy so it cannot mutate the original row', () => {
    const state = setupEmployees(original => {
      if (original) original.details.level = 7
      return { id: 2, name: 'New', details: { level: 0 } }
    })
    state.dynamic.selectRow(1)
    state.dynamic.copyRow()
    expect(state.source.value[0].details.level).toBe(3)
    expect(state.changes[0][1].details.level).toBe(3)
    state.stop()
  })

  test('open records retain automatic string-field generation and reject generated key collisions', () => {
    const uuid = '00000000-0000-4000-8000-000000000000'
    const randomUUID = spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(
      uuid
    )
    const scope = effectScope()
    try {
      const source = shallowRef<DataRecord[]>([{ uuid: `row_${uuid}` }])
      let changes = 0
      let warnings = 0
      const dynamic = scope.run(() =>
        useDynamicRows(source, {
          rowKey: 'uuid',
          feedback: {
            warning: () => {
              warnings++
            },
          },
          onRowChange: () => {
            changes++
          },
        })
      )!
      dynamic.addRow()
      expect(changes).toBe(0)
      expect(warnings).toBe(1)
    } finally {
      scope.stop()
      randomUUID.mockRestore()
    }
  })

  test('open records with a function key require a factory and never guess an id property', () => {
    const source = shallowRef<DataRecord[]>([{ code: 'original' }])
    let changes = 0
    let warnings = 0
    const scope = effectScope()
    const dynamic = scope.run(() =>
      useDynamicRows(source, {
        rowKey: row => String(row.code),
        feedback: {
          warning: () => {
            warnings++
          },
        },
        onRowChange: () => {
          changes++
        },
      })
    )!
    dynamic.addRow()
    dynamic.selectRow('original')
    dynamic.copyRow()
    expect(changes).toBe(0)
    expect(warnings).toBe(2)
    expect(source.value).toEqual([{ code: 'original' }])
    scope.stop()
  })
})
