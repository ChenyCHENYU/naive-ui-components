import type { ComputedRef, Ref } from 'vue'
import type {
  FormConfig,
  FormOption,
  FormRecord,
  FormRenderer,
  SubmitEventPayload,
} from '../C_Form'

export type FormModalMode = 'create' | 'edit'

export interface FormModalBeforeCloseContext {
  /** 弹窗会话结束或草稿被更新时取消本次确认。 */
  signal: AbortSignal
}

export interface FormModalInstance {
  /** 经未保存保护后同步执行替换草稿等动作。返回动作是否执行。 */
  requestDiscard(action: () => void): Promise<boolean>
}

/**
 * Structural editor contract. It intentionally does not depend on request-core,
 * so any headless CRUD implementation can drive the modal.
 */
export interface FormModalEditor<T extends object = FormRecord> {
  visible: Ref<boolean>
  mode: Ref<FormModalMode>
  model: Ref<T | null>
  title: Ref<string>
  loading: Ref<boolean> | ComputedRef<boolean>
  setModel(model: T): void
  close(): void
  submit(model?: T): Promise<boolean>
}

export interface FormModalProps<T extends object = FormRecord> {
  editor: FormModalEditor<T>
  options: FormOption<T>[]
  config?: FormConfig<T>
  /** 当前弹窗使用的自定义字段渲染器。 */
  renderers?: Record<string, FormRenderer>
  width?: number | string
  createText?: string
  saveText?: string
  cancelText?: string
  closable?: boolean
  maskClosable?: boolean
  closeOnEsc?: boolean
  /** 仅草稿已修改时调用。返回 true 才允许丢弃；异常视为取消。 */
  beforeClose?: (
    context: FormModalBeforeCloseContext
  ) => boolean | Promise<boolean>
  /** 保持弹窗打开并切换记录时，更新该键以重新建立表单初始快照。 */
  sessionKey?: string | number
}

export interface FormModalEmits<T extends object = FormRecord> {
  submit: [payload: SubmitEventPayload<T>, saved: boolean]
  close: []
}
