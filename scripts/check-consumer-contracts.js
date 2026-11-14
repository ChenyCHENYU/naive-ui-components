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
// 联网矩阵使用独立安装；默认快速检查继续复用本地已验证依赖。
const freshProfile = process.argv[2]
const legacyPeers = freshProfile === 'minimum'
const runtimeFormats = legacyPeers ? ['cjs'] : ['esm', 'cjs']
const peerProfiles = {
  minimum: {
    vue: '3.5.3',
    'naive-ui': '2.35.0',
    'vue-router': '4.6.4',
    sortablejs: '1.15.7',
  },
  latest: {
    vue: 'latest',
    'naive-ui': 'latest',
    'vue-router': 'latest',
    sortablejs: 'latest',
  },
}
if (freshProfile && !Object.hasOwn(peerProfiles, freshProfile)) {
  throw new Error('Consumer profile must be minimum or latest')
}
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

// Match the documented consumer security policy; library dependencies stay untouched.
const consumerOverrides = {
  lodash: '4.18.1',
  minimist: '1.2.8',
  'markdown-it': '14.3.3',
}

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
            ROBOT_CONSUMER_BLOCKED_PEERS: JSON.stringify(
              Array.isArray(blockPeers) ? blockPeers : optionalPeers
            ),
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
  if (!legacyPeers) runNode(['--input-type=module', '-e', esm], blockPeers)
  runNode(['-e', cjs], blockPeers)
}

/** 用实际 peer 组合渲染常用组件，覆盖只有导入检查无法发现的运行时不兼容。 */
function checkRenderedConsumer() {
  const entries = [
    ['/C_Form', 'C_Form'],
    ['/C_Table', 'C_Table'],
    ['/C_Menu', 'C_Menu'],
    ['/C_Tree', 'C_Tree'],
    ['/C_OrgChart', 'C_OrgChart'],
    ['/C_UserPicker', 'C_UserPicker'],
    ['/config', 'COMPONENT_LOCALE_KEY'],
  ]
  const imports = entries
    .map(([subpath, name]) =>
      legacyPeers
        ? `const { ${name} } = require('${pkg.name}${subpath}');`
        : `import { ${name} } from '${pkg.name}${subpath}';`
    )
    .join('\n')
  runNode([
    '--input-type=module',
    '-e',
    `
    import assert from 'node:assert/strict';
    import { createRequire } from 'node:module';
    import { createSSRApp, h } from 'vue';
    import { renderToString } from 'vue/server-renderer';
    const require = createRequire(import.meta.url);
    ${imports}
    const naiveRequire = createRequire(require.resolve('naive-ui'));
    const { setup: setupCssrSsr } = naiveRequire('@css-render/vue3-ssr');
    const app = createSSRApp({ render: () => h('main', [
      h(C_Form, { modelValue: { name: 'Form Ada' }, options: [{ type: 'input', prop: 'name', label: 'Name' }] }, { action: ({ model }) => h('span', { 'data-consumer-form-model': 'true' }, model.name) }),
      h(C_Table, { data: [{ id: 1, name: 'Table Ada' }], columns: [{ key: 'name', title: 'Name' }] }),
      h(C_Menu, { options: [{ key: 0, label: 'Zero' }], modelValue: 0 }),
      h(C_Tree, { data: [{ code: 0, title: 'Tree Ada', kind: 'department' }], keyField: 'code', labelField: 'title', typeField: 'kind', mode: 'org', showToolbar: false }),
      h(C_OrgChart, { data: { code: 0, title: 'Org Ada', members: [{ code: 1, title: 'Org Child' }] }, keyField: 'code', labelField: 'title', childrenField: 'members', expandedKeys: [0], selectedKey: 0 }, { node: ({ node, key, isSelected }) => h('span', { 'data-org-key': String(key), 'data-org-selected': String(isSelected) }, node.title) }),
      h(C_UserPicker, { source: { rowKey: 'id', label: row => row.name, request: async () => ({ rows: [], total: 0 }) }, placeholder: 'People Ada' })
    ]) });
    const { collect } = setupCssrSsr(app);
    app.provide(COMPONENT_LOCALE_KEY, { locale: 'en-US' });
    const html = await renderToString(app);
    assert.ok(collect().length > 0, 'Naive UI SSR must collect component styles');
    assert.ok(html.includes('<span data-consumer-form-model="true">Form Ada</span>'), 'Form action slot must receive its model');
    assert.ok(html.includes('n-data-table') && html.includes('Table Ada'), 'Table must render its own record');
    assert.ok(html.includes('n-menu') && html.includes('Zero'), 'Menu must render numeric-key options');
    assert.ok(html.includes('c-tree') && html.includes('Tree Ada'), 'Tree must render mapped business fields');
    assert.ok(html.includes('Org Ada') && html.includes('Org Child'), 'OrgChart must preserve mapped nodes in recursive slots');
    assert.ok(html.includes('data-org-key="0" data-org-selected="true"'), 'OrgChart must preserve numeric zero selection');
    assert.ok(html.includes('c-user-picker') && html.includes('People Ada'), 'UserPicker trigger must render without opening a browser overlay');
  `,
  ])
}

/** 在没有独立 xlsx 包的真实消费者中，经公开接口解析 XLSX，覆盖两个发布格式。 */
function checkBundledSpreadsheet() {
  runNode([
    '--input-type=module',
    '-e',
    `
    import assert from 'node:assert/strict';
    import fs from 'node:fs';
    import { createRequire } from 'node:module';
    import { createSSRApp, h, ref } from 'vue';
    import { renderToString } from 'vue/server-renderer';
    const require = createRequire(import.meta.url);
    assert.throws(() => require.resolve('xlsx'), { code: 'MODULE_NOT_FOUND' });
    for (const format of ${JSON.stringify(runtimeFormats)}) {
      const { useFilePreview } = format === 'esm'
        ? await import('${pkg.name}/C_FilePreview')
        : require('${pkg.name}/C_FilePreview');
      const app = createSSRApp({ async setup() {
        const preview = useFilePreview({
          file: ref(new File([fs.readFileSync('spreadsheet.xlsx')], 'consumer.xlsx')),
          url: ref(), fileName: ref('consumer.xlsx')
        }, () => {});
        assert.equal(await preview.loadFile(), true, preview.error.value);
        const sheet = preview.excelSheets.value[0];
        assert.equal(sheet.name, 'Consumer');
        assert.equal(sheet.data[1].col_0.value, '001234567890123456789');
        assert.equal(sheet.data[1].col_1.displayValue, '1,234.50');
        return () => h('span', sheet.name);
      } });
      assert.ok((await renderToString(app)).includes('Consumer'));
    }
  `,
  ])
  console.log(
    `Bundled SheetJS: ${runtimeFormats.join('/').toUpperCase()} public XLSX parsing passed without an installed xlsx package.`
  )
}

/** Build public browser entries with the physically installed legacy peers, never repository aliases. */
async function checkLegacyBrowserBundle() {
  const { build } = await import('vite')
  const entries = new Set(
    [
      'C_Select',
      'C_AutoComplete',
      'C_DataPicker',
      'C_Form',
      'C_FormSearch',
      'C_Tree',
      'C_OrgChart',
      'C_UserPicker',
      'C_WorkFlow',
      'C_Table',
    ].map(name => `${pkg.name}/${name}`)
  )
  const resolvedEntries = new Set()
  const packageRoot = fs.realpathSync(installedPackage).replaceAll('\\', '/')
  const result = await build({
    root: consumer,
    configFile: false,
    logLevel: 'silent',
    plugins: [
      {
        name: 'packed-legacy-browser-entries',
        enforce: 'pre',
        async resolveId(specifier, importer) {
          if (!entries.has(specifier)) return
          const resolved = await this.resolve(specifier, importer, {
            skipSelf: true,
          })
          assert.ok(
            resolved && !resolved.external,
            `${specifier} must be bundled`
          )
          assert.ok(
            fs
              .realpathSync(resolved.id)
              .replaceAll('\\', '/')
              .startsWith(packageRoot + '/dist/'),
            `${specifier} must resolve to the unpacked tarball`
          )
          resolvedEntries.add(specifier)
          return resolved
        },
      },
    ],
    build: {
      target: 'es2022',
      outDir: path.join(consumer, 'browser-dist'),
      reportCompressedSize: false,
      rolldownOptions: {
        input: path.join(consumer, 'legacy-browser.mjs'),
        output: { format: 'es' },
      },
    },
  })
  const outputs = (Array.isArray(result) ? result : [result]).flatMap(
    output => output.output
  )
  const chunks = outputs.filter(output => output.type === 'chunk')
  const moduleIds = chunks
    .flatMap(chunk => Object.keys(chunk.modules))
    .map(id => id.replaceAll('\\', '/'))
  const naiveRoot = fs
    .realpathSync(path.join(modules, 'naive-ui'))
    .replaceAll('\\', '/')
  for (const entry of entries)
    assert.ok(
      resolvedEntries.has(entry),
      `${entry} must participate in the browser bundle`
    )
  assert.ok(
    moduleIds.some(id => id.startsWith(naiveRoot + '/es/')),
    'Browser bundle must use the independently installed Naive UI ESM modules'
  )
  assert.ok(
    chunks.some(chunk => chunk.isEntry),
    'Browser bundle must emit an executable entry'
  )
  const css = outputs
    .filter(
      output => output.type === 'asset' && output.fileName.endsWith('.css')
    )
    .map(output => String(output.source))
    .join('\n')
  for (const selector of [
    '.c-select',
    '.c-auto-complete',
    '.c-option-status',
    '.c-data-picker',
    '.c-tree',
    '.c-orgchart',
    '.c-user-picker',
    '.approval-workflow-container',
  ]) {
    assert.ok(
      css.includes(selector),
      `Published browser styles missing ${selector}`
    )
  }
  console.log(
    'Legacy peer Vite browser bundle passed: ten public component entries including UserPicker/WorkFlow and their CSS; browser interactions are not exercised by this build.'
  )
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

let passed = false
try {
  fs.mkdirSync(consumer, { recursive: true })
  fs.writeFileSync(
    path.join(consumer, 'package.json'),
    JSON.stringify({ private: true })
  )
  const packed = path.join(temporary, 'components.tgz')
  run('bun', ['pm', 'pack', '--ignore-scripts', '--filename', packed], root)

  // Reuse declared installed dependencies only. No registry resolution, install scripts,
  // repository tsconfig paths, or source files participate in this consumer project.
  const dependencies = new Set([
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.peerDependencies ?? {}),
  ])
  if (freshProfile) {
    fs.writeFileSync(
      path.join(consumer, 'package.json'),
      JSON.stringify(
        {
          private: true,
          dependencies: {
            [pkg.name]: `file:${packed}`,
            ...peerProfiles[freshProfile],
          },
          overrides: consumerOverrides,
        },
        null,
        2
      )
    )
    console.log(`Installing fresh ${freshProfile} consumer in ${consumer}`)
    console.log(
      'Consumer security overrides: lodash 4.18.1, minimist 1.2.8, markdown-it 14.3.3'
    )
    run(
      'bun',
      ['install', '--ignore-scripts', '--network-concurrency', '8'],
      consumer,
      {
        timeout: 300_000,
        stdio: 'inherit',
      }
    )
    const installedRequire = createRequire(path.join(consumer, 'package.json'))
    const versions = Object.keys(peerProfiles[freshProfile]).map(
      name => `${name}@${installedRequire(`${name}/package.json`).version}`
    )
    console.log(`Fresh ${freshProfile} peers: ${versions.join(', ')}`)
    if (legacyPeers)
      console.log(
        'Minimum profile: legacy peer bundle/types + CJS SSR; native Node ESM unsupported.'
      )
  } else {
    fs.mkdirSync(installedPackage, { recursive: true })
    run('tar', ['-xzf', packed, '-C', installedPackage, '--strip-components=1'])
    for (const name of dependencies) linkDependency(name)
  }
  for (const name of fs.readdirSync(fixtures)) {
    fs.copyFileSync(path.join(fixtures, name), path.join(consumer, name))
  }
  checkTypes(['consumer.mts', 'consumer.cts'])
  checkTypes(['workspace.mts', 'workspace.cts'])
  const blockedDataPeers = ['vue', 'naive-ui', ...optionalPeers]
  runNode(
    [
      '--input-type=module',
      '-e',
      `import {createNumberCodec} from '${pkg.name}/data'; if(createNumberCodec({storage:'decimal-string',fractionDigits:2}).format('1.005') !== '1.01') throw new Error('pure data entry failed');`,
    ],
    blockedDataPeers
  )
  runNode(
    [
      '-e',
      `const {createNumberCodec}=require('${pkg.name}/data'); if(createNumberCodec().parse(0) !== 0) throw new Error('pure CJS data entry failed');`,
    ],
    blockedDataPeers
  )
  checkBundledSpreadsheet()
  checkRuntime([
    ['', 'C_Form'],
    ['/resolver', 'RobotNaiveUiResolver'],
  ])
  if (freshProfile) checkRenderedConsumer()
  if (legacyPeers) await checkLegacyBrowserBundle()

  for (const peer of optionalPeers) {
    fs.rmSync(path.join(modules, ...peer.split('/')), {
      recursive: true,
      force: true,
    })
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
      ['/config', 'COMPONENT_LOCALE_KEY'],
      ['/config', 'COMPONENT_FEEDBACK_KEY'],
      ['/config', 'FORM_GLOBAL_CONFIG_KEY'],
    ],
    true
  )
  console.log(
    `Packed consumer contracts passed: ${runtimeFormats.join('/').toUpperCase()} component runtime, ESM/CJS declarations under Node16/NodeNext, and component subpaths without ${optionalPeers.join('/')}.`
  )
  console.log(
    freshProfile
      ? `Fresh ${freshProfile} registry installation passed. Consumer types use skipLibCheck; third-party declaration internals are outside this contract.`
      : 'Dependency versions reuse the local installation; fresh registry installation is not exercised. skipLibCheck validates consumer usage without fully checking third-party declaration internals.'
  )
  passed = true
} catch (error) {
  console.error(
    `Consumer verification failed; diagnostic files retained at ${temporary}`
  )
  const diagnostic = String(
    error.stderr || error.stdout || error.stack || error
  )
  fs.writeFileSync(path.join(temporary, 'failure.log'), diagnostic)
  console.error(
    diagnostic
      .split('\n')
      .slice(-18)
      .map(line =>
        line.length > 500
          ? `${line.slice(0, 500)}… [long line truncated]`
          : line
      )
      .join('\n')
  )
  process.exitCode = 1
} finally {
  if (passed) fs.rmSync(temporary, { recursive: true, force: true })
}
