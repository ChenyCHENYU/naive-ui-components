import { computed, shallowRef, toValue, type MaybeRefOrGetter } from 'vue'
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

/** Small binding helper for the common controlled C_Form setup. */
export function useCForm<T extends object>(setup: UseCFormOptions<T>) {
  const model = shallowRef<FormModel<T>>(cloneData(setup.initialValues))
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
    validate: () => formRef.value?.validate() ?? Promise.resolve(),
    submit: () => formRef.value?.submit() ?? Promise.resolve(false),
    reset: () => formRef.value?.resetFields(),
  }
}
