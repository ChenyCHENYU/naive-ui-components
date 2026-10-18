<template>
  <NModal
    v-model:show="modalVisible"
    preset="card"
    :title="modalTitle"
    :style="{ width: modalWidth }"
    :mask-closable="maskClosable"
    :close-on-esc="closeOnEsc"
    :closable="closable"
    class="c-form-modal"
  >
    <C_Form
      v-if="modalVisible && editor.model.value"
      ref="formRef"
      v-model="formModel"
      :options="options"
      :config="resolvedFormConfig"
    >
      <template
        v-for="(_, slotName) in $slots"
        #[slotName]="slotProps"
      >
        <slot
          :name="slotName"
          v-bind="slotProps"
        />
      </template>
    </C_Form>

    <template #action>
      <C_ActionBar
        :actions="modalActions"
        :config="footerConfig"
      />
    </template>
  </NModal>
</template>

<script setup lang="ts" generic="T extends object = FormRecord">
  import { computed, ref } from 'vue'
  import { NModal } from 'naive-ui'
  import C_ActionBar from '../C_ActionBar/index.vue'
  import { defineActions } from '../C_ActionBar/presets'
  import {
    C_Form,
    type FormConfig,
    type FormInstance,
    type FormRecord,
    mergeFormConfig,
    resolveFormConfig,
    useFormGlobalConfig,
  } from '../C_Form'
  import { resolveComponentDensity } from '../../core/density'
  import type { ActionBarConfig } from '../C_ActionBar/types'
  import type { FormModalEmits, FormModalProps } from './types'

  defineOptions({ name: 'C_FormModal' })

  const props = withDefaults(defineProps<FormModalProps<T>>(), {
    config: () => ({}),
    width: 'min(620px, calc(100vw - 24px))',
    createText: '创建',
    saveText: '保存',
    cancelText: '取消',
    closable: true,
    maskClosable: true,
    closeOnEsc: true,
  })
  const emit = defineEmits<FormModalEmits<T>>()
  const formRef = ref<FormInstance<T> | null>(null)
  const globalFormConfig = useFormGlobalConfig()
  const density = computed(
    () => props.config?.density ?? globalFormConfig.density
  )

  const modalVisible = computed({
    get: () => props.editor.visible.value,
    set: value => {
      if (!value) close()
    },
  })
  const modalTitle = computed(() => props.editor.title.value)
  const busy = computed(() => props.editor.loading.value)
  const modalWidth = computed(() =>
    typeof props.width === 'number' ? `${props.width}px` : props.width
  )
  const formModel = computed<T>({
    get: () => props.editor.model.value ?? ({} as T),
    set: value => {
      props.editor.setModel(value)
    },
  })
  const resolvedFormConfig = computed<FormConfig<T>>(() => ({
    // 历史弹窗默认 small；显式密度交给 C_Form 统一推导，避免 small 吞掉密度。
    ...(density.value === undefined ? { size: 'small' as const } : {}),
    ...props.config,
    mode: props.editor.mode.value,
    initialValues: props.editor.model.value ?? undefined,
    showActions: false,
    onSubmit: async (payload, context) => {
      await props.config?.onSubmit?.(payload, context)
      if (context?.signal.aborted) return
      const saved = await props.editor.submit(payload.model as T)
      if (!context?.signal.aborted) emit('submit', payload, saved)
    },
  }))

  const close = (): void => {
    props.editor.close()
    emit('close')
  }

  const footerConfig = computed<ActionBarConfig>(() => {
    const config: ActionBarConfig = { align: 'right' }
    if (density.value !== undefined || props.config?.size !== undefined) {
      config.size = resolveFormConfig(
        mergeFormConfig(
          resolvedFormConfig.value as FormConfig,
          globalFormConfig
        )
      ).size
    }
    if (density.value !== undefined) {
      config.gap = resolveComponentDensity(density.value).gap
      config.compact = density.value === 'compact'
    }
    return config
  })

  const modalActions = computed(() =>
    defineActions([
      {
        key: 'cancel',
        label: props.cancelText,
        disabled: busy,
        onClick: close,
      },
      {
        key: props.editor.mode.value === 'create' ? 'create' : 'save',
        label:
          props.editor.mode.value === 'create'
            ? props.createText
            : props.saveText,
        loading: busy,
        onClick: async () => {
          await formRef.value?.submit()
        },
      },
    ])
  )
</script>

<style scoped lang="scss">
  @use './index.scss';
</style>
