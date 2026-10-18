import { expect, test } from 'bun:test'
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

test('export guard accepts one shared binding and still rejects distinct bindings', () => {
  const root = mkdtempSync(join(tmpdir(), 'robot-export-contract-'))
  try {
    mkdirSync(join(root, 'scripts'))
    for (const name of ['C_First', 'C_Second'])
      mkdirSync(join(root, 'src/components', name), { recursive: true })
    mkdirSync(join(root, 'src/core'))
    const script = join(root, 'scripts/check.mjs')
    writeFileSync(
      script,
      readFileSync(
        new URL('../scripts/check-export-conflicts.js', import.meta.url)
      )
    )
    writeFileSync(
      join(root, 'src/core/density.ts'),
      'export type ComponentDensity = "compact"'
    )
    const first = join(root, 'src/components/C_First/index.ts')
    const second = join(root, 'src/components/C_Second/index.ts')
    const shared = 'export type { ComponentDensity } from "../../core/density"'
    writeFileSync(first, shared)
    writeFileSync(second, shared)
    expect(spawnSync('node', [script]).status).toBe(0)
    writeFileSync(second, 'export type ComponentDensity = "other"')
    expect(spawnSync('node', [script]).status).toBe(1)
    writeFileSync(
      join(root, 'src/core/other.ts'),
      'export type ComponentDensity = "compact"'
    )
    writeFileSync(
      second,
      'export type { ComponentDensity } from "../../core/other"'
    )
    expect(spawnSync('node', [script]).status).toBe(1)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
