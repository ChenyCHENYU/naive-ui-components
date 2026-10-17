import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import { build } from 'vite'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const cases = [
  {
    name: 'C_Form/base',
    component: 'C_Form',
    css: 'C_Form.base.css',
    props:
      "{ modelValue: { name: '' }, options: [{ type: 'input', prop: 'name', label: 'Name' }] }",
    budget: 200 * 1024,
    lazyFields: true,
  },
  {
    name: 'C_Table/base',
    component: 'C_Table',
    css: 'C_Table.base.css',
    props:
      "{ data: [{ id: 1, name: 'A' }], columns: [{ key: 'name', title: 'Name' }] }",
    budget: 250 * 1024,
    lazyFields: true,
  },
  {
    name: 'C_FormSearch',
    component: 'C_FormSearch',
    css: 'C_FormSearch.css',
    props:
      "{ formParams: { name: '' }, formItemList: [{ type: 'input', prop: 'name', label: 'Name' }] }",
    budget: 165 * 1024,
  },
  {
    name: 'C_ActionBar',
    component: 'C_ActionBar',
    css: 'C_ActionBar.css',
    props: "{ actions: [{ key: 'save', label: 'Save', onClick: () => {} }] }",
    budget: 95 * 1024,
  },
]

// Inspect actual emitted static imports. Dynamic chunks are deliberately excluded
// from the initial graph, but still built so invalid lazy imports fail this check.
const forbiddenInitial =
  /(?:node_modules\/(?:@wangeditor[^/]*|@wangeditor-next|xlsx|html2canvas|print-js|mammoth)\/|\/C_Editor\d*\.(?:js|vue)$)/
const deferredNaiveFields =
  /\/naive-ui\/(?:es|lib)\/(?:date-picker|time-picker|slider|rate|cascader|color-picker|upload)\//
const failures = []
for (const scenario of cases) {
  const entry = `virtual:consumer-size-${scenario.component}`
  const componentPath = path.join(root, 'dist', `${scenario.component}.js`)
  const cssPath = path.join(root, 'dist', scenario.css)
  const source = `import { createApp, h } from 'vue';
    import { ${scenario.component} } from ${JSON.stringify(componentPath)};
    import ${JSON.stringify(cssPath)};
    createApp({ render: () => h(${scenario.component}, ${scenario.props}) }).mount('#app');`
  const result = await build({
    root,
    configFile: false,
    logLevel: 'silent',
    plugins: [
      {
        name: 'consumer-size-entry',
        resolveId: id => (id === entry ? `\0${entry}` : undefined),
        load: id => (id === `\0${entry}` ? source : undefined),
      },
    ],
    build: {
      target: 'es2022',
      write: false,
      emptyOutDir: false,
      reportCompressedSize: false,
      rolldownOptions: { input: entry, output: { format: 'es' } },
    },
  })
  const outputs = (Array.isArray(result) ? result : [result]).flatMap(
    output => output.output
  )
  const chunks = outputs.filter(output => output.type === 'chunk')
  const byName = new Map(chunks.map(chunk => [chunk.fileName, chunk]))
  const initial = new Set()
  const visit = filename => {
    const chunk = byName.get(filename)
    if (!chunk || initial.has(filename)) return
    initial.add(filename)
    chunk.imports.forEach(visit)
  }
  chunks.filter(chunk => chunk.isEntry).forEach(chunk => visit(chunk.fileName))
  const initialChunks = chunks.filter(chunk => initial.has(chunk.fileName))
  const gzipBytes = initialChunks.reduce(
    (sum, chunk) => sum + gzipSync(chunk.code).length,
    0
  )
  const eagerHeavyModules = initialChunks
    .flatMap(chunk => Object.keys(chunk.modules))
    .map(filename => filename.replaceAll('\\', '/'))
    .filter(
      filename =>
        forbiddenInitial.test(filename) ||
        (scenario.lazyFields && deferredNaiveFields.test(filename))
    )
  if (gzipBytes > scenario.budget) {
    failures.push(`${scenario.name}: initial JS exceeds budget`)
  }
  if (eagerHeavyModules.length) {
    failures.push(
      `${scenario.name}: eager heavy dependencies: ${eagerHeavyModules.join(', ')}`
    )
  }
  console.log(
    `${scenario.name}: initial JS gzip ${(gzipBytes / 1024).toFixed(1)} KiB / ${(scenario.budget / 1024).toFixed(0)} KiB; ${chunks.length - initial.size} deferred chunks`
  )
}
if (failures.length) {
  console.error(`Consumer size budget failed:\n${failures.join('\n')}`)
  process.exit(1)
}
console.log('Consumer size budget passed (Vue and Naive UI included).')
