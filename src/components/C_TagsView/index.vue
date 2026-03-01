<!--
 * @Description: 通用标签页导航组件 — 路由感知的多标签管理
 *
 * 内置功能：
 * - 路由变化自动添加标签
 * - 持久化（localStorage，可关闭）
 * - 右键菜单（关闭/关闭其他/关闭左侧/关闭右侧/关闭所有）
 * - 水平滚轮滚动
 * - i18n 支持（labelFormatter）
 *
 * @example 基础用法
 * ```vue
 * <C_TagsView
 *   :label-formatter="$t"
 *   @select="router.push"
 * />
 * ```
 *
 * @example 自定义首页 + 菜单文案
 * ```vue
 * <C_TagsView
 *   home-path="/dashboard"
 *   home-title="Dashboard"
 *   :context-menu-labels="{ close: 'Close', closeAll: 'Close All', ... }"
 * />
 * ```
 *
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
-->
<template>
  <div class="tags-view-container">
    <div
      class="tags-track"
      ref="tagsTrack"
      @wheel="handleWheel"
    >
      <div
        class="tags-container"
        ref="tagsContainer"
      >
        <NTag
          v-for="(tag, index) in tags.tagsViewList.value"
          :key="tag.path"
          :type="isActive(tag) ? 'primary' : 'default'"
          :closable="!isAffix(tag)"
          :data-path="tag.path"
          @close.stop="handleClose(tag, index)"
          @click="navigateToTag(tag)"
          @contextmenu.prevent="
            (e: MouseEvent) => showContextMenu(e, tag, index)
          "
        >
          <template #icon>
            <C_Icon
              :name="tag.icon"
              :size="12"
            />
          </template>
          {{ tag.title }}
        </NTag>
      </div>
    </div>
    <NDropdown
      v-if="contextMenuVisible"
      :show="contextMenuVisible"
      :options="contextMenuOptions"
      :x="contextMenuX"
      :y="contextMenuY"
      @clickoutside="closeContextMenu"
      @select="handleContextMenuSelect"
    />
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, watch, nextTick, h } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { C_Icon } from '../C_Icon'
  import type { TagItem } from '../_shared'
  import { useTagsView, type UseTagsViewOptions } from './useTagsView'

  defineOptions({ name: 'C_TagsView' })

  export interface ContextMenuLabels {
    close?: string
    closeOthers?: string
    closeLeft?: string
    closeRight?: string
    closeAll?: string
  }

  const props = withDefaults(
    defineProps<{
      /**
       * 标签文本格式化函数（用于 i18n）
       */
      labelFormatter?: (label: string) => string
      /** 首页路径 */
      homePath?: string
      /** 首页标题（原始文本） */
      homeTitle?: string
      /** 首页图标 */
      homeIcon?: string
      /** 持久化 localStorage key，传空字符串禁用 */
      persistKey?: string
      /** 右键菜单文案（国际化适配） */
      contextMenuLabels?: ContextMenuLabels
      /** useTagsView 配置项（优先级最高） */
      tagsViewOptions?: UseTagsViewOptions
    }>(),
    {
      homePath: '/home',
      homeTitle: '首页',
      homeIcon: 'mdi:home',
      persistKey: '__tags_view_list__',
      contextMenuLabels: () => ({
        close: '关闭',
        closeOthers: '关闭其他',
        closeLeft: '关闭左侧',
        closeRight: '关闭右侧',
        closeAll: '关闭所有',
      }),
    }
  )

  const emit = defineEmits<{
    /** 标签被关闭后跳转 */
    close: [fallbackPath: string]
    /** 关闭全部后 */
    closeAll: []
  }>()

  const route = useRoute()
  const router = useRouter()

  // ====== Tags composable ======
  const tags = useTagsView(
    props.tagsViewOptions ?? {
      persistKey: props.persistKey,
      homePath: props.homePath,
    }
  )

  // ====== 首次渲染前重新翻译持久化标签 ======
  if (tags.tagsViewList.value.length > 0 && props.labelFormatter) {
    const allRoutes = router.getRoutes()
    const translatedTags = tags.tagsViewList.value.map(tag => {
      const matchedRoute = allRoutes.find(r => r.path === tag.path)
      const originalTitle =
        tag.originalTitle || (matchedRoute?.meta?.title as string) || tag.title
      return {
        ...tag,
        originalTitle,
        title: props.labelFormatter!(originalTitle),
      }
    })
    tags.initTags(translatedTags)
  }

  const formatLabel = (title: string): string =>
    props.labelFormatter ? props.labelFormatter(title) : title

  // ====== UI State ======

  const contextMenuVisible = ref(false)
  const contextMenuX = ref(0)
  const contextMenuY = ref(0)
  const selectedTag = ref<TagItem | null>(null)
  const selectedIndex = ref(-1)
  const tagsTrack = ref<HTMLElement>()
  const tagsContainer = ref<HTMLElement>()

  // ====== Helpers ======
  const isActive = (tag: TagItem): boolean => tag.path === route.path
  const isAffix = (tag: TagItem) => tag.meta?.affix

  const handleWheel = (e: WheelEvent) => {
    const container = tagsContainer.value
    if (!container) return
    e.preventDefault()
    container.scrollTo({
      left: container.scrollLeft + e.deltaY,
      behavior: 'smooth',
    })
  }

  const scrollToTag = (path: string) => {
    nextTick(() => {
      const targetTag = tagsContainer.value?.querySelector(
        `[data-path="${path}"]`
      ) as HTMLElement
      if (targetTag) {
        targetTag.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        })
      }
    })
  }

  // ====== Actions ======

  const navigateToTag = (tag: TagItem) => {
    if (tag.path !== route.path) {
      router.push(tag.path)
    }
    scrollToTag(tag.path)
  }

  const handleClose = (tag: TagItem, index: number) => {
    if (isAffix(tag)) return

    const wasActive = isActive(tag)
    const tagsBeforeRemove = tags.tagsViewList.value.length
    tags.removeTag(index)

    if (wasActive) {
      const remaining = tags.tagsViewList.value
      const wasLastTag = index === tagsBeforeRemove - 1
      let fallbackPath: string

      if (wasLastTag) {
        fallbackPath = remaining[index - 1]?.path || props.homePath
      } else {
        fallbackPath = remaining[remaining.length - 1]?.path || props.homePath
      }

      router.push(fallbackPath)
      emit('close', fallbackPath)
    }
  }

  const showContextMenu = (event: MouseEvent, tag: TagItem, index: number) => {
    event.preventDefault()
    selectedTag.value = tag
    selectedIndex.value = index
    contextMenuVisible.value = true
    contextMenuX.value = event.clientX
    contextMenuY.value = event.clientY
  }

  const closeContextMenu = () => (contextMenuVisible.value = false)

  const contextMenuOptions = computed(() => {
    const labels = props.contextMenuLabels
    return [
      {
        type: 'option' as const,
        label: labels.close ?? '关闭',
        key: 'close',
        disabled: isAffix(selectedTag.value as TagItem),
        icon: () => h('span', { class: 'i-mdi:close' }),
      },
      {
        type: 'option' as const,
        label: labels.closeOthers ?? '关闭其他',
        key: 'closeOthers',
        icon: () => h('span', { class: 'i-mdi:arrow-left-right-bold' }),
      },
      {
        type: 'option' as const,
        label: labels.closeLeft ?? '关闭左侧',
        key: 'closeLeft',
        icon: () => h('span', { class: 'i-mdi:align-horizontal-left' }),
      },
      {
        type: 'option' as const,
        label: labels.closeRight ?? '关闭右侧',
        key: 'closeRight',
        icon: () => h('span', { class: 'i-mdi:align-horizontal-right' }),
      },
      {
        type: 'option' as const,
        label: labels.closeAll ?? '关闭所有',
        key: 'closeAll',
        icon: () => h('span', { class: 'i-mdi:tally-mark-5' }),
      },
    ]
  })

  const handleContextMenuSelect = (key: string) => {
    if (!selectedTag.value || selectedIndex.value === -1) return

    switch (key) {
      case 'close':
        handleClose(selectedTag.value, selectedIndex.value)
        break
      case 'closeOthers':
        tags.removeOtherTags(selectedIndex.value)
        break
      case 'closeLeft':
        tags.removeLeftTags(selectedIndex.value)
        break
      case 'closeRight':
        tags.removeRightTags(selectedIndex.value)
        break
      case 'closeAll':
        tags.removeAllTags()
        router.push(props.homePath)
        emit('closeAll')
        break
    }
    closeContextMenu()
  }

  // ====== 路由自动跟踪 ======
  watch(
    () => route.path,
    (newPath: string) => {
      const originalTitle =
        newPath === props.homePath
          ? props.homeTitle
          : (route.meta.title as string) || 'Unnamed Page'

      tags.addTag({
        path: newPath,
        originalTitle,
        title: formatLabel(originalTitle),
        icon:
          newPath === props.homePath
            ? props.homeIcon
            : (route.meta.icon as string),
        meta: { affix: route.meta.affix as boolean },
      })

      tags.setActiveTag(newPath)
      scrollToTag(newPath)
    },
    { immediate: true }
  )

  // ====== 暴露 ======
  defineExpose({
    /** useTagsView composable 实例 */
    tags,
    /** 滚动到指定标签 */
    scrollToTag,
  })
</script>

<style lang="scss" scoped>
  @use './index.scss';
</style>
