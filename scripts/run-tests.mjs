import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

function collectTestFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return collectTestFiles(path)
    return entry.name.endsWith('.test.ts') ? [path] : []
  })
}

const testFiles = collectTestFiles('tests').sort()
if (testFiles.length === 0) {
  console.error('No test files found.')
  process.exit(1)
}

for (const testFile of testFiles) {
  const result = spawnSync('bun', ['test', testFile], {
    stdio: 'inherit',
    shell: false,
  })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

console.log(
  `\nAll ${testFiles.length} test files passed in isolated processes.`
)
