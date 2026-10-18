# 表格密度与模式切换

`C_Form`、`C_FormSearch` 和 `C_Table` 共用 `ComponentDensity`。普通页面只需共享一个状态：

```vue
<script setup lang="ts">
  import { ref } from 'vue'
  import type { ComponentDensity } from '@robot-admin/naive-ui-components/C_Table'
  const density = ref<ComponentDensity>('compact')
</script>

<template>
  <C_FormSearch
    v-model="query"
    :form-item-list="searchFields"
    :config="{ density }"
  />
  <C_Table
    :data="rows"
    :columns="columns"
    :config="{ density, edit: 'cell', selection: true }"
  />
</template>
```

| density       | 原生控件尺寸 | 用途                           |
| ------------- | ------------ | ------------------------------ |
| `compact`     | `small`      | 高频操作、多表工作台、紧凑查询 |
| `default`     | `medium`     | 常规管理页面                   |
| `comfortable` | `large`      | 信息较少、强调可读性的录入页面 |

密度同步表格行尺寸、编辑器、分页、工具栏按钮、批量按钮、内置编辑弹窗和组件内部留白。
`display.size`、`pagination.size`、`toolbar.actionBar`、列 `editProps.size` 仍可分别覆盖；原生表格 attrs 保持既有覆盖顺序。
不传 `density` 保留旧表格尺寸和紧凑工具按钮。密度仅影响当前实例，不修改全局主题和相邻表格。

## 编辑模式使用一个配置项

```ts
const config = { density: 'compact', edit: 'row', pagination: false } as const
```

| edit                      | 行为           |
| ------------------------- | -------------- |
| `false` / `'none'` / 不传 | 只读           |
| `true` / `'modal'`        | 弹窗编辑       |
| `'row'`                   | 整行编辑       |
| `'cell'`                  | 单元格编辑     |
| `'both'`                  | 行与单元格编辑 |

需要保存回调、标题或宽度时升级为对象，不增加额外开关：

```ts
const config = {
  density: 'compact',
  edit: { mode: 'row', onSave: saveRow, onError: reportError },
  selection: true,
  pagination: { remote: true, total: 100, pageSize: 20 },
}
```

运行时修改密度保留草稿；修改编辑模式或关闭编辑会清理旧草稿。正在校验或保存的旧会话不能恢复草稿，旧结果也不会继续发出本地数据补丁。已经交给业务 `onSave` 的请求由业务自行取消或完成，组件不能撤销服务器写入。模式切换本身不会触发业务取消回调或自动保存。

分页、树表、虚拟滚动、选择、导出继续使用各自的分组配置。它们是可组合能力，不设隐含开启多种行为的“万能模式”。

多表分屏请参阅[分割面板](./split-pane.md)；表单优先级与布局示例请参阅[表单密度](./form-density.md)。
