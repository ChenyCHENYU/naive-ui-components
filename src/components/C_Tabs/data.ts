import type { TabsItem, TabsValue } from './types'

/**
 * 提供轻量的运行时校验并保持调用侧扁平；返回原数组，不复制、不注入隐藏字段。
 */
export function defineTabs<const T extends readonly TabsItem[]>(items: T): T {
  const keys = new Set<TabsValue>()
  for (const item of items) {
    if (typeof item.key !== 'string' && typeof item.key !== 'number') {
      throw new TypeError('C_Tabs 的 item.key 必须是字符串或数字')
    }
    if (typeof item.key === 'string' && item.key.trim().length === 0) {
      throw new TypeError('C_Tabs 的 item.key 不能为空')
    }
    if (keys.has(item.key)) {
      throw new RangeError(`C_Tabs 存在重复 key: ${String(item.key)}`)
    }
    if (typeof item.label !== 'string' || item.label.trim().length === 0) {
      throw new TypeError(`C_Tabs 的 ${String(item.key)} 缺少有效 label`)
    }
    keys.add(item.key)
  }
  return items
}
