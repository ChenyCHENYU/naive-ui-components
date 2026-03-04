<!--
 * @Description: 通用面包屑组件 — 基于 NBreadcrumb 的路由面包屑导航
 *
 * 支持两种模式：
 * 1. 自动模式（默认）— 从 `route.matched` 自动生成面包屑
 * 2. 手动模式 — 传入 `items` 完全自定义
 *
 * @example 自动模式（零配置）
 * ```vue
 * <C_Breadcrumb
 *   :label-formatter="$t"
 *   @select="router.push"
 * />
 * ```
 *
 * @example 手动模式
 * ```vue
 * <C_Breadcrumb
 *   :items="customBreadcrumbs"
 *   @select="handleSelect"
 * />
 * ```
 *
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
-->
<template>
  <div
    class="c-breadcrumb flex-1 min-w-0"
    :style="{
      '--c-breadcrumb-icon-size': `${iconSize}px`,
      '--c-breadcrumb-gap': `${Math.max(Math.round(iconSize / 4), 2)}px`,
    }"
  >
    <NBreadcrumb>
      <NBreadcrumbItem
        v-for="(item, index) in breadcrumbItems"
        :key="index"
      >
        <NDropdown
          v-if="item.children?.length"
          :options="item.children"
          @select="handleSelect"
        >
          <div class="c-breadcrumb__trigger">
            <C_Icon
              v-if="showIcon"
              :name="item.icon"
              :size="iconSize"
            />
            {{ item.label }}
          </div>
        </NDropdown>
        <span
          v-else
          class="c-breadcrumb__link"
          @click="handleSelect(item.key)"
        >
          <C_Icon
            v-if="showIcon"
            :name="item.icon"
            :size="iconSize"
          />
          {{ item.label }}
        </span>
      </NBreadcrumbItem>
    </NBreadcrumb>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { useRoute } from 'vue-router'
  import { C_Icon } from '../C_Icon'
  import type { BreadcrumbItem } from '../_shared'

  defineOptions({ name: 'C_Breadcrumb' })

  const props = withDefaults(
    defineProps<{
      /**
       * 手动传入面包屑数据
       * 不传时自动从 `route.matched` 生成（零配置）
       */
      items?: BreadcrumbItem[]
      /** 是否显示图标 */
      showIcon?: boolean
      /** 图标大小 (px)，默认 16 */
      iconSize?: number
      /**
       * 标签文本格式化函数（用于 i18n）
       * 仅在自动模式下生效
       */
      labelFormatter?: (label: string) => string
    }>(),
    {
      showIcon: true,
      iconSize: 16,
    }
  )

  const emit = defineEmits<{
    /** 面包屑项被选中（返回路径 key） */
    select: [path: string]
  }>()

  const route = useRoute()

  const formatLabel = (title: string): string =>
    props.labelFormatter ? props.labelFormatter(title) : title

  /** 从 route.matched 自动生成面包屑 */
  const autoBreadcrumb = computed<BreadcrumbItem[]>(() => {
    return route.matched
      .filter((record: any) => record.meta?.title)
      .map((record: any) => ({
        key: record.path,
        label: formatLabel((record.meta.title || '') as string),
        icon: record.meta.icon as string | undefined,
        children: record.children?.length
          ? record.children.map((child: any) => ({
              key: child.path,
              label: formatLabel((child.meta?.title || '') as string),
              ...(child.children?.length && {
                children: child.children.map((grandChild: any) => ({
                  key: grandChild.path,
                  label: formatLabel((grandChild.meta?.title || '') as string),
                })),
              }),
            }))
          : [],
      }))
  })

  const breadcrumbItems = computed<BreadcrumbItem[]>(
    () => props.items ?? autoBreadcrumb.value
  )

  const handleSelect = (key: string) => {
    emit('select', key)
  }
</script>

<style lang="scss">
  .c-breadcrumb {
    // 暴露 CSS 变量，方便主项目覆盖
    --c-breadcrumb-icon-size: 16px;
    --c-breadcrumb-gap: 4px;
    --c-breadcrumb-font-size: inherit;

    display: flex;
    align-items: center;
    height: 100%;

    &__trigger,
    &__link {
      display: inline-flex;
      align-items: center;
      gap: var(--c-breadcrumb-gap);
      font-size: var(--c-breadcrumb-font-size);
      line-height: 1;
      cursor: pointer;
    }

    // 确保 C_Icon 在面包屑中尺寸一致
    .c-icon {
      flex-shrink: 0;
    }

    // 修复分隔符 "/" 与文本/图标垂直居中对齐
    // 原因：Naive UI 分隔符默认 line-height (~1.4) 导致 "/" 基线偏低
    .n-breadcrumb-item {
      display: inline-flex !important;
      align-items: center;

      .n-breadcrumb-item__separator {
        display: inline-flex;
        align-items: center;
        line-height: 1;
        margin-top: -4px;
      }
    }
  }
</style>
