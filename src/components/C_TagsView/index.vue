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
          v-for="tag in tags.tagsViewList.value"
          :key="tag.path"
          :type="isActive(tag) ? 'primary' : 'default'"
          :closable="!isAffix(tag)"
          :data-path="tag.path"
          @close.stop="handleClose(tag)"
          @click="navigateToTag(tag)"
          @contextmenu.prevent="(e: MouseEvent) => showContextMenu(e, tag)"
        >
          <template #icon>
            <C_Icon
              v-if="tag.icon"
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
  import { ref, computed, watch, nextTick, h, onBeforeUnmount } from 'vue'
  import {
    useRoute,
    useRouter,
    isNavigationFailure,
    NavigationFailureType,
  } from 'vue-router'
  import { C_Icon } from '../C_Icon'
  import type { TagItem } from '../_shared/public'
  import { useTagsView, type UseTagsViewOptions } from './useTagsView'
  import type { ContextMenuLabels } from './types'

  defineOptions({ name: 'C_TagsView' })

  interface LegacyContextMenuLabels extends ContextMenuLabels {
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
      contextMenuLabels?: LegacyContextMenuLabels
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

  const createCurrentTag = (): TagItem => {
    const isHome = route.path === props.homePath
    const originalTitle = isHome
      ? props.homeTitle
      : (route.meta.title as string) || 'Unnamed Page'
    return {
      path: route.path,
      originalTitle,
      title: formatLabel(originalTitle),
      icon: isHome ? props.homeIcon : (route.meta.icon as string),
      meta: { affix: route.meta.affix as boolean },
    }
  }

  // ====== UI State ======

  const contextMenuVisible = ref(false)
  const contextMenuX = ref(0)
  const contextMenuY = ref(0)
  const selectedTag = ref<TagItem | null>(null)
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
      const targetTag = [
        ...(tagsContainer.value?.querySelectorAll<HTMLElement>('[data-path]') ??
          []),
      ].find(tag => tag.dataset.path === path)
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
      void router.push(tag.path).catch(() => undefined)
    }
    scrollToTag(tag.path)
  }

  let closeVersion = 0
  let disposed = false

  const navigateForClose = async (path: string) => {
    try {
      const failure = await router.push(path)
      return (
        !isNavigationFailure(failure) ||
        isNavigationFailure(failure, NavigationFailureType.duplicated)
      )
    } catch {
      return false
    }
  }

  const applyClosedTags = async (
    remaining: TagItem[],
    fallbackPath: string,
    forceNavigate = false
  ) => {
    const version = ++closeVersion
    const shouldNavigate =
      forceNavigate || !remaining.some(tag => tag.path === route.path)
    if (shouldNavigate && !(await navigateForClose(fallbackPath))) return false
    if (disposed || version !== closeVersion) return false
    // 导航成功才提交关闭结果。重定向可能落到其他页面，保留该页的活动标签。
    const active =
      tags.tagsViewList.value.find(tag => tag.path === route.path) ??
      createCurrentTag()

    tags.initTags(
      !remaining.some(tag => tag.path === active.path)
        ? [...remaining, active]
        : remaining
    )
    tags.setActiveTag(route.path)
    scrollToTag(route.path)
    return true
  }

  const handleClose = async (tag: TagItem) => {
    if (isAffix(tag)) return
    const current = tags.tagsViewList.value
    const index = current.findIndex(item => item.path === tag.path)
    if (index === -1) return
    const wasActive = isActive(tag)
    const remaining = current.filter(item => item.path !== tag.path)
    const fallbackPath =
      index === current.length - 1
        ? remaining[index - 1]?.path || props.homePath
        : remaining[remaining.length - 1]?.path || props.homePath
    if ((await applyClosedTags(remaining, fallbackPath)) && wasActive)
      emit('close', fallbackPath)
  }

  onBeforeUnmount(() => {
    disposed = true
    closeVersion += 1
  })

  const showContextMenu = (event: MouseEvent, tag: TagItem) => {
    event.preventDefault()
    selectedTag.value = tag
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

  const handleContextMenuSelect = async (key: string) => {
    const selected = selectedTag.value
    const current = tags.tagsViewList.value
    const index = current.findIndex(tag => tag.path === selected?.path)
    closeContextMenu()
    if (!selected || index === -1) return
    if (key === 'close') {
      await handleClose(selected)
      return
    }
    const retained = current.filter((tag, position) => {
      if (tag.meta?.affix) return true
      if (key === 'closeOthers') return position === 0 || position === index
      if (key === 'closeLeft') return position === 0 || position >= index
      if (key === 'closeRight') return position <= index
      return key !== 'closeAll'
    })
    if (!['closeOthers', 'closeLeft', 'closeRight', 'closeAll'].includes(key))
      return
    const fallbackPath = key === 'closeAll' ? props.homePath : selected.path
    if (
      (await applyClosedTags(retained, fallbackPath, key === 'closeAll')) &&
      key === 'closeAll'
    )
      emit('closeAll')
  }

  // ====== 路由自动跟踪 ======
  watch(
    () => route.path,
    (newPath: string) => {
      tags.addTag(createCurrentTag())

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
