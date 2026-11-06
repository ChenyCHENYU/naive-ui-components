import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  createComponentStyleEntry,
  readPublishedStyle,
  SHARED_COMPONENT_STYLES,
  SHARED_TOKENS_FILE,
} from '../scripts/build/published-style.js'
import { checkSharedStyleConsumer } from '../scripts/check-shared-styles.js'

function fixture(
  files: Record<string, string>,
  run: (directory: string) => void
) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'robot-style-closure-'))
  try {
    for (const [file, content] of Object.entries(files)) {
      const filename = path.join(root, file)
      fs.mkdirSync(path.dirname(filename), { recursive: true })
      fs.writeFileSync(filename, content)
    }
    run(root)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
}

describe('published CSS sharing contract', () => {
  test('full CSS references reviewed shared dependencies while retaining own styles', () => {
    for (const [name, shared] of Object.entries(SHARED_COMPONENT_STYLES)) {
      const result = createComponentStyleEntry(name, (visited: Set<string>) => {
        expect([...visited]).toEqual(shared.external)
        return [`.${name}{color:var(--c-primary)}`]
      })
      expect(result.startsWith(`@import "./${shared.imports[0]}";`)).toBe(true)
      expect(result).toContain(`.${name}{color:var(--c-primary)}`)
      expect(result).not.toContain(SHARED_TOKENS_FILE)
    }
    expect(
      createComponentStyleEntry('C_Button', () => ['.button{color:blue}'])
    ).toBe(`@import "./${SHARED_TOKENS_FILE}";\n.button{color:blue}`)
  })

  test('effective closure preserves dependency order, comments and every declaration', () => {
    fixture(
      {
        'entry.css': '@import "./form.css";\n.table{display:grid}',
        'form.css': '@import "./editor.css";\n.form{gap:8px}',
        'editor.css': `@import "./${SHARED_TOKENS_FILE}";\n/*! required notice */\n.editor{color:red}`,
        [SHARED_TOKENS_FILE]: ':root{--c-primary:blue}',
      },
      root => {
        const css = readPublishedStyle(root, 'entry.css')
        expect(css).not.toContain('@import')
        expect(css).toContain('/*! required notice */')
        expect(css.match(/--c-primary:/g)).toHaveLength(1)
        expect(css.indexOf('--c-primary')).toBeLessThan(css.indexOf('.editor'))
        expect(css.indexOf('.editor')).toBeLessThan(css.indexOf('.form'))
        expect(css.indexOf('.form')).toBeLessThan(css.indexOf('.table'))
        expect(css).toContain('display:grid')
      }
    )
  })

  test('missing, circular, remote, conditional, misplaced and nested imports fail closed', () => {
    const failures = [
      '@import "./missing.css";',
      '@import "./entry.css";',
      '@import "https://example.com/style.css";',
      '@IMPORT "https://example.com/style.css";',
      '@import "//example.com/style.css";',
      '@import "./child.css" screen;',
      '@import "../outside.css";',
      '.table{}@import "./child.css";',
      '@media screen{@import "./child.css";}',
    ]
    for (const css of failures)
      fixture({ 'entry.css': css, 'child.css': '.child{}' }, root => {
        expect(() => readPublishedStyle(root, 'entry.css')).toThrow()
      })
  })

  test('true package subpaths expand local CSS and image dependencies in a consumer build', async () => {
    const directory = fs.mkdtempSync(
      path.join(os.tmpdir(), 'robot-published-style-fixture-')
    )
    try {
      fs.mkdirSync(path.join(directory, 'dist', 'images'), { recursive: true })
      fs.writeFileSync(
        path.join(directory, 'package.json'),
        JSON.stringify({
          name: '@robot-admin/naive-ui-components',
          version: '0.0.0-test',
          sideEffects: [`dist/${SHARED_TOKENS_FILE}`, 'dist/C_*.css'],
          exports: { './C_*/style.css': './dist/C_*.css' },
        })
      )
      const files = {
        [SHARED_TOKENS_FILE]: ':root{--c-primary:blue}',
        'C_Editor.css': `@import "./${SHARED_TOKENS_FILE}";/*! editor notice */.w-e-text-container{color:blue}`,
        'C_Form.css':
          '@import "./C_Editor.css";.c-form-actions[data-v-form]{gap:8px}',
        'C_Table.css':
          '@import "./C_Form.css";.c-table-wrapper[data-v-table]{display:grid}',
        'C_Table.base.css': `@import "./${SHARED_TOKENS_FILE}";.c-form-actions[data-v-form]{gap:8px}.c-table-wrapper[data-v-table]{display:grid}`,
        'C_FormModal.css':
          '@import "./C_Form.css";.c-action-bar[data-v-action]{display:flex}',
        'C_DataPicker.css':
          '@import "./C_Table.base.css";.c-data-picker[data-v-picker]{width:100%}',
        'C_BatchResult.css':
          '@import "./C_Table.base.css";.c-batch-result[data-v-batch]{gap:8px}',
        'C_Map.css': `@import "./${SHARED_TOKENS_FILE}";.leaflet-container{background-image:url("./images/layers.png")}`,
      }
      for (const [name, source] of Object.entries(files))
        fs.writeFileSync(path.join(directory, 'dist', name), source)
      fs.copyFileSync(
        'node_modules/leaflet/dist/images/layers.png',
        path.join(directory, 'dist', 'images', 'layers.png')
      )
      expect(await checkSharedStyleConsumer(directory)).toMatchObject({
        components: 6,
        cssAssets: 1,
        relativeAssets: 1,
      })
    } finally {
      fs.rmSync(directory, { recursive: true, force: true })
    }
  })
})
