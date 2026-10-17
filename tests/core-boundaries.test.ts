import { describe, expect, test } from 'bun:test'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { translateComponentMessage } from '../src/core'

const coreRoot = fileURLToPath(new URL('../src/core', import.meta.url))
const forbiddenGlobals = new Set([
  'window',
  'document',
  'globalThis',
  'localStorage',
  'sessionStorage',
  'process',
  'console',
])

function getCoreFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const filename = join(directory, entry.name)
    return entry.isDirectory()
      ? getCoreFiles(filename)
      : entry.name.endsWith('.ts')
        ? [filename]
        : []
  })
}

function checkImport(filename: string, specifier: string): void {
  expect(specifier.startsWith('.')).toBe(true)
  const target = resolve(dirname(filename), specifier)
  expect(target.startsWith(`${coreRoot}${sep}`)).toBe(true)
}

function checkStaticImport(filename: string, node: ts.Node): void {
  if (
    (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
    node.moduleSpecifier &&
    ts.isStringLiteral(node.moduleSpecifier)
  ) {
    checkImport(filename, node.moduleSpecifier.text)
  }
}

function checkDynamicImport(filename: string, node: ts.Node): void {
  if (!ts.isCallExpression(node)) return
  const dynamic =
    node.expression.kind === ts.SyntaxKind.ImportKeyword ||
    (ts.isIdentifier(node.expression) && node.expression.text === 'require')
  if (!dynamic) return
  const specifier = node.arguments[0]
  expect(specifier && ts.isStringLiteral(specifier)).toBe(true)
  if (specifier && ts.isStringLiteral(specifier)) {
    checkImport(filename, specifier.text)
  }
}

function checkNode(filename: string, node: ts.Node): void {
  checkStaticImport(filename, node)
  checkDynamicImport(filename, node)
  if (ts.isIdentifier(node)) {
    expect(forbiddenGlobals.has(node.text)).toBe(false)
  }
  ts.forEachChild(node, child => checkNode(filename, child))
}

describe('UI-independent foundation', () => {
  test('all core modules stay dependency-free and avoid ambient runtime state', () => {
    for (const filename of getCoreFiles(coreRoot)) {
      const source = ts.createSourceFile(
        filename,
        readFileSync(filename, 'utf8'),
        ts.ScriptTarget.Latest,
        true
      )
      checkNode(filename, source)
    }
  })

  test('locale resolution preserves local, application and built-in precedence', () => {
    const application = {
      locale: 'en-US' as const,
      messages: { 'common.save': 'Store', 'shared.count': '{count} items' },
    }
    const local = { messages: { 'common.save': 'Save locally' } }
    expect(translateComponentMessage('common.save', local, application)).toBe(
      'Save locally'
    )
    expect(translateComponentMessage('common.cancel', local, application)).toBe(
      'Cancel'
    )
    expect(
      translateComponentMessage('shared.count', local, application, {
        count: 0,
      })
    ).toBe('0 items')
    expect(translateComponentMessage('missing', local, application)).toBe(
      'missing'
    )
    expect(application.messages['common.save']).toBe('Store')
    expect(translateComponentMessage('common.save')).toBe('保存')
  })

  test('custom translators override dictionaries without altering other instances', () => {
    expect(
      translateComponentMessage(
        'field',
        { t: key => `local:${key}` },
        { t: key => `app:${key}` }
      )
    ).toBe('local:field')
    expect(
      translateComponentMessage('field', {}, { t: key => `app:${key}` })
    ).toBe('app:field')
    expect(translateComponentMessage('field')).toBe('field')
  })

  test('prototype names are ordinary missing keys and inherited messages are ignored', () => {
    const messages = Object.create({ inherited: 'unexpected' }) as Record<
      string,
      string
    >
    for (const key of ['toString', 'constructor', '__proto__', 'inherited']) {
      expect(translateComponentMessage(key, { messages })).toBe(key)
    }
  })
})
