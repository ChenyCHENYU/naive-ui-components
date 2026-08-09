import { describe, expect, test } from 'bun:test'
import { createMenuOptions } from '../src/components/_shared'

const menuEntryPath = new URL(
  '../src/components/C_Menu/index.ts',
  import.meta.url
)

describe('C_Menu subpath entry', () => {
  test('菜单工具由组件子路径公开导出', async () => {
    const entry = await Bun.file(menuEntryPath).text()
    expect(entry).toContain('createMenuOptions')
    expect(entry).toContain("from '../_shared'")
  })

  test('内部共享目录不作为独立公共入口', async () => {
    const config = await Bun.file(
      new URL('../tsdown.config.ts', import.meta.url)
    ).text()
    expect(config).toContain("if (dir.startsWith('_')) continue")
  })

  test('菜单适配器保持可独立使用', () => {
    const options = createMenuOptions([
      { path: '/dashboard', meta: { title: 'Dashboard' } },
    ])

    expect(options).toHaveLength(1)
    expect(options[0]?.key).toBe('/dashboard')
    expect(options[0]?.label).toBe('Dashboard')
  })
})
