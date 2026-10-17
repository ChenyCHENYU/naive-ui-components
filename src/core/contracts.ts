/** UI-independent feedback and locale protocols. No framework runtime is imported here. */

export interface ConfirmOptions {
  title: string
  content: string
  positiveText?: string
  negativeText?: string
  type?: 'warning' | 'error' | 'info' | 'success'
}

export interface ComponentFeedback {
  success?: (message: string) => void
  error?: (message: string, cause?: unknown) => void
  warning?: (message: string) => void
  info?: (message: string) => void
  confirm?: (options: ConfirmOptions) => boolean | Promise<boolean>
}

export type ComponentLocaleName = 'zh-CN' | 'en-US'

export interface ComponentLocale {
  locale?: ComponentLocaleName
  messages?: Record<string, string>
  t?: (key: string, params?: Record<string, string | number>) => string
}
