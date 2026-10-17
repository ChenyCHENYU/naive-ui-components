import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import assert from 'node:assert/strict'
import ts from 'typescript'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
const temporary = fs.mkdtempSync(
  path.join(os.tmpdir(), 'robot-package-consumer-')
)
const consumer = path.join(temporary, 'consumer')
const modules = path.join(consumer, 'node_modules')
const installedPackage = path.join(modules, ...pkg.name.split('/'))
const fixtures = path.join(root, 'tests/consumer-contracts')
const optionalPeers = Object.keys(pkg.peerDependenciesMeta ?? {}).filter(
  name => pkg.peerDependenciesMeta[name].optional
)

function run(command, args, cwd = consumer, options = {}) {
  return execFileSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: 'pipe',
    ...options,
  })
}

function runNode(args, blockPeers = false) {
  const preload = pathToFileURL(
    path.join(consumer, 'block-optional-peers.mjs')
  ).href
  return run(
    process.execPath,
    blockPeers ? ['--import', preload, ...args] : args,
    consumer,
    blockPeers
      ? {
          env: {
            ...process.env,
            ROBOT_CONSUMER_BLOCKED_PEERS: JSON.stringify(optionalPeers),
          },
        }
      : {}
  )
}

function linkDependency(name) {
  const source = path.join(root, 'node_modules', ...name.split('/'))
  if (!fs.existsSync(source)) {
    if (optionalPeers.includes(name)) return
    throw new Error(
      `Install the declared dependency before consumer checks: ${name}`
    )
  }
  const target = path.join(modules, ...name.split('/'))
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.symlinkSync(fs.realpathSync(source), target, 'junction')
}

function checkTypes(fixtureNames) {
  for (const module of [ts.ModuleKind.Node16, ts.ModuleKind.NodeNext]) {
    const options = {
      target: ts.ScriptTarget.ES2022,
      module,
      moduleResolution:
        module === ts.ModuleKind.Node16
          ? ts.ModuleResolutionKind.Node16
          : ts.ModuleResolutionKind.NodeNext,
      strict: true,
      noEmit: true,
      // Validate our consumer API independently of third-party declaration internals.
      skipLibCheck: true,
      types: [],
      lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
    }
    const filenames = fixtureNames.map(name => path.join(consumer, name))
    const program = ts.createProgram(filenames, options)
    const diagnostics = ts.getPreEmitDiagnostics(program)
    if (diagnostics.length > 0) {
      throw new Error(
        `${ts.ModuleKind[module]} consumer types failed:\n${ts.formatDiagnosticsWithColorAndContext(
          diagnostics,
          {
            getCanonicalFileName: name => name,
            getCurrentDirectory: () => consumer,
            getNewLine: () => '\n',
          }
        )}`
      )
    }
    for (const filename of filenames) {
      const commonjs = filename.endsWith('.cts')
      const expectedSuffix = commonjs ? '.d.cts' : '.d.ts'
      const source = fs.readFileSync(filename, 'utf8')
      for (const { fileName: specifier } of ts.preProcessFile(source, true)
        .importedFiles) {
        if (!specifier.startsWith(pkg.name)) continue
        const resolved = ts.resolveModuleName(
          specifier,
          filename,
          options,
          ts.sys,
          undefined,
          undefined,
          commonjs ? ts.ModuleKind.CommonJS : ts.ModuleKind.ESNext
        ).resolvedModule
        assert.ok(resolved, `Unresolved published entry: ${specifier}`)
        assert.ok(
          fs
            .realpathSync(resolved.resolvedFileName)
            .startsWith(fs.realpathSync(installedPackage) + path.sep),
          `${specifier} must resolve to the unpacked tarball`
        )
        assert.ok(
          resolved.resolvedFileName.endsWith(expectedSuffix),
          `${specifier} must resolve to ${expectedSuffix}`
        )
      }
    }
  }
}

function checkRuntime(entries, blockPeers = false) {
  const esm = entries
    .map(
      ([subpath, name], index) =>
        `import { ${name} as value${index} } from '${pkg.name}${subpath}'; if (!value${index}) throw new Error('${name} missing');`
    )
    .join('\n')
  const cjs = entries
    .map(
      ([subpath, name]) =>
        `if (!require('${pkg.name}${subpath}').${name}) throw new Error('${name} missing');`
    )
    .join('\n')
  runNode(['--input-type=module', '-e', esm], blockPeers)
  runNode(['-e', cjs], blockPeers)
}

function checkOptionalPeerGuards() {
  const probe = path.join(modules, 'robot-optional-peer-probe')
  fs.mkdirSync(probe, { recursive: true })
  fs.writeFileSync(
    path.join(probe, 'package.json'),
    JSON.stringify({
      exports: { import: './index.mjs', require: './index.cjs' },
    })
  )
  fs.writeFileSync(
    path.join(probe, 'index.mjs'),
    'export const load = specifier => import(specifier)'
  )
  fs.writeFileSync(
    path.join(probe, 'index.cjs'),
    'exports.load = specifier => require(specifier); exports.resolve = specifier => require.resolve(specifier)'
  )
  for (const peer of optionalPeers) {
    const directory = path.join(probe, 'node_modules', ...peer.split('/'))
    fs.mkdirSync(directory, { recursive: true })
    fs.writeFileSync(
      path.join(directory, 'package.json'),
      JSON.stringify({
        name: peer,
        exports: { import: './index.mjs', require: './index.cjs' },
      })
    )
    fs.writeFileSync(
      path.join(directory, 'index.mjs'),
      'export const probe = true'
    )
    fs.writeFileSync(path.join(directory, 'index.cjs'), 'exports.probe = true')
  }
  const setup = `
    import assert from 'node:assert/strict';
    import { createRequire } from 'node:module';
    import { pathToFileURL } from 'node:url';
    import path from 'node:path';
    import * as esm from 'robot-optional-peer-probe';
    const require = createRequire(import.meta.url);
    const cjs = require('robot-optional-peer-probe');
    const hostRequire = createRequire(require.resolve('vue-draggable-plus'));
    const peers = ${JSON.stringify(optionalPeers)};
    assert.ok((await import('vue')).createApp);
    assert.ok(require('vue').createApp);
    assert.ok(hostRequire('vue').createApp);
  `
  // Prove the nested dependency fallback exists before relying on a blocked error.
  runNode([
    '--input-type=module',
    '-e',
    setup +
      `
    for (const peer of peers) {
      assert.equal((await esm.load(peer)).probe, true);
      assert.equal(cjs.load(peer).probe, true);
      assert.ok(cjs.resolve(peer));
    }
  `,
  ])
  runNode(
    [
      '--input-type=module',
      '-e',
      setup +
        `
    const blocked = { code: 'ERR_ROBOT_OPTIONAL_PEER_BLOCKED' };
    for (const peer of peers) {
      await assert.rejects(() => esm.load(peer), blocked);
      assert.throws(() => cjs.load(peer), blocked);
      assert.throws(() => cjs.resolve(peer), blocked);
      assert.throws(() => hostRequire(peer), blocked);
      assert.throws(() => hostRequire.resolve(peer), blocked);
      const directory = path.resolve('node_modules/robot-optional-peer-probe/node_modules', peer);
      await assert.rejects(() => import(pathToFileURL(path.join(directory, 'index.mjs')).href), blocked);
      assert.throws(() => require(path.join(directory, 'index.cjs')), blocked);
    }
  `,
    ],
    true
  )
}

try {
  fs.mkdirSync(installedPackage, { recursive: true })
  fs.writeFileSync(
    path.join(consumer, 'package.json'),
    JSON.stringify({ private: true })
  )
  const [packed] = JSON.parse(
    run(
      'npm',
      [
        'pack',
        '--json',
        '--ignore-scripts',
        '--offline',
        '--pack-destination',
        temporary,
        '--cache',
        path.join(temporary, 'npm-cache'),
      ],
      root
    )
  )
  run('tar', [
    '-xzf',
    path.join(temporary, packed.filename),
    '-C',
    installedPackage,
    '--strip-components=1',
  ])

  // Reuse declared installed dependencies only. No registry resolution, install scripts,
  // repository tsconfig paths, or source files participate in this consumer project.
  const dependencies = new Set([
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.peerDependencies ?? {}),
  ])
  for (const name of dependencies) linkDependency(name)
  for (const name of fs.readdirSync(fixtures)) {
    fs.copyFileSync(path.join(fixtures, name), path.join(consumer, name))
  }
  checkTypes(['consumer.mts', 'consumer.cts'])
  checkRuntime([
    ['', 'C_Form'],
    ['/resolver', 'RobotNaiveUiResolver'],
  ])

  for (const peer of optionalPeers) {
    fs.rmSync(path.join(modules, ...peer.split('/')), { force: true })
  }
  const consumerRequire = createRequire(path.join(consumer, 'runtime.cjs'))
  for (const peer of optionalPeers) {
    assert.throws(() => consumerRequire.resolve(peer), {
      code: 'MODULE_NOT_FOUND',
    })
  }
  checkTypes(['standalone.mts', 'standalone.cts'])
  checkOptionalPeerGuards()
  checkRuntime(
    [
      ['/C_Icon', 'C_Icon'],
      ['/C_Form', 'C_Form'],
      ['/C_Table', 'C_Table'],
      ['/C_Menu', 'C_Menu'],
    ],
    true
  )
  console.log(
    `Packed consumer contracts passed: ESM/CJS, Node16/NodeNext, and component subpaths without ${optionalPeers.join('/')}.`
  )
  console.log(
    'Dependency versions reuse the local installation; fresh registry installation is not exercised. skipLibCheck validates consumer usage without fully checking third-party declaration internals.'
  )
} finally {
  fs.rmSync(temporary, { recursive: true, force: true })
}
