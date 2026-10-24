import { expect, test } from 'bun:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { verifyVendoredSheetJs } from '../scripts/check-vendored-dependencies.js'

test('vendored SheetJS matches the reviewed original and actual build inputs', () => {
  expect(verifyVendoredSheetJs().version).toBe('0.20.3')
})

test('modified archives and missing license attribution fail verification', () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'robot-vendor-test-'))
  try {
    const archive = path.join(temporary, 'changed.tgz')
    fs.writeFileSync(archive, 'not the reviewed upstream archive')
    expect(() => verifyVendoredSheetJs({ archive })).toThrow(
      'integrity mismatch'
    )
    const license = path.join(temporary, 'license.txt')
    fs.writeFileSync(license, 'missing upstream attribution')
    expect(() => verifyVendoredSheetJs({ license })).toThrow('license differs')
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true })
  }
})

test('rewritten resolution metadata or CommonJS input cannot bypass the upstream check', () => {
  const temporary = fs.mkdtempSync(
    path.join(os.tmpdir(), 'robot-vendor-input-')
  )
  try {
    for (const filename of [
      'package.json',
      'xlsx.mjs',
      'xlsx.js',
      'types/index.d.ts',
      'LICENSE',
    ]) {
      const target = path.join(temporary, filename)
      fs.mkdirSync(path.dirname(target), { recursive: true })
      fs.copyFileSync(
        path.join(import.meta.dir, '../node_modules/xlsx', filename),
        target
      )
    }
    const manifest = path.join(temporary, 'package.json')
    const original = fs.readFileSync(manifest)
    const pkg = JSON.parse(original.toString())
    pkg.exports['.'].import = './changed.mjs'
    fs.writeFileSync(manifest, JSON.stringify(pkg))
    expect(() => verifyVendoredSheetJs({ installed: temporary })).toThrow(
      'package.json'
    )
    fs.writeFileSync(manifest, original)
    fs.appendFileSync(
      path.join(temporary, 'xlsx.js'),
      '\nmodule.exports = {}\n'
    )
    expect(() => verifyVendoredSheetJs({ installed: temporary })).toThrow(
      'xlsx.js'
    )
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true })
  }
})
