<!-- 区域密度只覆盖子树的默认值；无额外 DOM、无全局样式或对象写入。 -->
<template><slot /></template>

<script setup lang="ts">
  import { computed, inject, provide, reactive } from 'vue'
  import {
    FORM_GLOBAL_CONFIG_KEY,
    COMPONENT_DENSITY_KEY,
    TABLE_GLOBAL_CONFIG_KEY,
  } from '../../context'
  import type { ComponentDensity } from '../../core/density'

  defineOptions({ name: 'C_Density' })
  const props = defineProps<{ density: ComponentDensity }>()
  const formDefaults = inject(FORM_GLOBAL_CONFIG_KEY, {})
  const tableDefaults = inject(TABLE_GLOBAL_CONFIG_KEY, {})
  const density = computed(() => props.density)
  provide(COMPONENT_DENSITY_KEY, density)
  // 只复制本层默认配置；显式 size/单字段配置的优先级保持不变。
  provide(FORM_GLOBAL_CONFIG_KEY, reactive({ ...formDefaults, density }))
  const tableConfig = {
    ...tableDefaults,
    defaults: { ...tableDefaults.defaults, density },
  }
  // 应用启动时声明的范围保持实时转发，区域密度不能冻结当前账号。
  if ('persistPrefix' in tableDefaults)
    Object.defineProperty(tableConfig, 'persistPrefix', {
      enumerable: true,
      configurable: true,
      get: () => tableDefaults.persistPrefix,
    })
  provide(TABLE_GLOBAL_CONFIG_KEY, reactive(tableConfig))
</script>
