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
  import { ref, computed, watch, nextTick, onMounted } from 'vue'
  import {
    type MenuOption,
    type MenuInst,
    type DropdownProps,
  } from 'naive-ui/es'
  import {
    createMenuOptions,
    type RouteItem,
    type MenuAdapterConfig,
  } from '../_shared'

  defineOptions({ name: 'C_Menu' })

  const props = withDefaults(
    defineProps<{
      /**
       * 模式一：直传 NMenu 原生 MenuOption[]
       * 与 `routes` 二选一，`options` 优先级更高
       */
      options?: MenuOption[]
      /**
       * 模式二：传入路由数据，自动转换为 MenuOption[]
       * 兼容 Vue Router RouteRecordRaw / 后端 JSON 路由表
       */
      routes?: RouteItem[]
      /**
       * 适配器配置（仅 routes 模式生效）
       * 可自定义 key/label/icon 取值、过滤逻辑等
       */
      adapterConfig?: MenuAdapterConfig
      /**
       * 标签文本格式化函数（routes 模式的快捷方式）
       * 等同于 `adapterConfig.labelFormatter`，但优先级更高
       */
      labelFormatter?: (label: string) => string
      /** 当前激活的菜单 key */
      value?: string
      /** 菜单模式 */
      mode?: 'vertical' | 'horizontal'
      /** 是否折叠 */
      collapsed?: boolean
      /** 折叠宽度 */
      collapsedWidth?: number
      /** 折叠图标大小 */
      collapsedIconSize?: number
      /** 是否反色 */
      inverted?: boolean
      /** 主题覆盖 */
      themeOverrides?: Record<string, any>
      /** 缩进像素 */
      indent?: number
      /** 根缩进像素 */
      rootIndent?: number
      /** 下拉菜单属性（折叠模式） */
      dropdownProps?: DropdownProps
    }>(),
    {
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
    }
  )

  const emit = defineEmits<{
    /** 菜单项被选中 */
    select: [key: string]
    /** 展开项变化 */
    'update:expandedKeys': [keys: string[]]
  }>()

  const menuRef = ref<MenuInst | null>(null)
  const expandedKeys = ref<string[]>([])

  const activeKey = computed(() => props.value ?? '')

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
    if (key && key !== activeKey.value) {
      emit('select', key)
    }
  }

  const onExpandedKeysChange = (keys: string[]) => {
    expandedKeys.value = keys
    emit('update:expandedKeys', keys)
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

  onMounted(() => {
    nextTick(() => {
      if (activeKey.value) {
        expandedKeys.value = Array.from(computeExpandedKeys(activeKey.value))
        menuRef.value?.showOption(activeKey.value)
      }
    })
  })
</script>
