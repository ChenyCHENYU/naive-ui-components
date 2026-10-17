import { describe, expect, test } from 'bun:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { assertDeclarationBoundary } from '../scripts/build/declaration-boundary.js'

function withDeclarations(
  files: Record<string, string>,
  check: (directory: string) => void
) {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'robot-declarations-')
  )
  try {
    for (const [name, source] of Object.entries(files)) {
      fs.writeFileSync(path.join(directory, name), source)
    }
    check(directory)
  } finally {
    fs.rmSync(directory, { recursive: true, force: true })
  }
}

describe('published declaration boundary', () => {
  test('rejects a transitive Naive internal import in ESM and CJS declarations', () => {
    for (const [extension, script, internal] of [
      ['d.ts', 'js', 'naive-ui/es/form/src/interface'],
      ['d.cts', 'cjs', 'naive-ui/lib/menu/src/interface'],
    ]) {
      withDeclarations(
        {
          'index.d.ts': '',
          'index.d.cts': '',
          [`index.${extension}`]: `export * from './shared.${script}'`,
          [`shared.${extension}`]: `import type { Internal } from '${internal}'`,
        },
        directory => {
          expect(() => assertDeclarationBoundary(directory, ['index'])).toThrow(
            'Naive UI internal path'
          )
        }
      )
    }
  })

  test('accepts public types and checks every shared declaration once', () => {
    withDeclarations(
      {
        'index.d.ts': "export * from './shared.js'",
        'index.d.cts': "export * from './shared.cjs'",
        'shared.d.ts': "export type { FormInst } from 'naive-ui'",
        'shared.d.cts': "export type { FormInst } from 'naive-ui'",
      },
      directory => {
        expect(assertDeclarationBoundary(directory, ['index', 'shared'])).toBe(
          4
        )
      }
    )
  })
})
