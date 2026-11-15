/** 组件输入的单一类型来源，可直接用于共享配置。 */
export interface MarkdownProps {
  modelValue?: string
  /** SSR 或同页多实例时建议显式传入稳定 ID */
  editorId?: string
  height?: string | number
  disabled?: boolean
  placeholder?: string
  mode?: 'edit' | 'editable' | 'preview'
  toolbar?: object | Array<string | number>
  uploadImageConfig?: {
    accept?: string
    multiple?: boolean
    [key: string]: unknown
  }
  tocNavPosition?: 'left' | 'right'
  defaultFullscreen?: boolean
  autofocus?: boolean
  includeLevel?: number[]
  leftToolbar?: string
  rightToolbar?: string
  maxLength?: number
  showWordCount?: boolean
  autoSave?: boolean
  autoSaveInterval?: number
  /** 是否为暗色主题（外部传入） */
  isDark?: boolean
}
