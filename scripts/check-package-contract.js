import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
const failures = []

const requireCondition = (condition, message) => {
  if (!condition) failures.push(message)
}

requireCondition(pkg.packageManager === 'bun@1.3.14', 'packageManager must stay pinned')
requireCondition(pkg.engines?.node === '>=20.19.0', 'Node engine baseline changed')
requireCondition(pkg.engines?.bun === '>=1.3.14', 'Bun engine baseline changed')
requireCondition(!pkg.optionalDependencies, 'Use optional peer dependencies, not hidden installs')
requireCondition(pkg.scripts?.['check:audit'] === 'bun audit', 'Dependency audit gate is missing')
requireCondition(pkg.overrides?.tmp === '0.2.7', 'Secure tmp override changed')
requireCondition(
  Boolean(pkg.dependencies?.['@types/leaflet']),
  '@types/leaflet must remain a dependency because C_Map publishes Leaflet types'
)
requireCondition(
  fs.readFileSync(path.join(root, '.node-version'), 'utf8').trim() === '20.19.0',
  '.node-version must match the Node engine baseline'
)
const ciWorkflow = fs.readFileSync(
  path.join(root, '.github', 'workflows', 'ci.yml'),
  'utf8'
)
requireCondition(
  ciWorkflow.includes('node-version-file: .node-version') &&
    ciWorkflow.includes('bun-version: 1.3.14') &&
    ciWorkflow.includes('bun install --frozen-lockfile') &&
    ciWorkflow.includes('bun run check:audit'),
  'CI must use pinned Node/Bun, a frozen lockfile, and dependency auditing'
)

for (const peer of ['sortablejs', 'vue-router']) {
  requireCondition(Boolean(pkg.peerDependencies?.[peer]), `${peer} must be a peer`)
  requireCondition(
    pkg.peerDependenciesMeta?.[peer]?.optional === true,
    `${peer} must remain an optional peer`
  )
}

for (const staleDependency of [
  '@robot-admin/form-validate',
  '@tato30/vue-pdf',
  '@vueuse/core',
]) {
  requireCondition(
    !pkg.dependencies?.[staleDependency] && !pkg.devDependencies?.[staleDependency],
    `Unused dependency ${staleDependency} was reintroduced`
  )
}

for (const entry of [
  './C_Form/base.css',
  './C_Form/full.css',
  './C_Table/base.css',
  './C_Table/full.css',
]) {
  requireCondition(Boolean(pkg.exports?.[entry]), `Missing export ${entry}`)
}
requireCondition(
  pkg.exports?.['./C_Form/full.css'] === './dist/C_Form.css' &&
    pkg.exports?.['./C_Table/full.css'] === './dist/C_Table.css',
  'Full style aliases must reuse compatible CSS files instead of duplicating them'
)
requireCondition(
  pkg.files?.includes('SECURITY.md') && pkg.files?.includes('README_EN.md'),
  'SECURITY.md and README_EN.md must be included in the published package'
)

const sourceFiles = []
const collectSourceFiles = directory => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name)
    if (entry.isDirectory()) collectSourceFiles(filename)
    else if (/\.(?:ts|vue)$/.test(entry.name)) sourceFiles.push(filename)
  }
}
collectSourceFiles(path.join(root, 'src'))

const internalNaiveImports = sourceFiles.filter(filename =>
  fs.readFileSync(filename, 'utf8').includes('naive-ui/es')
)
requireCondition(
  internalNaiveImports.length === 0,
  `Naive UI internal imports are forbidden:\n${internalNaiveImports.join('\n')}`
)

const pluginConsoleCalls = fs
  .readdirSync(path.join(root, 'src', 'plugins'))
  .filter(filename => filename.endsWith('.ts'))
  .filter(filename =>
    /console\.(?:log|warn|error|debug)\s*\(/.test(
      fs.readFileSync(path.join(root, 'src', 'plugins', filename), 'utf8')
    )
  )
requireCondition(
  pluginConsoleCalls.length === 0,
  `Plugins must use opt-in loggers: ${pluginConsoleCalls.join(', ')}`
)

const lockfile = fs.readFileSync(path.join(root, 'bun.lock'), 'utf8')
requireCondition(
  lockfile.includes(`"name": "${pkg.name}"`),
  'Lockfile workspace name must match package.json'
)
for (const vulnerableResolution of [
  'brace-expansion@1.1.12',
  'picomatch@2.3.1',
  'picomatch@4.0.3',
  'js-yaml@3.14.2',
  'js-yaml@4.1.1',
  'tmp@0.0.33',
]) {
  requireCondition(
    !lockfile.includes(vulnerableResolution),
    `Vulnerable lockfile resolution was reintroduced: ${vulnerableResolution}`
  )
}

if (failures.length > 0) {
  console.error(`Package contract check failed:\n${failures.join('\n')}`)
  process.exit(1)
}

console.log('Package metadata, dependency boundaries, and source contracts are valid.')
