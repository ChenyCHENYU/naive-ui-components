<template>
  <NSelect
    ref="select"
    v-bind="$attrs"
    class="c-select"
    :class="{ 'c-select--bounded': summarizeTags }"
    :value="binding.value"
    :options="binding.options"
    :multiple="multiple"
    :max-tag-count="summarizeTags ? 1 : maxTagCount"
    :filterable="filterable"
    :tag="tag"
    :clearable="clearable"
    :disabled="blocked"
    :loading="loading"
    :size="size"
    :placeholder="placeholder"
    :virtual-scroll="virtualScroll"
    :status="status"
    :input-props="inputProps"
    :fallback-option="binding.resolveFallbackOption(fallbackOption)"
    @update:value="update"
  >
    <template
      v-for="(_, name) in $slots"
      #[name]="slotProps"
    >
      <slot
        :name="name"
        v-bind="slotProps ?? {}"
      />
    </template>
  </NSelect>
</template>

<script
  setup
  lang="ts"
  generic="
    V extends SelectValue = SelectValue,
    M extends boolean = false,
    T extends boolean = false
  "
>
  import { computed, useTemplateRef } from 'vue'
  import { NSelect, type SelectInst } from 'naive-ui'
  import { createOptionValueBinder } from '../../core/options'
  import { shouldSummarizeSelectTags } from '../../core/selectPresentation'
  import type { SelectModelValue, SelectProps, SelectValue } from './types'

  defineOptions({ name: 'C_Select', inheritAttrs: false })
  const props = withDefaults(defineProps<SelectProps<V, M, T>>(), {
    virtualScroll: true,
  })
  const emit = defineEmits<{
    'update:modelValue': [value: SelectModelValue<V, M, T>]
  }>()
  const select = useTemplateRef<SelectInst>('select')
  const blocked = computed(() => props.disabled || props.readonly)
  const summarizeTags = computed(() =>
    shouldSummarizeSelectTags(props.multiple, props.maxTagCount)
  )
  const bindOptions = computed(() => createOptionValueBinder(props.options))
  const binding = computed(() => bindOptions.value(props.modelValue))

  function update(
    value: string | number | Array<string | number> | null,
    selected?: unknown
  ): void {
    if (blocked.value) return
    const decoded = binding.value.decode(value, selected)
    emit(
      'update:modelValue',
      (props.multiple && decoded === null ? [] : decoded) as SelectModelValue<
        V,
        M,
        T
      >
    )
  }

  defineExpose({
    focus: () => select.value?.focus(),
    blur: () => select.value?.blur(),
  })
</script>

<style lang="scss">
  @use './index.scss';
</style>
