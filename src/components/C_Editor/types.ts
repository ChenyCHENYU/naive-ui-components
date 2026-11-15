/** 组件输入的单一类型来源，可直接用于共享配置。 */
export interface EditorProps {
  editorId?: string
  modelValue?: string
  placeholder?: string
  disabled?: boolean
  readonly?: boolean
  height?: number
  theme?: 'light' | 'dark'
}
