import { describe, expect, test } from 'bun:test'
import {
  createSSRApp,
  defineComponent,
  h,
  inject,
  provide,
  type App,
} from 'vue'
import { renderToString } from '@vue/server-renderer'
import { DICTIONARY_PROVIDER_KEY } from '../src/context'
import type { DictionaryProvider } from '../src/core/dictionary'

// 模拟独立包或另一个构建副本：不导入 NUI 的 key，也不在进程全局保存数据源。
const externalToken = () => Symbol.for('@robot-admin/dictionary/provider/v1')
const source = (label: string): DictionaryProvider => ({
  getDictionary: () => ({ getOptions: () => [{ value: '1', label }] }),
})
const externalPlugin = (provider: DictionaryProvider) => ({
  install(app: App) {
    app.provide(externalToken(), provider)
  },
})
const Consumer = defineComponent({
  setup() {
    const provider = inject(DICTIONARY_PROVIDER_KEY)
    return () =>
      h('span', provider?.getDictionary('status')?.getOptions()[0]?.label)
  },
})

describe('跨包只读字典注入协议', () => {
  test('独立插件的同协议 token 可被组件消费，SSR 应用并发保持隔离', async () => {
    const first = createSSRApp(Consumer).use(externalPlugin(source('应用甲')))
    const second = createSSRApp(Consumer).use(externalPlugin(source('应用乙')))
    expect(
      await Promise.all([renderToString(first), renderToString(second)])
    ).toEqual(['<span>应用甲</span>', '<span>应用乙</span>'])
  })

  test('本层公开 key 覆盖和独立副本 token 双向互通，不改变兄弟区域', async () => {
    const ExternalConsumer = defineComponent({
      setup() {
        const provider = inject<DictionaryProvider>(externalToken())
        return () =>
          h('span', provider?.getDictionary('status')?.getOptions()[0]?.label)
      },
    })
    const Local = defineComponent({
      setup() {
        // 既有 provide 写法不变；独立包消费者也应读到最近的同一个来源。
        provide(DICTIONARY_PROVIDER_KEY, source('页面覆盖'))
        return () => h('section', [h(Consumer), h(ExternalConsumer)])
      },
    })
    const Root = defineComponent({
      setup: () => () =>
        h('main', [h(Consumer), h(Local), h(ExternalConsumer)]),
    })
    const app = createSSRApp(Root).use(externalPlugin(source('应用默认')))
    expect(await renderToString(app)).toBe(
      '<main><span>应用默认</span><section><span>页面覆盖</span><span>页面覆盖</span></section><span>应用默认</span></main>'
    )
  })

  test('未安装独立 SDK 时，既有应用 provide 仍直接可用', async () => {
    const app = createSSRApp(Consumer)
    app.provide(DICTIONARY_PROVIDER_KEY, source('自有数据源'))
    expect(await renderToString(app)).toBe('<span>自有数据源</span>')
  })
})
