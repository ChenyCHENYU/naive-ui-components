<!--
 * @Description: 面包屑目录的递归页面列表与键盘导航。
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
-->
<template>
  <ul
    ref="listRef"
    class="c-breadcrumb-menu"
    :role="level === 0 ? 'tree' : 'group'"
    :aria-label="level === 0 ? t('breadcrumb.directoryPages') : undefined"
    @keydown="handleKeydown"
    @focusin="handleFocus"
  >
    <li
      v-for="item in items"
      :key="item.key"
      role="none"
      class="c-breadcrumb-menu__item"
    >
      <button
        type="button"
        role="treeitem"
        tabindex="-1"
        :aria-level="level + 1"
        :aria-expanded="
          item.children?.length ? expanded.has(item.key) : undefined
        "
        :aria-current="item.key === currentKey ? 'page' : undefined"
        :disabled="
          item.disabled || (!item.children?.length && item.key === currentKey)
        "
        :class="
          item.children?.length
            ? 'c-breadcrumb-menu__directory'
            : 'c-breadcrumb-menu__page'
        "
        :title="item.label"
        @click="activate(item)"
      >
        <span
          v-if="showIcon"
          class="c-breadcrumb-menu__icon"
          :class="{ 'is-directory': item.children?.length }"
          aria-hidden="true"
        >
          <C_Icon
            v-if="showIcon && item.icon"
            :name="item.icon"
            :size="Math.min(iconSize, 18)"
          />
          <svg
            v-else
            viewBox="0 0 20 20"
            fill="none"
          >
            <path
              v-if="item.children?.length"
              d="M2.5 6a1.5 1.5 0 0 1 1.5-1.5h4l1.5 1.5H16a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 16 16H4a1.5 1.5 0 0 1-1.5-1.5Z"
              stroke="currentColor"
              stroke-width="1.4"
            />
            <path
              v-else
              d="M6 2.5h5l3 3v12H6a1.5 1.5 0 0 1-1.5-1.5V4A1.5 1.5 0 0 1 6 2.5Zm4.5 0v4H14M7 10h5m-5 3h5"
              stroke="currentColor"
              stroke-width="1.3"
              stroke-linejoin="round"
            />
          </svg>
        </span>
        <span class="c-breadcrumb-menu__label">{{ item.label }}</span>
        <span
          v-if="item.children?.length"
          class="c-breadcrumb-menu__count"
          >{{ countPages(item.children) }}</span
        >
        <span
          v-else-if="item.key === currentKey"
          class="c-breadcrumb-menu__current"
          >{{ t('breadcrumb.current') }}</span
        >
        <svg
          v-if="item.children?.length"
          class="c-breadcrumb-menu__chevron"
          :class="{ 'is-expanded': expanded.has(item.key) }"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="m6 4 4 4-4 4"
            stroke="currentColor"
            stroke-width="1.4"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
      <BreadcrumbMenu
        v-if="item.children?.length && expanded.has(item.key)"
        :items="item.children"
        :current-key="currentKey"
        :level="level + 1"
        :show-icon="showIcon"
        :icon-size="iconSize"
        @select="emit('select', $event)"
      />
    </li>
  </ul>
</template>
<script setup lang="ts">
  import { nextTick, onMounted, ref, watch } from 'vue'
  import { C_Icon } from '../C_Icon'
  import { useComponentLocale } from '../../config'
  import { countBreadcrumbPages as countPages } from './model'
  import type { BreadcrumbItem } from '../_shared/public'
  defineOptions({ name: 'BreadcrumbMenu' })
  const props = withDefaults(
    defineProps<{
      items: readonly BreadcrumbItem[]
      currentKey: string
      level?: number
      showIcon: boolean
      iconSize: number
    }>(),
    { level: 0 }
  )
  const emit = defineEmits<{ select: [key: string] }>()
  const { t } = useComponentLocale()
  const listRef = ref<HTMLElement | null>(null)
  const expanded = ref(new Set<string>())
  const containsCurrent = (items: readonly BreadcrumbItem[]): boolean =>
    items.some(
      item =>
        item.key === props.currentKey ||
        (item.children && containsCurrent(item.children))
    )
  watch(
    [() => props.items, () => props.currentKey],
    () => {
      expanded.value = new Set(
        props.items
          .filter(item => item.children && containsCurrent(item.children))
          .map(item => item.key)
      )
    },
    { immediate: true }
  )
  const activate = (item: BreadcrumbItem): void => {
    if (item.disabled) return
    if (item.children?.length) {
      const next = new Set(expanded.value)
      if (next.has(item.key)) next.delete(item.key)
      else next.add(item.key)
      expanded.value = next
    } else if (item.key !== props.currentKey) emit('select', item.key)
  }
  /** 同一棵树只保留一个 Tab 停靠点，其余节点由方向键到达。 */
  const handleFocus = (event: FocusEvent): void => {
    if (props.level !== 0 || !(event.target instanceof HTMLButtonElement))
      return
    for (const button of listRef.value?.querySelectorAll<HTMLButtonElement>(
      'button[role="treeitem"]'
    ) ?? [])
      button.tabIndex = button === event.target ? 0 : -1
  }
  /** 右键展开后进入子项，展开状态下移至下一个可操作节点。 */
  const moveRight = (
    target: HTMLButtonElement,
    next?: HTMLButtonElement
  ): void => {
    if (!target.hasAttribute('aria-expanded')) return
    if (target.getAttribute('aria-expanded') === 'true') {
      next?.focus()
      return
    }
    target.click()
    void nextTick(() =>
      target.parentElement
        ?.querySelector<HTMLButtonElement>('ul button:not(:disabled)')
        ?.focus()
    )
  }
  /** 左键先折叠目录，叶页则返回父目录。 */
  const moveLeft = (target: HTMLButtonElement): void => {
    if (target.getAttribute('aria-expanded') === 'true') target.click()
    else
      target
        .closest('ul[role="group"]')
        ?.parentElement?.querySelector<HTMLButtonElement>(
          'button[role="treeitem"]'
        )
        ?.focus()
  }
  /** 根列表统一处理树形导航键，子列表不重复消费同一个事件。 */
  const handleKeydown = (event: KeyboardEvent): void => {
    if (props.level !== 0 || !(event.target instanceof HTMLButtonElement))
      return
    const { target } = event
    const buttons = [
      ...(listRef.value?.querySelectorAll<HTMLButtonElement>(
        'button[role="treeitem"]:not(:disabled)'
      ) ?? []),
    ]
    const index = buttons.indexOf(target)
    if (index < 0) return
    const positions: Record<string, number> = {
      ArrowDown: Math.min(index + 1, buttons.length - 1),
      ArrowUp: Math.max(index - 1, 0),
      Home: 0,
      End: buttons.length - 1,
    }
    if (event.key in positions) {
      event.preventDefault()
      buttons[positions[event.key]]?.focus()
      return
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      moveRight(target, buttons[index + 1])
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      moveLeft(target)
    }
  }

  onMounted(() => {
    if (props.level === 0)
      void nextTick(() =>
        listRef.value
          ?.querySelector<HTMLButtonElement>(
            'button[role="treeitem"]:not(:disabled)'
          )
          ?.focus()
      )
  })
</script>
<style lang="scss" scoped>
  @use './menu.scss';
</style>
