<template>
  <section
    class="c-filter-builder"
    :style="themeStyle"
    :aria-label="title ?? t('filterBuilder.title')"
  >
    <h3
      v-if="title"
      class="c-filter-builder__title"
      >{{ title }}</h3
    >
    <FilterGroupEditor
      v-if="group"
      :group="group"
      :depth="0"
      path=""
      :settings="settings"
      @update="value => emit('update:modelValue', value)"
    />
    <p
      v-else
      role="alert"
      >{{ t('filterBuilder.issues.invalidNode') }}</p
    >
  </section>
</template>

<script setup lang="ts" generic="K extends string = string">
  import { computed, useId } from 'vue'
  import { useComponentDensity } from '../../composables/useComponentDensity'
  import { useComponentTheme } from '../../composables/useComponentTheme'
  import { resolveComponentDensity } from '../../core/density'
  import { useScopedComponentLocale } from '../_shared/useScopedComponentLocale'
  import FilterGroupEditor from './FilterGroupEditor.vue'
  import type { FilterEditorSettings } from './editor'
  import { CHINESE, ENGLISH } from './locale'
  import {
    createFilterGroup,
    getFilterFields,
    isFilterGroup,
    resolveFilterDepth,
    validateFilter,
  } from './model'
  import type { FilterBuilderProps, FilterGroup, FilterNode } from './types'

  defineOptions({ name: 'C_FilterBuilder' })
  const props = defineProps<FilterBuilderProps<K>>()
  const emit = defineEmits<{ 'update:modelValue': [value: FilterGroup<K>] }>()
  const { t } = useScopedComponentLocale(CHINESE, ENGLISH, () => props.locale)
  const density = useComponentDensity(() => props.density)
  const layout = computed(() => resolveComponentDensity(density.value))
  const theme = useComponentTheme()
  const themeStyle = computed(() => ({
    ...theme.value,
    '--c-filter-indent': `${Math.min(layout.value.padding, 16)}px`,
    '--c-filter-gap': `${Math.min(layout.value.gap, 12)}px`,
  }))

  const empty = createFilterGroup<K>()
  const group = computed(() => {
    if (props.modelValue == null) return empty
    return isFilterGroup<K>(props.modelValue) ? props.modelValue : undefined
  })
  const issues = computed(() => {
    const byPath = new Map<string, string>()
    for (const { path, code } of validateFilter(
      props.modelValue,
      props.fields,
      props
    )) {
      const key = path.join('.')
      if (!byPath.has(key)) byPath.set(key, `filterBuilder.issues.${code}`)
    }
    return byPath
  })
  const usedIds = computed(() => {
    const ids = new Set<string>()
    if (!group.value) return ids
    const stack: FilterNode<K>[] = [group.value]
    const seen = new Set<FilterGroup<K>>()
    while (stack.length) {
      const node = stack.pop()
      if (!node) continue
      ids.add(node.id)
      if (isFilterGroup<K>(node) && !seen.has(node)) {
        seen.add(node)
        for (const child of node.children) stack.push(child)
      }
    }
    return ids
  })
  const instanceId = useId()
  let sequence = 0
  const createId = () => {
    let id = `${instanceId}-filter-${++sequence}`
    while (usedIds.value.has(id)) id = `${instanceId}-filter-${++sequence}`
    return id
  }
  const fields = computed(() => getFilterFields(props.fields))
  const fieldOptions = computed(() =>
    [...fields.value.values()].map(({ key, label }) => ({ value: key, label }))
  )
  const settings = computed<FilterEditorSettings<K>>(() => ({
    fields: fields.value,
    fieldOptions: fieldOptions.value,
    maxDepth: resolveFilterDepth(props.maxDepth),
    size: layout.value.size,
    disabled: props.disabled ?? false,
    t: key => t(`filterBuilder.${key}`),
    issueAt: path => {
      const key = issues.value.get(path)
      return key ? t(key) : undefined
    },
    createId,
  }))
</script>

<style scoped lang="scss">
  @use './index.scss';
</style>
