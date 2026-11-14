<script setup lang="ts">
  import { ref } from 'vue'
  import type { MenuProps as NaiveMenuProps } from 'naive-ui'
  import {
    C_Menu,
    type MenuProps,
  } from '@robot-admin/naive-ui-components/C_Menu'

  const theme: NonNullable<MenuProps['themeOverrides']> = {
    borderRadius: '8px',
    itemHeight: '36px',
    itemColorActive: '#e8f0ff',
    common: { primaryColor: '#2080f0' },
    peers: { Tooltip: { borderRadius: '6px' } },
  }
  // 原生配置可直接复用，包含公共色和浮层主题，无需使用侧转换类型。
  const nativeTheme: NaiveMenuProps['themeOverrides'] = theme
  const sharedTheme: MenuProps['themeOverrides'] = nativeTheme
  const optionalTheme = ref<MenuProps['themeOverrides']>()
  const iconSize: MenuProps['iconSize'] = 18
  // @ts-expect-error 图标尺寸使用数字，不接收 CSS 字符串。
  const invalidIconSize: MenuProps['iconSize'] = '18'

  const invalidRadius: MenuProps['themeOverrides'] = {
    // @ts-expect-error Menu 的真实圆角字段为 borderRadius。
    itemBorderRadius: '8px',
  }
  const invalidPadding: MenuProps['themeOverrides'] = {
    // @ts-expect-error 缩进由 rootIndent/indent 控制，不是主题字段。
    itemPadding: '0 16px',
  }
  const invalidHeight: MenuProps['themeOverrides'] = {
    // @ts-expect-error 原生主题尺寸使用 CSS 字符串。
    itemHeight: 36,
  }
  void [invalidRadius, invalidPadding, invalidHeight, invalidIconSize]
</script>

<template>
  <C_Menu
    :routes="[{ path: '/home', meta: { title: '首页' } }]"
    :theme-overrides="sharedTheme"
    :icon-size="iconSize"
    :root-indent="20"
    :indent="16"
  />
  <C_Menu
    :options="[{ key: 0, label: '首页' }]"
    :theme-overrides="optionalTheme"
  />
</template>
