
declare module 'highlight.js' {
  // 如果需要扩展 highlight.js 的类型
}

export interface HighlightConfig {
  autoDetect: boolean
  extraLanguages: string[]
  theme?: string
}