<template>
  <NModal
    v-model:show="modalVisible"
    preset="card"
    :title="modalTitle"
    :aria-label="modalTitle"
    :style="modalStyles.shell"
    :header-style="modalStyles.header"
    :content-style="modalStyles.content"
    :footer-style="modalStyles.footer"
    footer-class="c-form-modal__footer"
    :mask-closable="maskClosable && !busy"
    :close-on-esc="closeOnEsc && !busy"
    :closable="closable && !busy"
    class="c-form-modal"
    :class="`c-form-modal--${density}`"
  >
    <C_Form
      v-if="modalVisible && editor.model.value"
      :key="session"
      ref="formRef"
      v-model="formModel"
      :options="options"
      :config="resolvedFormConfig"
      :renderers="renderers"
      :inert="saving"
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

    <template #footer>
      <p
        v-if="draftChanged"
        role="status"
        style="margin: 0 0 8px"
      >
        表单已修改，请重新保存。
      </p>
      <C_ActionBar
        :key="session"
        :actions="modalActions"
        :config="footerConfig"
      />
    </template>
  </NModal>
</template>

<script setup lang="ts" generic="T extends object = FormRecord">
  import { computed, onScopeDispose, ref, watch } from 'vue'
  import { NModal } from 'naive-ui'
  import C_ActionBar from '../C_ActionBar/index.vue'
  import { defineActions } from '../C_ActionBar/presets'
  import {
    C_Form,
    type FormConfig,
    type FormInstance,
    type FormRecord,
    mergeFormConfig,
    useFormGlobalConfig,
  } from '../C_Form'
  import { useActionTask } from '../../composables/useActionTask'
  import { useComponentFeedback } from '../../config'
  import { resolveComponentDensity } from '../../core/density'
  import { notifyObserver } from '../../core/observer'
  import { cloneData, isDataEqual } from '../../utils/data'
  import { resolveFormModalStyles } from '../shared/formModal'
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
  const effectiveFormConfig = computed(() =>
    mergeFormConfig(props.config as FormConfig, globalFormConfig)
  )
  const feedback = useComponentFeedback(
    () => effectiveFormConfig.value.feedback
  )
  const density = computed(
    () => props.config?.density ?? globalFormConfig.density ?? 'compact'
  )

  const modalVisible = computed({
    get: () => props.editor.visible.value,
    set: value => {
      if (!value) close()
    },
  })
  const modalTitle = computed(() => props.editor.title.value)
  const session = ref(0)
  const draftChanged = ref(false)
  const saveTasks = useActionTask<number>()
  const saving = computed(() => saveTasks.isRunning(session.value))
  const busy = computed(
    () =>
      saving.value ||
      props.editor.loading.value ||
      !!formRef.value?.isSubmitting
  )
  // 重新打开或更换编辑器时隔离表单与页脚任务。保存成功的自行关闭仍属于当前会话。
  watch(
    [() => props.editor, () => props.editor.visible.value],
    ([editor, visible], [previousEditor]) => {
      if (visible || editor !== previousEditor) {
        session.value++
        draftChanged.value = false
      }
    },
    { flush: 'sync' }
  )
  onScopeDispose(() => {
    session.value++
  })
  const modalStyles = computed(() =>
    resolveFormModalStyles(props.width, density.value)
  )
  const formModel = computed<T>({
    get: () => props.editor.model.value ?? ({} as T),
    set: value => {
      if (!saving.value) props.editor.setModel(value)
    },
  })

  const canSaveDraft = (validatedDraft: T | undefined): boolean => {
    if (validatedDraft === undefined) return true
    if (isDataEqual(validatedDraft, formRef.value?.getModel())) return true
    draftChanged.value = true
    return false
  }

  const resolvedFormConfig = computed<FormConfig<T>>(() => ({
    ...props.config,
    // 持久化阶段使用字段原生禁用态，根节点 inert 同时覆盖自定义插槽。
    ...(saving.value ? { disabled: true } : {}),
    density: density.value,
    mode: props.editor.mode.value,
    // v-model 已提供初始快照；重复订阅整个 model 会让每次输入都重建配置及所有字段。
    showActions: false,
    // 弹窗只在 editor 确认保存后提示成功，表单校验完成不代表保存完成。
    submitSuccessText: '',
    onSubmit: async (payload, context) => {
      const { editor, config } = props
      const submittedSession = session.value
      draftChanged.value = false
      const isFormActive = () =>
        submittedSession === session.value &&
        !context?.signal.aborted &&
        editor.visible.value
      let validatedDraft: T | undefined
      if (config?.onSubmit) {
        // 前置钩子可转换提交数据，比较时保留转换前的校验快照。
        validatedDraft = cloneData(payload.model)
        await config.onSubmit(payload, context)
      }
      const result = await saveTasks.run(
        submittedSession,
        () => editor.submit(payload.model),
        () => isFormActive() && canSaveDraft(validatedDraft)
      )
      if (!result.executed) return
      const saved = result.value
      // editor 可先关闭弹窗再返回成功，子表单卸载后的取消信号不影响这个结果。
      if (submittedSession !== session.value || (!saved && !isFormActive()))
        return
      emit('submit', payload, saved)
      const text = effectiveFormConfig.value.submitSuccessText
      if (saved && text) notifyObserver(() => feedback.success(text))
    },
  }))

  const close = (): void => {
    if (busy.value || !modalVisible.value) return
    props.editor.close()
    emit('close')
  }

  const footerConfig = computed<ActionBarConfig>(() => {
    const tokens = resolveComponentDensity(density.value)
    return {
      align: 'right',
      // 紧凑页脚采用 22px；业务明确指定的字段尺寸仍同步到页脚。
      size:
        effectiveFormConfig.value.size ??
        (density.value === 'compact' ? 'tiny' : tokens.size),
      gap: tokens.gap,
      compact: density.value === 'compact',
    }
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
