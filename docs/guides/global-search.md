# 全局搜索与命令

`C_GlobalSearch` 接收响应式的授权菜单。菜单在本地查询，历史用当前菜单重新确认。可选的 `commands.sources` 允许把订单、物料和快捷操作按来源加入同一面板。

```vue
<script setup lang="ts">
  import {
    C_GlobalSearch,
    type GlobalSearchOptions,
  } from '@robot-admin/naive-ui-components/C_GlobalSearch'

  const options: GlobalSearchOptions = {
    menuItems: () => authorizedMenus.value,
    onSelect: openMenu,
    commands: {
      get scope() {
        return currentWorkspace.value
      },
      sources: [
        {
          key: 'orders',
          title: '订单',
          minChars: 2,
          search: async (query, { signal, scope }) => {
            const rows = await findOrders(query, { signal, scope })
            return rows.map(row => ({
              key: row.id,
              label: row.number,
              description: row.customer,
            }))
          },
        },
      ],
    },
  }
</script>

<template>
  <C_GlobalSearch
    :options="options"
    @command-select="openCommand"
  />
</template>
```

- 输入非空才查询命令来源，默认防抖 200ms，同时最多查询 3 个来源。每组最多显示 20 条不同键的结果。同步菜单结果继续即时可选。
- `search(query, { signal, scope })` 应使用当前授权并转交取消信号。身份或授权变化时更新 `scope` 或来源配置，旧匹配会立即失效。
- `command-select` 返回来源键与条目，应用决定跳转或执行。直接使用 `useGlobalSearch` 时可用 `commands.onSelect`。命令检索词、结果和选择都属于当前会话，菜单历史沿用现有行为。
- 用户可用方向键跨组定位，Enter 选择，Escape 关闭。部分来源失败时保留成功结果，并允许重试。
