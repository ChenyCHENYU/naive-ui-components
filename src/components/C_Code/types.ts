/** 组件输入的单一类型来源，可直接用于共享配置。 */
export interface CodeProps {
  code: string
  language?: string
  title?: string
  showHeader?: boolean
  showLineNumbers?: boolean
  wordWrap?: boolean
  trim?: boolean
  showFullscreen?: boolean
  maxHeight?: string | number
  autoLoadLanguage?: boolean
}
