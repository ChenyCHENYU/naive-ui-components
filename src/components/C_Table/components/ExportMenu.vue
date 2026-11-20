<template>
  <NDropdown
    v-if="options.length"
    trigger="click"
    :options="options"
    @select="select"
  >
    <NButton
      quaternary
      square
      :size="size"
      :title="label"
      :aria-label="label"
      :disabled="disabled"
      aria-haspopup="menu"
    >
      <C_Icon
        name="mdi:download"
        size="18"
      />
    </NButton>
  </NDropdown>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { NButton, NDropdown } from 'naive-ui'
  import type { ComponentLocale } from '../../../core/contracts'
  import { useScopedComponentLocale } from '../../_shared/useScopedComponentLocale'
  import C_Icon from '../../C_Icon/index.vue'
  import type { TableExportScope } from '../exportTypes'

  const props = defineProps<{
    scopes: readonly TableExportScope[]
    size: 'small' | 'medium' | 'large' | 'tiny'
    label: string
    disabled: boolean
    allowSelected: boolean
    allowMatching: boolean
    canExportSelected: boolean
    locale?: ComponentLocale
  }>()
  const emit = defineEmits<{ select: [scope: TableExportScope] }>()

  const { t } = useScopedComponentLocale(
    {
      'table.export.page': '导出本页',
      'table.export.selected': '导出已选行',
      'table.export.matching': '导出全部匹配结果',
    },
    {
      'table.export.page': 'Export current page',
      'table.export.selected': 'Export selected rows',
      'table.export.matching': 'Export all matching results',
    },
    () => props.locale
  )
  const options = computed(() => {
    const allowed = {
      page: true,
      selected: props.allowSelected,
      matching: props.allowMatching,
    }
    return [...new Set(props.scopes)]
      .filter(scope => allowed[scope])
      .map(scope => ({
        key: scope,
        label: t(`table.export.${scope}`),
        disabled:
          props.disabled || (scope === 'selected' && !props.canExportSelected),
      }))
  })

  function select(key: string | number) {
    const option = options.value.find(item => item.key === key)
    if (option && !option.disabled) emit('select', option.key)
  }
</script>
