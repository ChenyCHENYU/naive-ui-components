<!-- 区域密度只覆盖子树的默认值；无额外 DOM、无全局样式或对象写入。 -->
<template><slot /></template>

<script setup lang="ts">
  import { computed, inject, provide, reactive } from 'vue'
  import { FORM_GLOBAL_CONFIG_KEY } from '../../context'
  import { TABLE_GLOBAL_CONFIG_KEY } from '../C_Table/composables/useTableGlobalConfig'
  import type { ComponentDensity } from '../../core/density'

  defineOptions({ name: 'C_Density' })
  const props = defineProps<{ density: ComponentDensity }>()
  const formDefaults = inject(FORM_GLOBAL_CONFIG_KEY, {})
  const tableDefaults = inject(TABLE_GLOBAL_CONFIG_KEY, {})
  const density = computed(() => props.density)
  // 只复制本层默认配置；显式 size/单字段配置的优先级保持不变。
  provide(FORM_GLOBAL_CONFIG_KEY, reactive({ ...formDefaults, density }))
  provide(
    TABLE_GLOBAL_CONFIG_KEY,
    reactive({
      ...tableDefaults,
      defaults: { ...tableDefaults.defaults, density },
    })
  )
</script>
