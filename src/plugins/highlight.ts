import type { App } from 'vue'
import type { HLJSApi, LanguageFn } from 'highlight.js'
import hljs from 'highlight.js/lib/core'

// 默认支持的语言包（常用语言预加载）
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import json from 'highlight.js/lib/languages/json'
import xml from 'highlight.js/lib/languages/xml' // HTML
import css from 'highlight.js/lib/languages/css'
import bash from 'highlight.js/lib/languages/bash'
import yaml from 'highlight.js/lib/languages/yaml'
import markdown from 'highlight.js/lib/languages/markdown'
import java from 'highlight.js/lib/languages/java'
import csharp from 'highlight.js/lib/languages/csharp'
import go from 'highlight.js/lib/languages/go'
import python from 'highlight.js/lib/languages/python'

// 可选语言包映射（懒加载）
const OPTIONAL_LANGUAGES: Record<
  string,
  () => Promise<{ default: LanguageFn }>
> = {
  cpp: () => import('highlight.js/lib/languages/cpp'),
  c: () => import('highlight.js/lib/languages/c'),
  php: () => import('highlight.js/lib/languages/php'),
  ruby: () => import('highlight.js/lib/languages/ruby'),
  rust: () => import('highlight.js/lib/languages/rust'),
  swift: () => import('highlight.js/lib/languages/swift'),
  kotlin: () => import('highlight.js/lib/languages/kotlin'),
  scss: () => import('highlight.js/lib/languages/scss'),
  less: () => import('highlight.js/lib/languages/less'),
  sql: () => import('highlight.js/lib/languages/sql'),
  dockerfile: () => import('highlight.js/lib/languages/dockerfile'),
  powershell: () => import('highlight.js/lib/languages/powershell'),
}

// 插件配置选项
export interface HighlightPluginOptions {
  autoDetect?: boolean
  extraLanguages?: string[]
  /** Enable lifecycle diagnostics through the supplied logger. */
  debug?: boolean
  logger?: Pick<Console, 'info' | 'warn' | 'error'>
  onError?: (
    error: unknown,
    context: { source: 'language-loader'; language: string }
  ) => void
}

// 状态管理
const loadedLanguages = new Set<string>()
const pendingLanguageLoads = new Map<string, Promise<boolean>>()
const hlJsInstance: HLJSApi = hljs

/**
 * * @description 注册语言包到 highlight.js 实例
 * ? @param name - 语言名称
 * ? @param languageFn - 语言定义函数
 * ! @return void
 */
function registerLanguage(name: string, languageFn: LanguageFn): void {
  hlJsInstance.registerLanguage(name, languageFn)
  loadedLanguages.add(name)
}

/**
 * * @description 初始化核心配置，注册默认语言包
 * ? @param options - 插件配置选项
 * ! @return void
 */
function initializeCore(options: HighlightPluginOptions): void {
  // 注册默认语言包
  const defaultLanguages = [
    ['javascript', javascript],
    ['typescript', typescript],
    ['json', json],
    ['html', xml],
    ['xml', xml],
    ['css', css],
    ['bash', bash],
    ['shell', bash],
    ['yaml', yaml],
    ['yml', yaml],
    ['markdown', markdown],
    ['java', java],
    ['csharp', csharp],
    ['go', go],
    ['python', python],
  ] as const

  defaultLanguages.forEach(([name, langFn]) => {
    registerLanguage(name, langFn)
  })

  // 配置 highlight.js
  hlJsInstance.configure({
    ignoreUnescapedHTML: true,
    languages: options.autoDetect ? undefined : [],
  })

  // 预加载额外语言
  if (options.extraLanguages?.length) {
    void loadLanguages(options.extraLanguages, options)
  }
}

/**
 * * @description 批量加载多个语言包
 * ? @param languages - 要加载的语言名称数组
 * ! @return Promise<string[]> 成功加载的语言名称数组
 */
async function loadLanguages(
  languages: string[],
  options: HighlightPluginOptions = {}
): Promise<string[]> {
  const loadPromises = languages.map(lang => loadLanguage(lang, options))
  const results = await Promise.allSettled(loadPromises)

  return results
    .map((result, index) =>
      result.status === 'fulfilled' && result.value ? languages[index] : null
    )
    .filter(Boolean) as string[]
}

/**
 * * @description 动态加载单个语言包
 * ? @param language - 要加载的语言名称
 * ! @return Promise<boolean> 是否加载成功
 */
async function loadLanguage(
  language: string,
  options: HighlightPluginOptions = {}
): Promise<boolean> {
  const normalizedLanguage = language.toLowerCase()
  if (loadedLanguages.has(normalizedLanguage)) {
    return true
  }

  const pendingLoad = pendingLanguageLoads.get(normalizedLanguage)
  if (pendingLoad) return pendingLoad

  const loader = OPTIONAL_LANGUAGES[normalizedLanguage]
  if (!loader) {
    options.logger?.warn(
      `[HighlightPlugin] Language '${language}' not supported`
    )
    return false
  }

  const request = (async () => {
    try {
      const languageModule = await loader()
      registerLanguage(normalizedLanguage, languageModule.default)
      if (options.debug) {
        options.logger?.info(
          `[HighlightPlugin] Language '${normalizedLanguage}' loaded successfully`
        )
      }
      return true
    } catch (error) {
      options.logger?.error(
        `[HighlightPlugin] Failed to load language '${normalizedLanguage}'`,
        error
      )
      options.onError?.(error, {
        source: 'language-loader',
        language: normalizedLanguage,
      })
      return false
    } finally {
      pendingLanguageLoads.delete(normalizedLanguage)
    }
  })()
  pendingLanguageLoads.set(normalizedLanguage, request)
  return request
}

/**
 * * @description 获取 highlight 功能的 API 接口
 * ! @return highlight API 对象，包含所有可用方法
 */
export const useHighlight = (options: HighlightPluginOptions = {}) => {
  return {
    // 核心方法
    getHljs: () => hlJsInstance,

    // 语言管理
    loadLanguage: (language: string) => loadLanguage(language, options),
    loadLanguages: (languages: string[]) => loadLanguages(languages, options),
    getLoadedLanguages: () => Array.from(loadedLanguages),
  }
}

/**
 * * @description 安装 highlight.js 插件到 Vue 应用
 * ? @param app - Vue 应用实例
 * ? @param options - 插件配置选项
 * ! @return void
 */
export function setupHighlight(app: App, options: HighlightPluginOptions = {}) {
  const pluginOptions: HighlightPluginOptions = {
    autoDetect: false,
    extraLanguages: [],
    ...options,
  }
  // 初始化核心配置
  initializeCore(pluginOptions)

  // 挂载到全局
  if (typeof window !== 'undefined') {
    window.hljs = hlJsInstance
  }

  // 提供给 Vue 应用
  const highlightAPI = useHighlight(pluginOptions)
  app.provide('highlightManager', highlightAPI)
  app.config.globalProperties.$highlight = highlightAPI

  if (pluginOptions.debug) {
    pluginOptions.logger?.info(
      '[HighlightPlugin] highlight.js plugin installed'
    )
  }
}

// 导出默认配置
export const defaultHighlightOptions: HighlightPluginOptions = {
  autoDetect: false,
  extraLanguages: [],
  debug: false,
}

// 类型声明
declare global {
  interface Window {
    hljs: HLJSApi
  }
}
