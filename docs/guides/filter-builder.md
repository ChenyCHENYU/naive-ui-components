# 组合筛选

当业务要求用户自行组合多个 AND / OR 条件时，可单独使用 `C_FilterBuilder`。配置字段、控件类型和可用操作符，由业务在执行查询时验证并转换为自己的接口参数。

```vue
<script setup lang="ts">
  import { ref } from 'vue'
  import {
    C_FilterBuilder,
    createFilterGroup,
    validateFilter,
    type FilterField,
    type FilterGroup,
  } from '@robot-admin/naive-ui-components/C_FilterBuilder'

  const fields = [
    { key: 'customer', label: '客户', type: 'text' },
    { key: 'amount', label: '金额', type: 'number', operators: ['gte', 'lte'] },
    { key: 'overdue', label: '已逾期', type: 'boolean' },
  ] satisfies FilterField[]

  const filter = ref(createFilterGroup())
  const emit = defineEmits<{ apply: [filter: FilterGroup] }>()
  const apply = () => {
    if (!validateFilter(filter.value, fields).length)
      emit('apply', filter.value)
  }
</script>

<template>
  <C_FilterBuilder
    v-model="filter"
    :fields="fields"
  />
  <button
    type="button"
    @click="apply"
    >应用筛选</button
  >
</template>
```

- 根和子组都有 `operator: 'and' | 'or'` 和 `children`。条件包含 `field`、`operator`、`value`。组和条件各自持有可持久化的唯一 `id`，新增时组件会生成。
- 文本、数字、日期、单选、布尔字段提供各自的缺省操作符。传入 `operators` 可缩小范围。日期是 `YYYY-MM-DD` 字符串，数字 `0` 和布尔 `false` 都是有效值。使用 `isEmpty` 或 `isNotEmpty` 时值为 `null`。
- `validateFilter` 只返回问题与子项下标路径。空根表示没有筛选，空子组和未填条件会被标记。回显的不可用字段、操作符与值保留在草稿中，用户可修正或移除。
- `maxDepth` 控制根下可嵌套的组数，默认 4，支持 0 至 8。调用 `validateFilter` 时可传入相同上限。
- 可使用 `C_Density` 或显式 `density` 统一尺寸，`locale` 支持组件库语言设置和消息覆盖。组件用 `disabled` 进入只读展示。
