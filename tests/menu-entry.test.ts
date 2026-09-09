import { describe, expect, test } from 'bun:test'
import { createMenuOptions } from '../src/components/_shared/public'

const menuEntryPath = new URL(
  '../src/components/C_Menu/index.ts',
  import.meta.url
)

describe('C_Menu subpath entry', () => {
  test('菜单工具由组件子路径公开导出', async () => {
    const entry = await Bun.file(menuEntryPath).text()
    expect(entry).toContain('createMenuOptions')
    expect(entry).toContain("from '../_shared/public'")
  })

  test('内部共享目录不在包导出映射中公开', async () => {
    const packageJson = await Bun.file(
      new URL('../package.json', import.meta.url)
    ).json()
    expect(packageJson.exports['./_*']).toBeUndefined()
  })

  test('菜单适配器保持可独立使用', () => {
    const options = createMenuOptions([
      { path: '/dashboard', meta: { title: 'Dashboard' } },
    ])

    expect(options).toHaveLength(1)
    expect(options[0]?.key).toBe('/dashboard')
    expect(options[0]?.label).toBe('Dashboard')
  })

  test('菜单叶子节点暴露无副作用的导航意图事件', async () => {
    const component = await Bun.file(
      new URL('../src/components/C_Menu/index.vue', import.meta.url)
    ).text()
    const types = await Bun.file(
      new URL('../src/components/C_Menu/types.ts', import.meta.url)
    ).text()

    expect(component).toContain(':node-props="getNodeProps"')
    expect(component).toContain("emit('intent', option.key)")
    expect(types).toContain('intent: [key: string]')
  })
})
