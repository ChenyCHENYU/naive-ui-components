# 资源排班

`C_ResourceSchedule` 用于展示发运货位、设备、人员等资源在指定时段的预约和占用。资源、预约、时段均由页面传入。

```vue
<script setup lang="ts">
  import { ref } from 'vue'
  import {
    C_ResourceSchedule,
    type ResourceScheduleRange,
  } from '@robot-admin/naive-ui-components/C_ResourceSchedule'

  const at = (hours: string) => Date.parse(`2026-11-20T${hours}:00+08:00`)
  const range = ref<ResourceScheduleRange>([at('08:00'), at('16:00')])
  const selectedKey = ref<string | null>(null)
  const resources = [
    {
      key: 'dock-a',
      label: '1 号装车位',
      workingWindows: [[at('08:00'), at('15:00')]] as const,
    },
    { key: 'dock-b', label: '2 号装车位' },
  ]
  const bookings = [
    {
      key: 'shipping-41',
      resourceKey: 'dock-a',
      label: '发运单 41',
      start: at('09:00'),
      end: at('11:00'),
    },
    {
      key: 'shipping-42',
      resourceKey: 'dock-a',
      label: '发运单 42',
      start: at('10:00'),
      end: at('12:00'),
    },
  ]
</script>

<template>
  <C_ResourceSchedule
    v-model="selectedKey"
    v-model:range="range"
    :resources="resources"
    :bookings="bookings"
    time-zone="Asia/Shanghai"
    navigation
  />
</template>
```

- 时间用毫秒时间戳，区间起点包含、终点排除。同一资源在可见时间内有重叠时标记冲突，相邻时间段和不同资源分别计算。
- `workingWindows` 为资源可选的工作时段。它可以显示班次、停机区段的相对位置，容量与资源可用性由业务数据提供。
- `navigation` 通过 `update:range` 请求翻到相邻等长时段。页面可以按时段和资源加载数据。跨时区显示用 `timeZone`，默认 UTC。
- `#booking` 可定制块内摘要，`#details` 可接入页面的查看、编辑或改期操作，这些插槽收到原始业务记录。键盘焦点沿标记移动，也可直接激活预约。
- 组件负责展示与选择，业务提交、时间冲突复核和自动调度由宿主应用执行。
