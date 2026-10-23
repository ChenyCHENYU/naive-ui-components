<script setup lang="ts">
  import { ref } from 'vue'
  import {
    C_Menu,
    type MenuKey,
    type MenuEmits,
  } from '../../src/components/C_Menu'
  import { C_Transfer } from '../../src/components/C_Transfer'
  import { C_NotificationCenter } from '../../src/components/C_NotificationCenter'
  const routePath = ref<string | null>('/home')
  const routeKeys = ref<string[]>([])
  const navigate = (path: string) => {
    routePath.value = path
  }
  const updatePath = (path: string | null) => {
    routePath.value = path
  }
  const updateRouteKeys = (keys: string[]) => {
    routeKeys.value = keys
  }
  const nativeStringOptions = [
    { key: 'group', children: [{ key: 'home', label: 'Home' }] },
  ]
  const nativeMixedOptions = [
    { key: 'group', children: [{ key: 0, label: 'Zero' }] },
  ]
  type RecursiveMenuItem = {
    key: string
    label: string
    children?: RecursiveMenuItem[]
  }
  const recursiveOptions: RecursiveMenuItem[] = [
    { key: 'root', label: 'Root', children: [{ key: 'leaf', label: 'Leaf' }] },
  ]
  const mixedChildKey: MenuEmits<typeof nativeMixedOptions>['select'][0] = 0
  // @ts-expect-error 纯字符串菜单不应被推导为可输出数字键。
  const invalidStringKey: MenuEmits<typeof nativeStringOptions>['select'][0] = 0
  // @ts-expect-error 路由模式更新值依然只有字符串或 null。
  const invalidRouteKey: MenuEmits<undefined>['update:modelValue'][0] = 0
  void [mixedChildKey, invalidStringKey, invalidRouteKey]
  const updateNative = (key: string | number | null) => {
    active.value = key
  }
  const updateNumeric = (key: number | null) => {
    active.value = key
  }
  const active = ref<MenuKey | null>(0)
  const selected = ref<number[]>([])
  const titles = ['Available', 'Assigned'] as const
  const options = [
    { key: 0, label: 'Zero' },
    { key: 1, label: 'One' },
  ]
</script>
<template>
  <C_Menu
    :routes="[{ path: '/home', meta: { title: 'Home' } }]"
    v-model="routePath"
    @select="navigate"
    @intent="navigate"
    @update:model-value="updatePath"
    :expanded-keys="routeKeys"
    @update:expanded-keys="updateRouteKeys"
  />
  <C_Menu
    :options="nativeStringOptions"
    @select="navigate"
    @intent="navigate"
    @update:model-value="updatePath"
    @update:value="updatePath"
    @update:expanded-keys="updateRouteKeys"
  />
  <C_Menu
    :options="nativeMixedOptions"
    @select="updateNative"
    @update:model-value="updateNative"
  />
  <C_Menu
    :options="recursiveOptions"
    @select="navigate"
    @update:model-value="updatePath"
    @update:expanded-keys="updateRouteKeys"
  />
  <C_Menu
    v-model="active"
    :options="options"
    @select="updateNumeric"
    @update:model-value="updateNumeric"
  />
  <C_Transfer
    v-model="selected"
    :data="options"
    :titles="titles"
  />
  <C_NotificationCenter
    :auto-start="false"
    :category-options="[{ key: 'all', label: 'Inbox' }]"
  >
    <template #filters="{ controller }"
      ><span>{{ controller.unreadCount.value }}</span></template
    >
    <template #item-actions="{ message, busy, read }"
      ><button
        :disabled="busy"
        @click="read"
        >{{ message.title }}</button
      ></template
    >
  </C_NotificationCenter>
</template>
