<!--
 * @Description: 通用菜单组件 — 基于 NMenu 的树形导航菜单
 *
 * 支持两种数据输入模式：
 * 1. `options` — 直传 NMenu 原生 MenuOption[]（零转换，高级用户）
 * 2. `routes` — 传入路由数据，自动通过内置适配器转换为 MenuOption[]
 *
 * @example 路由模式（推荐）
 * ```vue
 * <C_Menu
 *   :routes="menuData"
 *   :label-formatter="$t"
 *   @select="router.push"
 * />
 * ```
 *
 * @example 原生模式
 * ```vue
 * <C_Menu
 *   :options="nMenuOptions"
 *   @select="router.push"
 * />
 * ```
 *
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
-->
<template>
  <NMenu
    ref="menuRef"
    :options="mergedOptions"
    :expanded-keys="expandedKeys"
    :value="activeKey"
    :mode="mode"
    :collapsed="collapsed"
    :collapsed-width="collapsedWidth"
    :collapsed-icon-size="collapsedIconSize"
    :inverted="inverted"
    :theme-overrides="themeOverrides"
    :dropdown-props="dropdownProps"
    :indent="indent"
    :root-indent="rootIndent"
    @update:value="handleMenuClick"
    @update:expanded-keys="onExpandedKeysChange"
  />
</template>

<script setup lang="ts">
  import { ref, computed, watch, nextTick } from 'vue'
  import { type MenuOption, type MenuInst } from 'naive-ui'
  import { createMenuOptions, type MenuAdapterConfig } from '../_shared'
  import type { MenuEmits, MenuProps } from './types'

  defineOptions({ name: 'C_Menu' })

  const props = withDefaults(defineProps<MenuProps>(), {
    mode: 'vertical',
    collapsed: false,
    collapsedWidth: 64,
    collapsedIconSize: 22,
    inverted: false,
    indent: 24,
    rootIndent: 16,
    dropdownProps: () => ({
      placement: 'right-start' as const,
      trigger: 'hover' as const,
      arrowStyle: { color: 'var(--n-color)' },
    }),
    defaultExpandedKeys: () => [],
  })

  const emit = defineEmits<MenuEmits>()

  const menuRef = ref<MenuInst | null>(null)
  const internalExpandedKeys = ref<string[]>([...props.defaultExpandedKeys])
  const expandedKeys = computed({
    get: () => props.expandedKeys ?? internalExpandedKeys.value,
    set: (keys: string[]) => {
      internalExpandedKeys.value = keys
      emit('update:expandedKeys', keys)
    },
  })

  const activeKey = computed(() =>
    props.modelValue !== undefined ? props.modelValue : (props.value ?? null)
  )

  // ====== 数据合成 ======

  /** 合并后的最终 MenuOption[] */
  const mergedOptions = computed<MenuOption[]>(() => {
    // 优先使用 options 直传模式
    if (props.options) return props.options

    // routes 模式 → 适配器转换
    if (props.routes) {
      const config: MenuAdapterConfig = {
        ...props.adapterConfig,
        ...(props.labelFormatter && { labelFormatter: props.labelFormatter }),
      }
      return createMenuOptions(props.routes, config)
    }

    return []
  })

  // ====== 展开逻辑 ======

  /** 从 MenuOption[] 中查找所有祖先 key */
  const findParentKeys = (
    items: MenuOption[],
    targetKey: string,
    parentKeys: string[] = []
  ): string[] => {
    for (const item of items) {
      const children = item.children as MenuOption[] | undefined
      if (children?.length) {
        const currentKeys = [...parentKeys, item.key as string]
        if (children.some(child => child.key === targetKey)) {
          return currentKeys
        }
        const result = findParentKeys(children, targetKey, currentKeys)
        if (result.length > 0) return result
      }
    }
    return []
  }

  /** 通过路径段推导展开 key + 查找祖先 key */
  const computeExpandedKeys = (path: string): Set<string> => {
    const segments = path.split('/').filter(Boolean)
    const keys = new Set<string>()
    let currentPath = ''
    segments.forEach(segment => {
      currentPath += `/${segment}`
      keys.add(currentPath)
    })
    findParentKeys(mergedOptions.value, path).forEach(key => keys.add(key))
    return keys
  }

  // ====== 事件处理 ======

  const handleMenuClick = (key: string) => {
    if (!key) return
    if (key !== activeKey.value) {
      emit('update:modelValue', key)
      emit('update:value', key)
    }
    emit('select', key)
  }

  const onExpandedKeysChange = (keys: string[]) => {
    expandedKeys.value = keys
  }

  // ====== 暴露方法 ======
  const showOption = (key: string) => menuRef.value?.showOption(key)
  defineExpose({ showOption, menuRef })

  // ====== 路由跟踪 ======

  watch(
    () => activeKey.value,
    newKey => {
      if (!newKey) return
      const newKeys = computeExpandedKeys(newKey)
      expandedKeys.value = Array.from(
        new Set([...expandedKeys.value, ...newKeys])
      )
      nextTick(() => menuRef.value?.showOption(newKey))
    },
    { immediate: true }
  )
</script>
