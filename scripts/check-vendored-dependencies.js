import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const sheetJsSource = Object.freeze({
  version: '0.20.3',
  url: 'https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz',
  archive: 'vendor/xlsx-0.20.3.tgz',
  integrity:
    'sha512-oLDq3jw7AcLqKWH2AhCpVTZl8mf6X2YReP+Neh0SJUzV/BdZYjth94tG5toiMB1PPrYtxOCfaoUCkvtuH+3AJA==',
})

/** 校验原始发布包、许可证和实际构建输入，防止本地替换被误当作上游原版。 */
export function verifyVendoredSheetJs({
  archive = path.join(root, sheetJsSource.archive),
  installed = path.join(root, 'node_modules/xlsx'),
  license = path.join(root, 'licenses/SheetJS.txt'),
} = {}) {
  const integrity = `sha512-${createHash('sha512').update(fs.readFileSync(archive)).digest('base64')}`
  assert.equal(
    integrity,
    sheetJsSource.integrity,
    'SheetJS upstream archive integrity mismatch'
  )
  const readOriginal = filename =>
    execFileSync('tar', ['-xOf', archive, `package/${filename}`])
  const original = JSON.parse(readOriginal('package.json').toString('utf8'))
  assert.equal(original.name, 'xlsx')
  assert.equal(original.version, sheetJsSource.version)
  assert.equal(original.license, 'Apache-2.0')
  for (const filename of [
    'package.json',
    'xlsx.mjs',
    'xlsx.js',
    'types/index.d.ts',
    'LICENSE',
  ]) {
    assert.ok(
      readOriginal(filename).equals(
        fs.readFileSync(path.join(installed, filename))
      ),
      `SheetJS build input differs from upstream: ${filename}`
    )
  }
  assert.ok(
    readOriginal('LICENSE').equals(fs.readFileSync(license)),
    'Published SheetJS license differs from upstream'
  )
  return { ...sheetJsSource, integrity }
}

/** 发布包的运行依赖不包含 CDN，来源与许可声明随产物交付。 */
export function checkVendoredDependencies() {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(root, 'package.json'), 'utf8')
  )
  assert.equal(
    pkg.dependencies.xlsx,
    undefined,
    'SheetJS must not require a consumer CDN install'
  )
  assert.equal(pkg.devDependencies.xlsx, `file:${sheetJsSource.archive}`)
  for (const entry of ['THIRD_PARTY_NOTICES.md', 'licenses'])
    assert.ok(pkg.files.includes(entry))
  const source = verifyVendoredSheetJs()
  console.log(
    `Vendored SheetJS ${source.version} verified: original archive, build input and Apache-2.0 license; no runtime CDN dependency.`
  )
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  checkVendoredDependencies()
}
