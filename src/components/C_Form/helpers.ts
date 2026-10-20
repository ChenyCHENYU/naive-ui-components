import {
  computed,
  shallowRef,
  toValue,
  type ComputedRef,
  type MaybeRefOrGetter,
  type ShallowRef,
} from 'vue'
import type { FormConfig } from './composables/useFormConfig'
import type { FormInstance, FormModel, FormOption, FormRecord } from './types'
import { cloneData } from '../../utils/data'

/** Preserve business-model field inference without changing the component API. */
export function defineFormOptions<T extends object = FormRecord>(
  options: FormOption<T>[]
): FormOption<T>[] {
  return options
}

/** Type-safe identity helper for reusable form configuration. */
export function defineFormConfig<T extends object = FormRecord>(
  config: FormConfig<T>
): FormConfig<T> {
  return config
}

export interface UseCFormOptions<T extends object> {
  initialValues: T
  options: MaybeRefOrGetter<FormOption<T>[]>
  config?: MaybeRefOrGetter<FormConfig<T> | undefined>
}

export interface UseCFormReturn<T extends object> {
  model: ShallowRef<FormModel<T>>
  formRef: ShallowRef<FormInstance<T> | null>
  bindings: ComputedRef<{
    modelValue: FormModel<T>
    options: FormOption<T>[]
    config: FormConfig<T> | undefined
    'onUpdate:modelValue': (value: FormModel<T>) => void
  }>
  /** 未挂载或已卸载时拒绝校验；请先绑定 formRef。 */
  validate: () => Promise<void>
  submit: () => Promise<boolean>
  reset: () => void
  getValues: () => FormModel<T>
  setValues: (
    values: Partial<FormModel<T>>,
    shouldValidate?: boolean
  ) => Promise<void>
}

/** Small binding helper for the common controlled C_Form setup. */
export function useCForm<T extends object>(
  setup: UseCFormOptions<T>
): UseCFormReturn<T> {
  const model = shallowRef<FormModel<T>>(
    cloneData(setup.initialValues)
  ) as ShallowRef<FormModel<T>>
  const formRef = shallowRef<FormInstance<T> | null>(null)
  const bindings = computed(() => ({
    modelValue: model.value,
    options: toValue(setup.options),
    config: toValue(setup.config),
    'onUpdate:modelValue': (value: FormModel<T>) => {
      model.value = cloneData(value)
    },
  }))

  return {
    model,
    formRef,
    bindings,
    validate: async () => {
      if (!formRef.value) throw new Error('C_Form is not mounted')
      await formRef.value.validate()
    },
    submit: () => formRef.value?.submit() ?? Promise.resolve(false),
    reset: () => {
      if (formRef.value) {
        formRef.value.resetFields()
        model.value = cloneData(formRef.value.getModel())
      } else {
        model.value = cloneData(setup.initialValues)
      }
    },
    getValues: () => cloneData(formRef.value?.getModel() ?? model.value),
    setValues: async (values, shouldValidate = false) => {
      if (formRef.value) {
        await formRef.value.setFieldsValue(values, shouldValidate)
        model.value = cloneData(formRef.value.getModel())
      } else {
        model.value = { ...model.value, ...cloneData(values) }
      }
    },
  }
}
