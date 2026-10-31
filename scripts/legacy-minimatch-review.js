import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'

export const legacyMinimatchReview = Object.freeze({
  advisory: 'GHSA-g3hv-75wg-m249',
  url: 'https://github.com/advisories/GHSA-g3hv-75wg-m249',
  upstream:
    'https://github.com/isaacs/minimatch/security/advisories/GHSA-g3hv-75wg-m249',
  version: '3.1.5',
  sha256: '746849f267c4868a53729225bd85c7dccd387712136fb305fcc0a3eadd4a3d9d',
})

/** The maintainer scopes this issue to 10.2.6 preprocessing, absent from legacy 3.1.5. */
export function verifyLegacyMinimatch(directory) {
  const require = createRequire(path.join(directory, 'package.json'))
  assert.equal(
    require('glob/package.json').version,
    '7.2.3',
    'Legacy glob identity changed'
  )
  const legacy = createRequire(require.resolve('glob/package.json'))
  assert.equal(
    legacy('minimatch/package.json').version,
    legacyMinimatchReview.version,
    'Reviewed legacy minimatch version changed'
  )
  const source = fs.readFileSync(legacy.resolve('minimatch'))
  assert.equal(
    createHash('sha256').update(source).digest('hex'),
    legacyMinimatchReview.sha256,
    'Reviewed legacy minimatch SHA-256 changed'
  )
  assert.doesNotMatch(
    source.toString(),
    /firstPhasePreProcess|secondPhasePreProcess|optimizationLevel/
  )

  const minimatch = legacy('minimatch')
  // The exact pattern from the upstream fix must not amplify into additional alternatives.
  let checks = 4
  for (const count of [1, 2, 4, 16, 64, 256, 1024]) {
    const match = new minimatch.Minimatch(
      Array(count).fill('**/../a/b').join('/'),
      { optimizationLevel: 2 }
    )
    assert.equal(match.globParts.length, 1)
    assert.equal(match.globParts[0].length, 4 * count)
    assert.equal(match.set.length, 1)
    checks += 3
  }
  assert.equal(minimatch('src/utils/data.ts', 'src/**/*.ts'), true)
  assert.equal(
    typeof new minimatch.Minimatch('*.ts').set[0][0]._glob,
    'string',
    'Legacy glob RegExp metadata contract changed'
  )

  const lock = fs.readFileSync(path.join(directory, 'bun.lock'), 'utf8')
  const versions = [
    ...new Set(
      [...lock.matchAll(/"[^"]*minimatch":\s*\["minimatch@([^"]+)"/g)].map(
        match => match[1]
      )
    ),
  ].sort()
  assert.deepEqual(
    versions,
    ['11.0.1', '3.1.5'],
    'Unreviewed minimatch resolution'
  )
  const beautify = createRequire(require.resolve('js-beautify/package.json'))
  assert.equal(
    beautify('glob/package.json').version,
    '14.0.2',
    'Modern glob fix is missing'
  )
  assert.equal(
    require('minimatch/package.json').version,
    '11.0.1',
    'Modern minimatch fix is missing'
  )
  return checks + 5
}
