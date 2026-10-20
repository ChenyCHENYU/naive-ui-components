<!--
 * @Description: 路径层级与目录快捷导航；数据、权限与导航写操作由宿主提供。
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
-->
<template>
  <nav
    ref="rootRef"
    class="c-breadcrumb"
    :aria-label="t('breadcrumb.label')"
    :style="themeStyle"
  >
    <ol class="c-breadcrumb__path">
      <li
        v-for="entry in visibleEntries"
        :key="entry.key"
        class="c-breadcrumb__item"
        :class="{
          'is-current': entry.item && isCurrent(entry.item, entry.index),
        }"
      >
        <span
          v-if="entry.item && isCurrent(entry.item, entry.index)"
          class="c-breadcrumb__current"
          aria-current="page"
          :title="entry.item.label"
        >
          <C_Icon
            v-if="showIcon && entry.item.icon"
            aria-hidden="true"
            :name="entry.item.icon"
            :size="iconSize"
          />
          <span class="c-breadcrumb__label">{{ entry.item.label }}</span>
        </span>
        <NPopover
          v-else-if="entry.overflow || entry.item?.children?.length"
          trigger="click"
          :placement="panelPlacement"
          :show="openKey === entry.key"
          :show-arrow="false"
          :style="popoverStyle"
          class="c-breadcrumb-popover"
          :disabled="entry.item?.disabled"
          @update:show="updatePanel($event, entry.key)"
        >
          <template #trigger>
            <button
              type="button"
              class="c-breadcrumb__trigger"
              :class="{ 'is-open': openKey === entry.key }"
              :disabled="entry.item?.disabled"
              aria-haspopup="tree"
              :aria-expanded="openKey === entry.key"
              :aria-label="
                entry.overflow ? t('breadcrumb.expandPath') : entry.item?.label
              "
              :title="entry.item?.label"
              @click="rememberTrigger"
            >
              <C_Icon
                v-if="entry.item && showIcon && entry.item.icon"
                aria-hidden="true"
                :name="entry.item.icon"
                :size="iconSize"
              />
              <span class="c-breadcrumb__label">{{
                entry.overflow ? '…' : entry.item?.label
              }}</span>
              <svg
                v-if="!entry.overflow"
                class="c-breadcrumb__chevron"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="m5 6 3 3 3-3"
                  stroke="currentColor"
                  stroke-width="1.4"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          </template>
          <section
            v-if="openKey === entry.key"
            class="c-breadcrumb-panel"
            :style="themeStyle"
            :aria-label="
              entry.overflow ? t('breadcrumb.fullPath') : entry.item?.label
            "
            @keydown.esc.stop.prevent="closePanel(true)"
            @focusout="handlePanelBlur"
          >
            <header class="c-breadcrumb-panel__header">
              <span
                class="c-breadcrumb-panel__icon"
                aria-hidden="true"
                ><svg
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"
                    stroke="currentColor"
                    stroke-width="1.6"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M3 10h18"
                    stroke="currentColor"
                    stroke-width="1.6"
                  /></svg
              ></span>
              <div class="c-breadcrumb-panel__heading"
                ><h2>{{
                  entry.overflow ? t('breadcrumb.fullPath') : entry.item?.label
                }}</h2
                ><small>{{
                  t('breadcrumb.pageCount', {
                    count: countPages(panelItems(entry)),
                  })
                }}</small></div
              >
            </header>
            <div class="c-breadcrumb-panel__body">
              <BreadcrumbMenu
                :items="panelItems(entry)"
                :current-key="currentPath"
                :show-icon="showIcon"
                :icon-size="iconSize"
                @select="selectItem"
              />
            </div>
          </section>
        </NPopover>
        <button
          v-else-if="entry.item"
          type="button"
          class="c-breadcrumb__link"
          :disabled="entry.item.disabled"
          :title="entry.item.label"
          @click="selectItem(entry.item.key)"
        >
          <C_Icon
            v-if="showIcon && entry.item.icon"
            aria-hidden="true"
            :name="entry.item.icon"
            :size="iconSize"
          />
          <span class="c-breadcrumb__label">{{ entry.item.label }}</span>
        </button>
        <span
          class="c-breadcrumb__separator"
          aria-hidden="true"
          >/</span
        >
      </li>
    </ol>
  </nav>
</template>

<script setup lang="ts">
  import {
    computed,
    inject,
    nextTick,
    onBeforeUnmount,
    onMounted,
    ref,
    watch,
  } from 'vue'
  import { routeLocationKey } from 'vue-router'
  import { NPopover, useThemeVars } from 'naive-ui'
  import { C_Icon } from '../C_Icon'
  import BreadcrumbMenu from './BreadcrumbMenu.vue'
  import {
    resolveBreadcrumbItems,
    countBreadcrumbPages as countPages,
  } from './model'
  import { useComponentLocale } from '../../config'
  import type { BreadcrumbItem } from '../_shared/public'
  import type { BreadcrumbMenuItem } from './types'

  defineOptions({ name: 'C_Breadcrumb' })
  const props = withDefaults(
    defineProps<{
      /** 手动路径，标签沿用传入值。 */
      items?: readonly BreadcrumbItem[]
      /** 授权后的菜单树；提供时（含空数组）作为目录的唯一数据来源。 */
      menus?: readonly BreadcrumbMenuItem[]
      showIcon?: boolean
      iconSize?: number
      /** 自动路径和菜单标签的翻译函数。 */
      labelFormatter?: (label: string) => string
    }>(),
    { showIcon: true, iconSize: 16 }
  )
  const emit = defineEmits<{ select: [path: string] }>()
  const route = inject(routeLocationKey, undefined)
  const currentPath = computed(() => route?.path ?? '')
  const theme = useThemeVars()
  const { t } = useComponentLocale()
  const rootRef = ref<HTMLElement | null>(null)
  const openKey = ref<string | null>(null)
  const panelPlacement = ref<'bottom-start' | 'bottom-end'>('bottom-start')
  const panelWidth = ref(320)
  const availableWidth = ref(Number.POSITIVE_INFINITY)
  let triggerElement: HTMLButtonElement | null = null
  let resizeObserver: ResizeObserver | undefined
  let disposed = false
  const breadcrumbItems = computed(() =>
    !route && props.items === undefined
      ? []
      : resolveBreadcrumbItems({
          items: props.items,
          menus: props.menus,
          matched: route?.matched ?? [],
          path: currentPath.value,
          formatLabel: props.labelFormatter,
        })
  )
  const themeStyle = computed(() => ({
    '--c-breadcrumb-icon-size': `${props.iconSize}px`,
    '--c-breadcrumb-gap': `${Math.max(Math.round(props.iconSize / 4), 2)}px`,
    '--c-crumb-text': theme.value.textColor2,
    '--c-crumb-muted': theme.value.textColor3,
    '--c-crumb-current': theme.value.textColor1,
    '--c-crumb-primary': theme.value.primaryColor,
    '--c-crumb-border': theme.value.borderColor,
    '--c-crumb-hover': theme.value.hoverColor,
  }))
  const popoverStyle = computed(() => ({
    boxSizing: 'border-box' as const,
    width: `${panelWidth.value}px`,
    padding: '0',
    borderRadius: '12px',
    overflow: 'hidden',
    border: `1px solid ${theme.value.borderColor}`,
    background: theme.value.popoverColor,
    boxShadow: theme.value.boxShadow2,
    maxWidth: 'calc(100vw - 24px)',
  }))
  interface PathEntry {
    key: string
    index: number
    item?: BreadcrumbItem
    overflow?: readonly BreadcrumbItem[]
  }
  const visibleEntries = computed<PathEntry[]>(() => {
    const entries = breadcrumbItems.value.map((item, index) => ({
      key: `${index}:${item.key}`,
      index,
      item,
    }))
    if (entries.length < 2) return entries
    const last = entries[entries.length - 1]
    if (availableWidth.value < 260)
      return [
        {
          key: 'overflow',
          index: -1,
          overflow: breadcrumbItems.value.slice(0, -1),
        },
        last,
      ]
    if (availableWidth.value < 360 && entries.length > 2)
      return [
        entries[0],
        {
          key: 'overflow',
          index: -1,
          overflow: breadcrumbItems.value.slice(1, -1),
        },
        last,
      ]
    return entries
  })
  const isCurrent = (item: BreadcrumbItem, index: number): boolean =>
    item.key === currentPath.value ||
    (props.items !== undefined &&
      index === breadcrumbItems.value.length - 1 &&
      !item.children?.length)
  // 完整路径只保留最外层分支，避免祖先各自携带的子树重复展示和计数。
  const overflowItems = computed(() => {
    const covered = new Set<string>()
    const visit = (items: readonly BreadcrumbItem[]): void => {
      for (const item of items) {
        covered.add(item.key)
        if (item.children) visit(item.children)
      }
    }
    for (const item of breadcrumbItems.value) visit(item.children ?? [])
    return breadcrumbItems.value.filter(item => !covered.has(item.key))
  })
  const panelItems = (entry: PathEntry): readonly BreadcrumbItem[] =>
    entry.overflow ? overflowItems.value : (entry.item?.children ?? [])
  /** 依据触发按钮两侧的可用空间对齐，保持浮层在视口内并支持 Escape 恢复焦点。 */
  const rememberTrigger = (event: MouseEvent): void => {
    if (!(event.currentTarget instanceof HTMLButtonElement)) return
    triggerElement = event.currentTarget
    const viewportWidth = document.documentElement.clientWidth
    if (viewportWidth <= 0) return
    const rect = triggerElement.getBoundingClientRect()
    const desiredWidth = Math.min(320, Math.max(viewportWidth - 24, 1))
    const startSpace = viewportWidth - rect.left - 12
    const endSpace = rect.right - 12
    const alignStart =
      startSpace >= desiredWidth ||
      (endSpace < desiredWidth && startSpace >= endSpace)
    panelPlacement.value = alignStart ? 'bottom-start' : 'bottom-end'
    panelWidth.value = Math.max(
      Math.min(desiredWidth, alignStart ? startSpace : endSpace),
      1
    )
  }
  const updatePanel = (show: boolean, key: string): void => {
    openKey.value = show ? key : openKey.value === key ? null : openKey.value
  }
  const closePanel = (restoreFocus = false): void => {
    openKey.value = null
    if (restoreFocus)
      void nextTick(() => {
        if (!disposed && triggerElement?.isConnected) triggerElement.focus()
      })
  }
  /** 键盘焦点离开浮层时关闭，保留用户的新焦点位置。 */
  const handlePanelBlur = (event: FocusEvent): void => {
    if (
      event.currentTarget instanceof HTMLElement &&
      !event.currentTarget.contains(
        event.relatedTarget instanceof Node ? event.relatedTarget : null
      )
    )
      closePanel()
  }
  const selectItem = (key: string): void => {
    closePanel(true)
    if (key !== currentPath.value) emit('select', key)
  }
  watch([() => route?.fullPath, breadcrumbItems], () => closePanel())
  onMounted(() => {
    if (typeof ResizeObserver !== 'undefined' && rootRef.value) {
      resizeObserver = new ResizeObserver(([entry]) => {
        if (disposed || !entry) return
        if (availableWidth.value !== entry.contentRect.width) closePanel()
        availableWidth.value = entry.contentRect.width
      })
      resizeObserver.observe(rootRef.value)
    }
  })
  onBeforeUnmount(() => {
    disposed = true
    resizeObserver?.disconnect()
    triggerElement = null
  })
</script>

<style lang="scss" scoped>
  @use './index.scss';
</style>
