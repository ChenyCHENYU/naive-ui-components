import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import path from 'node:path'
import { parseStoredCollapseKeys } from '../src/components/C_CollapsePanel/composables/useCollapsePanel'
import { parseStoredTags } from '../src/components/C_TagsView/useTagsView'
import {
  cloneTableColumns,
  mergeColumnPreferences,
  parseColumnPreferences,
  serializeColumnPreferences,
} from '../src/components/C_Table/components/ColumnSettings/persistence'
import type { TableColumn } from '../src/components/C_Table/types'

describe('persisted component state', () => {
  test('collapse panel ignores malformed values but keeps valid keys', () => {
    expect(parseStoredCollapseKeys('{')).toBeNull()
    expect(parseStoredCollapseKeys('{"not":"array"}')).toBeNull()
    expect(parseStoredCollapseKeys('["one",2,null,"two"]')).toEqual([
      'one',
      'two',
    ])
  })

  test('tags only restore internal paths and valid metadata', () => {
    const tags = parseStoredTags(
      JSON.stringify([
        { path: '/users?name="Alice"', title: 'Users', meta: { affix: true } },
        { path: '//external.example', title: 'External' },
        { path: '/broken', title: 1 },
        { path: '/invalid-affix', title: 'Valid', meta: { affix: 'yes' } },
      ])
    )
    expect(tags).toHaveLength(2)
    expect(tags[0]).toMatchObject({
      path: '/users?name="Alice"',
      meta: { affix: true },
    })
    expect(tags[1]?.meta).toEqual({})
    expect(parseStoredTags('{')).toEqual([])
  })

  test('tag scrolling compares DOM data values instead of interpolating a selector', () => {
    const source = fs.readFileSync(
      path.resolve(import.meta.dir, '../src/components/C_TagsView/index.vue'),
      'utf8'
    )
    expect(source).toContain('tag.dataset.path === path')
    expect(source).not.toContain('[data-path="${path}"]')
  })

  test('table column preferences discard invalid storage fields and unknown keys', () => {
    const columns: TableColumn[] = [
      { key: 'name', title: 'Name', width: 120 },
      { key: 2, title: 'Number', visible: true },
      { type: 'selection' },
    ]
    const raw = JSON.stringify([
      null,
      { key: 2, visible: false, width: {}, fixed: 'center' },
      { key: 'missing', visible: false },
      { key: 'name', width: '240px', fixed: 'right', visible: 'no' },
      { key: {}, visible: false },
    ])
    expect(parseColumnPreferences('{')).toEqual([])
    expect(parseColumnPreferences('{}')).toEqual([])
    expect(mergeColumnPreferences(columns, raw)).toEqual([
      { key: 2, title: 'Number', visible: false },
      { key: 'name', title: 'Name', width: '240px', fixed: 'right' },
      { type: 'selection' },
    ])
    expect(serializeColumnPreferences(columns)).toBe(
      JSON.stringify([
        { key: 'name', width: 120 },
        { key: 2, visible: true },
      ])
    )
    const localColumns = cloneTableColumns(columns)
    localColumns[0].visible = false
    expect(columns[0].visible).toBeUndefined()
  })
})
