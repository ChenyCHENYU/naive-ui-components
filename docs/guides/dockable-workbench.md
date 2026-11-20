# 多面板工作台布局

固定主从表、左树右表和上下三表优先使用 [C_SplitPane](./split-pane.md)。通过具名插槽决定内容的位置，可嵌套使用，用 `v-model:size` 保存面板比例。适用于已有的生产订单池、炉次、候选坯料联动布局。见 [WL 产销场景对照](../wl-business-scenario-parity.md)。

需要由用户拖动页签、重组面板并恢复工作区时，可以在对应业务路由按需引入 `dockview-vue`。业务面板照常使用组件库的表格、查询和表单。路由负责面板登记、布局存储与加载。

```vue
<script setup lang="ts">
  import { shallowRef } from 'vue'
  import {
    DockviewVue,
    type DockviewApi,
    type DockviewReadyEvent,
  } from 'dockview-vue'
  import 'dockview-vue/dist/styles/dockview.css'
  import OrderPool from './OrderPool.vue'
  import SelectedOrder from './SelectedOrder.vue'

  const layout = shallowRef<DockviewApi>()

  function ready({ api }: DockviewReadyEvent) {
    layout.value = api
    api.addPanel({ id: 'orders', component: 'orders', title: '订单池' })
    api.addPanel({
      id: 'details',
      component: 'details',
      title: '选中明细',
      position: { referencePanel: 'orders', direction: 'right' },
    })
  }
</script>

<template>
  <div style="height: 60dvh">
    <DockviewVue
      style="width: 100%; height: 100%"
      class="dockview-theme-light"
      @ready="ready"
    >
      <template #panel-orders><OrderPool /></template>
      <template #panel-details><SelectedOrder /></template>
    </DockviewVue>
  </div>
</template>
```

保存时读取 `layout.value?.toJSON()`，恢复时调用 `layout.value?.fromJSON(saved)`。持久化数据按用户、工作区和版本区分。业务草稿保持在应用的状态层，布局只保存面板身份、摆放和尺寸等信息。保存的布局不兼容时可以恢复预设面板。 [Dockview Vue 官方示例](https://github.com/dockview/dockview/tree/master/packages/dockview-vue) · [序列化](https://dockview.dev/docs/core/state/save/) · [恢复布局](https://dockview.dev/docs/core/state/load/)

验证覆盖 `dockview-vue@8.8.2` 的面板注册、两个分组、增添页签后恢复布局，以及同页 `C_SplitPane` 键盘调整宽度后保留未提交草稿。
