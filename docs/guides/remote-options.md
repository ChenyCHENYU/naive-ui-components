# 远程选择与自由文本建议

`C_Select` 保存实体值，`C_AutoComplete` 保存输入文本。两者复用同一 `source` 请求契约，业务接口仍由应用提供；不要求固定后端结构，也不产生全局选项缓存。

## 一个数据源，两种交互

```vue
<script setup lang="ts">
  import { ref } from 'vue'
  import {
    C_Select,
    type OptionSource,
  } from '@robot-admin/naive-ui-components/C_Select'
  import { C_AutoComplete } from '@robot-admin/naive-ui-components/C_AutoComplete'

  interface Customer {
    id: number
    name: string
    email: string
  }

  const customerId = ref<number | null>(null)
  const customerName = ref('')
  const customerEmail = ref('')
  const customers = {
    async request({ search, page, pageSize, signal }) {
      const params = new URLSearchParams({
        search,
        page: String(page),
        pageSize: String(pageSize),
      })
      const response = await fetch(`/api/customers?${params}`, { signal })
      if (!response.ok) throw new Error('Customer request failed')
      const result: { rows: Customer[]; total: number } = await response.json()
      return result
    },
    value: row => row.id,
    label: row => row.name,
  } satisfies OptionSource<Customer, number>
</script>

<template>
  <C_Select
    v-model="customerId"
    :source="customers"
    clearable
    @select="row => (customerEmail = row?.email ?? '')"
  />
  <C_AutoComplete
    v-model="customerName"
    :source="customers"
    @select="row => (customerEmail = row.email)"
  />
</template>
```

`C_Select` 的单选 `select` 返回整行或清空时的 `null`；多选返回当前可解析的整行数组，清空为 `[]`。未知 ID 仍保留在 `v-model` 中，不伪造业务行。需要编辑回显时提供 `resolve(values, signal)` 返回已知行，它在下拉菜单未打开时也会执行。

`C_AutoComplete` 始终输出字符串，失焦保留自由文本；只有选中建议才触发 `select(row)`。远程源的 `value` 是实体身份，支持字符串、数字和布尔值；选中时插入 `label`，同名不同 ID 的记录仍可分别选择。本地建议使用字符串数组，或 `{ value, label?, disabled?, ...业务字段 }[]`，选中时插入 `value`，并返回原始对象。

## 分页、上下文和恢复

源可选配置 `debounce`（默认 250 毫秒）、`minChars`（默认 0）、`pageSize`（默认 20）和 `filters`。请求收到 `{ search, page, pageSize, signal, filters? }`，返回 `{ rows, total }`；页码从 1 开始，`total` 是当前筛选条件下的总记录数。每页不得超过请求页大小，单页身份不能重复；`0`、`false` 都是有效值。

设置 `filters` 时由请求函数将其转换为业务接口参数。语义相同的源对象工厂不会反复发请求；更换请求/映射函数或改变筛选条件会使旧请求失效。建议复用稳定的方法，只替换筛选值。组件不会清空不属于当前筛选上下文的业务值，是否清空由上级表单决定。

首屏、关键词变化和分页共用取消与结果归属检查。关键词变化立即取消旧请求，防抖结束后才查询；关闭、卸载和 KeepAlive 停用会释放在途工作。失败显示重试，分页失败保留已有行；显式“加载更多”不依赖菜单是否形成滚动条。`C_Select` 状态在菜单操作区，`C_AutoComplete` 操作在输入后缀，无结果菜单显示加载、失败、最少字符或空状态。

## 本地模板和原生能力

自动补全默认按标签过滤本地建议；固定话术/备注模板可用 `:filterable="false"`，输入变化仍展示全部模板。空输入聚焦默认展示可用建议，`source.minChars` 可限制远程查询；原生 `getShow` 仍可通过属性显式覆盖显示规则。

原生键盘导航、输入法组合输入和焦点能力保留。`C_AutoComplete` 的 `suffix` 与内置分页/重试组合，`empty` 可替换默认空状态；`C_Select` 的 `action` 与内置状态组合。两者均支持 `density`、`size`、`locale`，不引入业务专属样式。

## 建议次行信息

`C_AutoComplete` 可选的 `renderLabel(row)` 从数据源推导完整行，用于同名客户的信用代码、地址等辨认信息。它只负责候选展示；选中仍插入 `source.label(row)`，不会将信用代码或说明写入文本值。

```vue
<script setup lang="ts">
  import { h } from 'vue'
</script>

<template>
  <C_AutoComplete
    v-model="customerName"
    :source="customers"
    :render-label="
      row => h('div', [h('strong', row.name), h('small', row.email)])
    "
  />
</template>
```
