# 穿梭框与大列表

```vue
<C_Transfer v-model="selectedKeys" :data="people" filterable />
```

左右面板分别按搜索后的项数决定渲染方式：少于 100 项使用普通列表，100 项起复用 Naive UI 同样使用的官方 `vueuc/VVirtualList`，只挂载当前视口及相邻行。全选、禁用判断和移动顺序仍以完整列表为准；滚动到视口之外的选中项不会丢失。右侧保持 `modelValue` 的顺序，新增项按左侧数据顺序追加。

`size="small | medium | large"` 对应 28 / 34 / 40px 固定行高。继续通过既有 `--tf-height` 覆盖列表高度，例如 `style="--tf-height: 240px"`；无需为大列表额外设置高度或分页。

默认行显示 `label` 和可选 `icon`。`group`、`description`、`extra` 可携带业务元数据，但默认列表不据此分组，也没有自动展开描述的详细模式；这些字段不会改变筛选、选择或固定行高。

## 表格穿梭与树形候选

用同一份平铺数据描述设备、权限项或指标。设置 `columns` 后，两栏按配置显示多列。通过 `groupBy` 返回祖先名称路径，可让左栏按组织、工厂和设备类别展开，右栏仍按已分配顺序显示记录。

```vue
<script setup lang="ts">
  import { ref } from 'vue'
  import {
    C_Transfer,
    type TransferColumn,
  } from '@robot-admin/naive-ui-components/C_Transfer'

  const devices = [
    { key: 1, label: '入库秤', code: 'A-100', area: ['华东', '一厂'] },
  ]
  const selected = ref<number[]>([])
  const columns = [
    { key: 'code', title: '设备编码', width: 100 },
    { key: 'label', title: '设备名称' },
  ] satisfies TransferColumn<(typeof devices)[number]>[]
</script>

<template>
  <C_Transfer
    v-model="selected"
    :data="devices"
    :columns="columns"
    :group-by="device => device.area"
    filterable
  />
</template>
```

列默认读取标量字段，也可用 `format(row)` 返回显示文本。默认搜索覆盖名称、配置列的显示值与分组路径，传入 `filterMethod` 则以自定义规则为准。搜索期间自动展开匹配项的祖先，清除时恢复原展开状态。分组是展示入口，移动、全选、禁用和键类型沿用同一选择逻辑。

若项目自行改变行高、需要打印全部项，或依赖完整列表 DOM，可显式设置 `:virtual-scroll="false"` 保留普通渲染。默认开启自动判断，常规接入无需配置。搜索仍检查全部数据；虚拟列表减少 DOM 与组件挂载量，不把筛选或数据存储变成无限容量服务。
