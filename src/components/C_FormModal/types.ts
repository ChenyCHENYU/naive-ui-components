import type { ComputedRef, Ref } from 'vue'
import type {
  FormConfig,
  FormOption,
  FormRecord,
  SubmitEventPayload,
} from '../C_Form'

export type FormModalMode = 'create' | 'edit'

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
  width?: number | string
  createText?: string
  saveText?: string
  cancelText?: string
  closable?: boolean
  maskClosable?: boolean
  closeOnEsc?: boolean
}

export interface FormModalEmits<T extends object = FormRecord> {
  submit: [payload: SubmitEventPayload<T>, saved: boolean]
  close: []
}
