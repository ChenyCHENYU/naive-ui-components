<template>
  <div
    class="c-user-picker"
    :style="themeStyle"
  >
    <C_DataPicker
      ref="picker"
      v-bind="bindings"
      @update:model-value="updateValue"
      @select="rows => emit('select', rows)"
      @cancel="emit('cancel')"
    >
      <template
        v-if="$slots.trigger"
        #trigger="context"
        ><slot
          name="trigger"
          v-bind="context"
      /></template>
      <template #selected="context">
        <slot
          name="selected"
          v-bind="context"
        >
          <SelectedPeople
            :context="context"
            :fields="fields"
            :ordered="selectionOrder"
            :disabled-reason="disabledReason"
            :locale="locale"
          />
        </slot>
      </template>
    </C_DataPicker>
  </div>
</template>
<script
  setup
  lang="ts"
  generic="
    T extends object,
    F extends object = Record<string, unknown>,
    O extends object = TreeNodeData,
    M extends boolean = false,
    V extends DataPickerValue = DataPickerValue
  "
>
  import {
    computed,
    defineAsyncComponent,
    h,
    nextTick,
    onMounted,
    shallowRef,
    watch,
  } from 'vue'
  import { NButton, useThemeVars } from 'naive-ui'
  import C_DataPicker from '../C_DataPicker/index.vue'
  import SelectedPeople from './SelectedPeople.vue'
  import { createPersonColumns } from './personColumns'
  import { useComponentLocale } from '../../composables/useComponentLocale'
  import { cloneData, isDataEqual } from '../../utils/data'
  import type { TreeNodeData } from '../C_Tree/types'
  import type {
    DataPickerExpose,
    DataPickerNavigation,
    DataPickerProps,
    DataPickerValue,
  } from '../C_DataPicker/types'
  import type {
    UserPickerProps,
    UserPickerEmits,
    UserPickerSlots,
    UserPickerModel,
  } from './types'
  defineOptions({ name: 'C_UserPicker' })
  const props = withDefaults(defineProps<UserPickerProps<T, F, O, M, V>>(), {
    showTrigger: undefined,
    showActions: true,
    revalidateOnConfirm: true,
  })
  const emit = defineEmits<UserPickerEmits<T, M, V>>()
  defineSlots<UserPickerSlots<T>>()
  const picker = shallowRef<DataPickerExpose>()
  const { t } = useComponentLocale(() => props.locale)
  const theme = useThemeVars()
  const themeStyle = computed(() => ({
    '--c-user-picker-muted': theme.value.textColor3,
    '--c-user-picker-border': theme.value.borderColor,
    '--c-user-picker-error': theme.value.errorColor,
  }))
  const C_Tree = defineAsyncComponent(() =>
    import('../C_Tree/index.vue').then(module => module.default<O>)
  )
  const navigation = computed<DataPickerNavigation<F> | undefined>(() => {
    const {organization} = props
    if (!organization) return
    const { field, title, ...tree } = organization
    return {
      options: [],
      field,
      title,
      render: context =>
        h('div', { class: 'c-user-picker__organization' }, [
          h(
            'div',
            { class: 'c-user-picker__organization-heading' },
            title ?? t('userPicker.organization')
          ),
          h(
            NButton,
            {
              text: true,
              size: 'small',
              disabled: context.disabled,
              onClick: () => context.select(undefined),
            },
            () => t('picker.allCategories')
          ),
          h(C_Tree, {
            ...tree,
            searchPattern: undefined,
            treeProps: { ...tree.treeProps, pattern: undefined },
            checkable: false,
            multiple: false,
            selectable: true,
            addable: false,
            refreshable: false,
            disabled: context.disabled || tree.disabled,
            density: props.density ?? context.density,
            selectedKeys: context.value === undefined ? [] : [context.value],
            'onNode-select': (_node: unknown, keys: DataPickerValue[]) =>
              context.select(keys[0]),
          }),
        ]),
    }
  })
  const bindings = computed<DataPickerProps<T, F>>(() => ({
    ...props,
    columns:
      props.columns ??
      createPersonColumns(props.source, props.fields, t, props.disabledReason),
    modelValue: props.modelValue,
    title: props.title ?? t('userPicker.title'),
    placeholder: props.placeholder ?? t('userPicker.placeholder'),
    showTrigger: props.showTrigger ?? props.presentation !== 'inline',
    revalidateOnConfirm: props.revalidateOnConfirm ?? true,
    navigation: navigation.value,
  }))
  const updateValue = (value: DataPickerValue | DataPickerValue[] | null) => {
    // 选择内核已验证编码，外层仅收敛单/多选模型；调用方无需联合类型分支。
    emit('update:modelValue', value as UserPickerModel<V, M>)
  }
  const open = () => picker.value?.open()
  const close = () => picker.value?.close()
  const confirm = async () => (await picker.value?.confirm()) ?? false
  const reset = () => {
    picker.value?.reset()
    openInline()
  }
  const openInline = () => {
    if (props.presentation === 'inline') void nextTick(open)
  }
  onMounted(openInline)
  watch(
    () => [
      props.scope,
      props.source,
      props.source.request,
      props.source.resolve,
      props.organization?.searchSource?.scope,
      props.organization?.searchSource?.request,
    ],
    () => {
      picker.value?.reset()
      openInline()
    }
  )
  let filterBaseline = cloneData([props.initialValues, props.fixedFilters])
  watch(
    () => [props.initialValues, props.fixedFilters],
    value => {
      if (isDataEqual(filterBaseline, value)) return
      filterBaseline = cloneData(value)
      // 内核已丢弃旧范围，内嵌面板继续以新筛选打开；等值配置不打断草稿。
      openInline()
    },
    { deep: true, flush: 'post' }
  )
  defineExpose({ open, close, reset, confirm })
</script>
<style lang="scss">
  @use './index.scss';
</style>
