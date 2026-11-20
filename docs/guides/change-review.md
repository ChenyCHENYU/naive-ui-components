# 字段变更审阅

`C_ChangeReview` 对照两个记录的字段值，适用于合同与订单草稿、批改预览和审批单据。按需引入组件和对应样式。

```vue
<script setup lang="ts">
  import {
    C_ChangeReview,
    type ChangeReviewField,
  } from '@robot-admin/naive-ui-components/C_ChangeReview'
  import '@robot-admin/naive-ui-components/C_ChangeReview/style.css'

  interface ContractValues {
    targetWeight: number
    note: string | null
  }

  defineProps<{ draft: ContractValues; reference: ContractValues }>()
  const emit = defineEmits<{ accept: [keys: Array<keyof ContractValues>] }>()
  const fields = [
    {
      key: 'targetWeight',
      label: '重量',
      group: '合同条款',
      format: value =>
        value === undefined ? undefined : `${value.toFixed(3)} t`,
    },
    { key: 'note', label: '备注' },
  ] satisfies readonly ChangeReviewField<ContractValues>[]
</script>

<template>
  <C_ChangeReview
    :before="draft"
    :after="reference"
    :fields="fields"
    before-label="当前草稿"
    after-label="合同参考值"
    selectable
    @apply="emit('accept', $event)"
  />
</template>
```

- 默认是只读对照并且仅显示变更。通过界面复选框切换全部字段，也可用 `v-model:only-changed` 控制。
- 默认使用 `Object.is` 比较原值。数组、日期和对象可以在字段中提供 `equal(before, after)`。显示文本通过 `format(value, side)` 或 `#value="{ value, field, side }"` 自定义。
- `undefined` 显示为未提供。显式的 `null` 和空字符串分别显示为「空值」与 `""`。有差异的显式空值可以采纳，未提供的建议值及 `disabled` 字段只供查看。
- `selectable` 开启字段采纳。组件按字段顺序发出本次有效选中键。页面可通过 `v-model:selected-keys` 同步选中键，用 `disabled` 暂停采纳。
- 切换审阅记录或版本时，使用对应的 Vue `:key` 重建组件。若页面控制选中状态，一并清空选中键。业务层在接受事件后验证记录身份、版本及保存权限。
