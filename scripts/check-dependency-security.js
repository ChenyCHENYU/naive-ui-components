import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  legacyMinimatchReview,
  verifyLegacyMinimatch,
} from './legacy-minimatch-review.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const bracesMitigation = Object.freeze({
  advisory: 'GHSA-vfj7-8cjw-p6xm',
  url: 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm',
  version: '3.0.3',
  patch: 'patches/braces@3.0.3.patch',
  sha256: '6c59dad67310b2f93ed0fead159b0207845d70a6d30a5ae49384c2930df48303',
})

const depthPattern = (depth, left = '{', right = '}') =>
  left.repeat(depth) + 'a,b' + right.repeat(depth)

// Construct the AST iteratively, independently of the patched parser. Otherwise
// a working parse guard could conceal an unpatched direct-AST entry point.
const nestedAst = (depth, type) => {
  let node = { type: 'text', value: 'a,b' }
  for (let index = 0; index < depth; index++) {
    const brace = type === 'brace'
    const parent = {
      type,
      open: true,
      close: true,
      commas: 0,
      ranges: 0,
      nodes: [
        { type: brace ? 'open' : 'text', value: brace ? '{' : '(' },
        node,
        { type: brace ? 'close' : 'text', value: brace ? '}' : ')' },
      ],
    }
    for (const child of parent.nodes) child.parent = parent
    node = parent
  }
  const ast = { type: 'root', nodes: [node] }
  node.parent = ast
  return ast
}

export const verifyBracesBehavior = braces => {
  let checks = 0
  const rejectsDepth = operation => {
    assert.throws(
      operation,
      error =>
        error instanceof SyntaxError &&
        error.message === 'braces nesting exceeds maximum depth of 100',
      'braces must reject excessive depth before stack exhaustion'
    )
    checks++
  }
  for (const depth of [101, 4000]) {
    for (const pair of [
      ['{', '}'],
      ['(', ')'],
    ]) {
      const pattern = depthPattern(depth, ...pair)
      for (const method of ['parse', 'compile', 'expand', 'stringify']) {
        rejectsDepth(() => braces[method](pattern))
      }
      rejectsDepth(() => braces(pattern))
    }
  }
  for (const method of ['compile', 'expand', 'stringify']) {
    for (const type of ['brace', 'paren']) {
      rejectsDepth(() => braces[method](nestedAst(4000, type)))
    }
    assert.doesNotThrow(() => braces[method](depthPattern(100)))
    checks++
  }
  const examples = [
    ['*.js', '*.js', ['*.js']],
    [
      'src/{a,b}/{c,d}.ts',
      'src/(a|b)/(c|d).ts',
      ['src/a/c.ts', 'src/a/d.ts', 'src/b/c.ts', 'src/b/d.ts'],
    ],
    [
      'file-{001..003}.md',
      'file-(00[1-3]).md',
      ['file-001.md', 'file-002.md', 'file-003.md'],
    ],
    ['{1..5..2}', '(1|3|5)', ['1', '3', '5']],
    ['a/{b,{c,d}}/e', 'a/(b|(c|d))/e', ['a/b/e', 'a/c/e', 'a/d/e']],
    ['{a,,b}', '(a|b)', ['a', '', 'b']],
  ]
  for (const [pattern, compiled, expanded] of examples) {
    for (const input of [() => pattern, () => braces.parse(pattern)]) {
      assert.equal(braces.compile(input()), compiled)
      assert.deepEqual(braces.expand(input()), expanded)
      assert.equal(braces.stringify(input()), pattern)
      checks += 3
    }
  }
  assert.equal(braces.stringify('\\{literal\\}'), '{literal}')
  return checks + 1
}

export const verifyBracesMitigation = (directory = root) => {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(directory, 'package.json'), 'utf8')
  )
  assert.equal(
    pkg.patchedDependencies?.['braces@3.0.3'],
    bracesMitigation.patch,
    'Exact braces patchedDependencies entry is required'
  )
  const patch = fs.readFileSync(path.join(directory, bracesMitigation.patch))
  assert.equal(
    createHash('sha256').update(patch).digest('hex'),
    bracesMitigation.sha256,
    'Reviewed braces patch SHA-256 changed'
  )
  const require = createRequire(path.join(directory, 'package.json'))
  assert.equal(
    require('braces/package.json').version,
    bracesMitigation.version,
    'Installed braces version must match the reviewed patch'
  )
  const micromatchRequire = createRequire(
    require.resolve('micromatch/package.json')
  )
  assert.equal(
    micromatchRequire.resolve('braces'),
    require.resolve('braces'),
    'micromatch must resolve the verified braces installation'
  )
  const lock = fs.readFileSync(path.join(directory, 'bun.lock'), 'utf8')
  const resolutions = [...lock.matchAll(/"[^"]*braces":\s*\["braces@([^"]+)"/g)]
  assert.deepEqual(
    resolutions.map(match => match[1]),
    ['3.0.3'],
    'Only the reviewed braces resolution may be locally mitigated'
  )
  const checks = verifyBracesBehavior(require('braces'))
  assert.deepEqual(
    require('micromatch')(
      ['src/a.ts', 'src/a.vue', 'docs/a.md'],
      'src/**/*.{ts,vue}'
    ),
    ['src/a.ts', 'src/a.vue']
  )
  return checks + 1
}

export const evaluateAuditResult = (result, verifyMitigation, verifyLegacy) => {
  if (result.error || result.signal || ![0, 1].includes(result.status)) {
    throw new Error('Dependency audit did not complete successfully')
  }
  if (
    /\b(error|failed|timed?\s*out|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|ECONN\w*)\b/i.test(
      result.stderr || ''
    )
  ) {
    throw new Error('Dependency audit reported an execution or network error')
  }
  let audit
  try {
    audit = JSON.parse(result.stdout)
  } catch {
    throw new Error('Dependency audit did not return valid JSON')
  }
  assert.ok(
    audit && typeof audit === 'object' && !Array.isArray(audit),
    'Dependency audit returned an unexpected JSON schema'
  )
  const entries = Object.entries(audit)
  if (entries.length === 0) {
    assert.equal(
      result.status,
      0,
      'An empty audit with a failure exit is not a clean audit'
    )
    return {
      rawFindings: 0,
      locallyMitigated: [],
      behaviorChecks: verifyMitigation(),
    }
  }
  const locallyMitigated = []
  const notAffected = []
  for (const [name, alerts] of entries) {
    assert.ok(
      Array.isArray(alerts) && alerts.length === 1,
      'Unreviewed dependency advisory: unexpected advisory count'
    )
    const alert = alerts[0]
    if (
      name === 'braces' &&
      alert?.id === 1240992 &&
      alert.url === bracesMitigation.url &&
      alert.severity === 'high' &&
      alert.vulnerable_versions === '<=3.0.3'
    ) {
      locallyMitigated.push(bracesMitigation.advisory)
    } else if (
      name === 'minimatch' &&
      alert?.id === 1244012 &&
      alert.url === legacyMinimatchReview.url &&
      alert.severity === 'moderate' &&
      alert.vulnerable_versions === '<11.0.1' &&
      typeof verifyLegacy === 'function'
    ) {
      notAffected.push(legacyMinimatchReview.advisory)
    } else
      assert.fail('Unreviewed dependency advisory: identity or scope changed')
  }
  assert.equal(
    result.status,
    1,
    'Audit exit code does not match its reported findings'
  )
  return {
    rawFindings: entries.length,
    locallyMitigated,
    ...(notAffected.length ? { notAffected } : {}),
    behaviorChecks:
      verifyMitigation() + (notAffected.length ? verifyLegacy() : 0),
  }
}

export const checkDependencySecurity = (directory = root) => {
  const legacyChecks = verifyLegacyMinimatch(directory)
  const audit = spawnSync('bun', ['audit', '--json'], {
    cwd: directory,
    encoding: 'utf8',
    timeout: 60_000,
    maxBuffer: 8 * 1024 * 1024,
  })
  return evaluateAuditResult(
    audit,
    () => verifyBracesMitigation(directory),
    () => legacyChecks
  )
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const result = checkDependencySecurity()
    console.log(JSON.stringify(result, null, 2))
    if (result.rawFindings) {
      console.log(
        'Raw findings are retained above: locallyMitigated means a verified patch; notAffected means an exact reviewed legacy path lacks the affected code. This is not a zero-finding raw audit.'
      )
    }
  } catch (error) {
    console.error(`Dependency security check failed: ${error.message}`)
    process.exitCode = 1
  }
}
