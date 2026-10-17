import { hasInjectionContext, inject, type App } from 'vue'
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
  /** Explicit compatibility bridge; restored when the owning app unmounts. */
  exposeToWindow?: boolean
  /** Enable lifecycle diagnostics through the supplied logger. */
  debug?: boolean
  logger?: Pick<Console, 'info' | 'warn' | 'error'>
  onError?: (
    error: unknown,
    context: { source: 'language-loader'; language: string }
  ) => void
}

export interface HighlightAPI {
  getHljs: () => HLJSApi
  loadLanguage: (language: string) => Promise<boolean>
  loadLanguages: (languages: string[]) => Promise<string[]>
  getLoadedLanguages: () => string[]
}

interface HighlightState {
  instance: HLJSApi
  loadedLanguages: Set<string>
  pendingLanguageLoads: Map<string, Promise<boolean>>
}

/**
 * * @description 注册语言包到 highlight.js 实例
 * ? @param name - 语言名称
 * ? @param languageFn - 语言定义函数
 * ! @return void
 */
function registerLanguage(
  state: HighlightState,
  name: string,
  languageFn: LanguageFn
): void {
  state.instance.registerLanguage(name, languageFn)
  state.loadedLanguages.add(name)
}

/**
 * * @description 初始化核心配置，注册默认语言包
 * ? @param options - 插件配置选项
 * ! @return void
 */
function initializeCore(
  state: HighlightState,
  options: HighlightPluginOptions
): void {
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
    registerLanguage(state, name, langFn)
  })

  // 配置 highlight.js
  state.instance.configure({
    ignoreUnescapedHTML: true,
    languages: options.autoDetect ? undefined : [],
  })

  // 预加载额外语言
  if (options.extraLanguages?.length) {
    void loadLanguages(state, options.extraLanguages, options)
  }
}

/**
 * * @description 批量加载多个语言包
 * ? @param languages - 要加载的语言名称数组
 * ! @return Promise<string[]> 成功加载的语言名称数组
 */
async function loadLanguages(
  state: HighlightState,
  languages: string[],
  options: HighlightPluginOptions = {}
): Promise<string[]> {
  const loadPromises = languages.map(lang => loadLanguage(state, lang, options))
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
  state: HighlightState,
  language: string,
  options: HighlightPluginOptions = {}
): Promise<boolean> {
  const normalizedLanguage = language.toLowerCase()
  if (state.loadedLanguages.has(normalizedLanguage)) {
    return true
  }

  const pendingLoad = state.pendingLanguageLoads.get(normalizedLanguage)
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
      registerLanguage(state, normalizedLanguage, languageModule.default)
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
      state.pendingLanguageLoads.delete(normalizedLanguage)
    }
  })()
  state.pendingLanguageLoads.set(normalizedLanguage, request)
  return request
}

/** Create an independent highlighter, including its language registry and loaders. */
export function createHighlight(
  options: HighlightPluginOptions = {}
): HighlightAPI {
  const state: HighlightState = {
    instance: hljs.newInstance(),
    loadedLanguages: new Set(),
    pendingLanguageLoads: new Map(),
  }
  initializeCore(state, options)

  return {
    getHljs: () => state.instance,
    loadLanguage: language => loadLanguage(state, language, options),
    loadLanguages: languages => loadLanguages(state, languages, options),
    getLoadedLanguages: () => Array.from(state.loadedLanguages),
  }
}

/** Reuse the current app's highlighter or create a standalone, isolated one. */
export function useHighlight(
  options: HighlightPluginOptions = {}
): HighlightAPI {
  const provided = hasInjectionContext()
    ? inject<HighlightAPI | undefined>('highlightManager', undefined)
    : undefined
  return provided ?? createHighlight(options)
}

interface WindowHighlightExposure {
  instance: HLJSApi
  previousDescriptor?: PropertyDescriptor
  previousExposure?: WindowHighlightExposure
  active: boolean
}

// Only explicit legacy window bridges share ownership bookkeeping.
const windowExposures = new WeakMap<Window, WindowHighlightExposure>()

/** Restore the nearest active owner without overwriting a host's later assignment. */
function releaseWindowExposure(
  target: Window,
  exposure: WindowHighlightExposure
): void {
  exposure.active = false
  if (
    Object.getOwnPropertyDescriptor(target, 'hljs')?.value !== exposure.instance
  ) {
    if (windowExposures.get(target) === exposure) windowExposures.delete(target)
    return
  }

  let descriptor = exposure.previousDescriptor
  let previous = exposure.previousExposure
  while (previous && !previous.active) {
    descriptor = previous.previousDescriptor
    previous = previous.previousExposure
  }
  if (descriptor) Reflect.defineProperty(target, 'hljs', descriptor)
  else Reflect.deleteProperty(target, 'hljs')
  if (previous) windowExposures.set(target, previous)
  else windowExposures.delete(target)
}

/** Opt into the legacy window bridge and return its ownership-aware cleanup. */
function exposeHighlightToWindow(instance: HLJSApi): (() => void) | undefined {
  if (typeof window === 'undefined') return undefined
  const target = window
  const previousDescriptor = Object.getOwnPropertyDescriptor(target, 'hljs')
  const previous = windowExposures.get(target)
  const exposure: WindowHighlightExposure = {
    instance,
    previousDescriptor,
    previousExposure:
      previous?.instance === previousDescriptor?.value ? previous : undefined,
    active: true,
  }
  const exposed = Reflect.defineProperty(target, 'hljs', {
    configurable: true,
    enumerable: previousDescriptor?.enumerable ?? false,
    writable: true,
    value: instance,
  })
  if (!exposed) return undefined
  windowExposures.set(target, exposure)
  return () => releaseWindowExposure(target, exposure)
}

interface AppHighlightInstallation {
  api: HighlightAPI
  previousProperty?: PropertyDescriptor
  releaseWindow?: () => void
}

const appInstallations = new WeakMap<App, AppHighlightInstallation>()

/** Preserve the host descriptor across app reconfiguration while replacing our own API. */
function installAppHighlightProperty(
  app: App,
  api: HighlightAPI,
  previous?: AppHighlightInstallation
): PropertyDescriptor | undefined {
  const properties = app.config.globalProperties
  const descriptor = Object.getOwnPropertyDescriptor(properties, '$highlight')
  const previousProperty =
    previous && descriptor?.value === previous.api
      ? previous.previousProperty
      : descriptor
  Object.defineProperty(properties, '$highlight', {
    configurable: descriptor?.configurable ?? true,
    enumerable: descriptor?.enumerable ?? true,
    writable: true,
    value: api,
  })
  return previousProperty
}

/** Clean up the latest installation once, including after repeated app configuration. */
function releaseAppHighlight(app: App): void {
  const installation = appInstallations.get(app)
  if (!installation) return
  appInstallations.delete(app)
  installation.releaseWindow?.()

  const properties = app.config.globalProperties
  if (
    Object.getOwnPropertyDescriptor(properties, '$highlight')?.value !==
    installation.api
  ) {
    return
  }
  if (installation.previousProperty) {
    Reflect.defineProperty(
      properties,
      '$highlight',
      installation.previousProperty
    )
  } else Reflect.deleteProperty(properties, '$highlight')
}

/**
 * * @description 安装 highlight.js 插件到 Vue 应用
 * ? @param app - Vue 应用实例
 * ? @param options - 插件配置选项
 * ! @return 应用独立的 highlight API
 */
export function setupHighlight(
  app: App,
  options: HighlightPluginOptions = {}
): HighlightAPI {
  const pluginOptions: HighlightPluginOptions = {
    autoDetect: false,
    extraLanguages: [],
    ...options,
  }
  // 提供给 Vue 应用
  const highlightAPI = createHighlight(pluginOptions)
  const previous = appInstallations.get(app)
  const previousProperty = installAppHighlightProperty(
    app,
    highlightAPI,
    previous
  )
  previous?.releaseWindow?.()
  app.provide('highlightManager', highlightAPI)
  const releaseWindow = pluginOptions.exposeToWindow
    ? exposeHighlightToWindow(highlightAPI.getHljs())
    : undefined
  appInstallations.set(app, {
    api: highlightAPI,
    previousProperty,
    releaseWindow,
  })
  if (!previous) app.onUnmount(() => releaseAppHighlight(app))

  if (pluginOptions.debug) {
    pluginOptions.logger?.info(
      '[HighlightPlugin] highlight.js plugin installed'
    )
  }
  return highlightAPI
}

// 导出默认配置
export const defaultHighlightOptions: HighlightPluginOptions = {
  autoDetect: false,
  extraLanguages: [],
  exposeToWindow: false,
  debug: false,
}
