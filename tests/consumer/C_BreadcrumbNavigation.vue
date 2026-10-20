<script setup lang="ts">
  import { h, ref } from 'vue'
  import {
    C_Breadcrumb,
    type BreadcrumbItem,
    type BreadcrumbMenuItem,
  } from '@robot-admin/naive-ui-components/C_Breadcrumb'
  import type { BreadcrumbMenuItem as RootBreadcrumbMenuItem } from '@robot-admin/naive-ui-components'

  // App menu icons can be render functions; the breadcrumb only renders names it understands.
  const menus = [
    {
      path: '/system',
      key: '/system',
      icon: () => h('span', 'system'),
      label: 'System',
      meta: { title: 'menu.system', icon: 'mdi:cog-outline' },
      children: [
        {
          path: 'users',
          meta: { title: 'menu.users', hidden: false, breadcrumb: true },
          disabled: false,
        },
        { key: 'separator', type: 'divider' },
        {
          key: 'configuration',
          type: 'group',
          children: [{ key: '/system/settings', label: 'Settings' }],
        },
      ],
    },
  ] as const satisfies readonly BreadcrumbMenuItem[]
  const rootMenus: readonly RootBreadcrumbMenuItem[] = menus
  const items = [
    {
      key: '/manual',
      label: 'Manual root',
      icon: 'mdi:folder-outline',
      children: [
        { key: '/manual/disabled', label: 'Disabled', disabled: true },
      ],
    },
    { key: '/manual/current', label: 'Current' },
  ] as const satisfies readonly BreadcrumbItem[]
  const selected = ref('')
  const select = (path: string) => {
    selected.value = path
  }
  const format = (label: string) => `translated:${label}`
  void rootMenus
</script>

<template>
  <C_Breadcrumb
    :menus="menus"
    :label-formatter="format"
    :show-icon="false"
    :icon-size="18"
    @select="select"
  />
  <C_Breadcrumb
    :items="items"
    @select="select"
  />
  <span>{{ selected }}</span>
</template>
