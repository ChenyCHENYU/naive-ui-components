<!--
 * @Description: 右键菜单组件 — 声明式配置、快捷键标注、嵌套子菜单
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
-->
<template>
  <!-- 遮罩层 -->
  <Teleport to="body">
    <div
      v-if="visible"
      class="c-context-menu-overlay"
      :style="{ zIndex: props.zIndex - 1 }"
      @click="close"
      @contextmenu.prevent="close"
    />

    <!-- 菜单面板 -->
    <div
      v-if="visible"
      ref="menuRef"
      class="c-context-menu"
      :style="menuStyle"
      role="menu"
      tabindex="-1"
      @keydown.escape="close"
      @keydown.arrow-down.prevent="moveFocus(1)"
      @keydown.arrow-up.prevent="moveFocus(-1)"
      @keydown.home.prevent="focusBoundary('first')"
      @keydown.end.prevent="focusBoundary('last')"
    >
      <ContextMenuItems
        :items="props.items"
        :min-width="props.minWidth"
        :max-width="props.maxWidth"
        :sub-menu-placement="props.subMenuPlacement"
        :z-index="props.zIndex + 1"
        @select="handleSelect"
      />
    </div>
  </Teleport>
</template>

<script setup lang="ts">
  import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
  import ContextMenuItems from './ContextMenuItems.vue'
  import {
    DEFAULT_CONTEXT_MENU_PROPS,
    type ContextMenuItem,
    type ContextMenuProps,
  } from './types'

  defineOptions({ name: 'C_ContextMenu' })

  const props = withDefaults(defineProps<ContextMenuProps>(), {
    items: () => [],
    minWidth: DEFAULT_CONTEXT_MENU_PROPS.minWidth,
    maxWidth: DEFAULT_CONTEXT_MENU_PROPS.maxWidth,
    subMenuPlacement: DEFAULT_CONTEXT_MENU_PROPS.subMenuPlacement,
    autoClose: DEFAULT_CONTEXT_MENU_PROPS.autoClose,
    disabled: DEFAULT_CONTEXT_MENU_PROPS.disabled,
    zIndex: DEFAULT_CONTEXT_MENU_PROPS.zIndex,
  })

  const emit = defineEmits<{
    (e: 'select', item: ContextMenuItem): void
    (e: 'open', position: { x: number; y: number }): void
    (e: 'close'): void
  }>()

  // ===== 状态 =====
  const visible = ref(false)
  const position = ref({ x: 0, y: 0 })
  const menuRef = ref<HTMLElement>()
  let previousFocus: HTMLElement | null = null
  const scrollPositions = new Map<EventTarget, [number, number]>()

  /** 只跟踪影响调用位置的祖先；打开前已发生的滚动通知不应关闭新菜单。 */
  const rememberScrollPositions = (x: number, y: number) => {
    scrollPositions.clear()
    let element: Element | null =
      document
        .elementsFromPoint(x, y)
        .find(
          item => !item.closest('.c-context-menu, .c-context-menu-overlay')
        ) ?? null
    while (element) {
      scrollPositions.set(element, [element.scrollLeft, element.scrollTop])
      element = element.parentElement
    }
    scrollPositions.set(window, [window.scrollX, window.scrollY])
    scrollPositions.set(document, [window.scrollX, window.scrollY])
  }

  const closeOnScroll = (event: Event) => {
    const { target } = event
    const previous = target && scrollPositions.get(target)
    if (!previous) return
    const current =
      target instanceof Element
        ? [target.scrollLeft, target.scrollTop]
        : [window.scrollX, window.scrollY]
    if (current[0] !== previous[0] || current[1] !== previous[1]) close()
  }

  function focusableItems(): HTMLElement[] {
    return Array.from(
      menuRef.value?.querySelectorAll<HTMLElement>(
        '[role="menuitem"]:not([aria-disabled="true"])'
      ) ?? []
    )
  }

  function focusBoundary(boundary: 'first' | 'last') {
    const items = focusableItems()
    const item = boundary === 'first' ? items[0] : items[items.length - 1]
    item?.focus({ preventScroll: true })
  }

  function moveFocus(delta: number) {
    const items = focusableItems()
    if (items.length === 0) return
    const index = items.indexOf(document.activeElement as HTMLElement)
    const next =
      index < 0
        ? delta > 0
          ? 0
          : items.length - 1
        : (index + delta + items.length) % items.length
    items[next]?.focus({ preventScroll: true })
  }

  // ===== 菜单定位样式 =====
  const menuStyle = computed(() => ({
    left: `${position.value.x}px`,
    top: `${position.value.y}px`,
    minWidth: `${props.minWidth}px`,
    maxWidth: `${props.maxWidth}px`,
    zIndex: props.zIndex,
  }))

  // ===== 边界校正 =====
  const adjustPosition = () => {
    nextTick(() => {
      const el = menuRef.value
      if (!el) return
      const rect = el.getBoundingClientRect()
      const { innerWidth, innerHeight } = window

      if (rect.right > innerWidth) {
        position.value.x = innerWidth - rect.width - 8
      }
      if (rect.bottom > innerHeight) {
        position.value.y = innerHeight - rect.height - 8
      }
      if (position.value.x < 0) position.value.x = 8
      if (position.value.y < 0) position.value.y = 8
    })
  }

  // ===== 打开/关闭 =====
  const open = (x: number, y: number) => {
    if (props.disabled) return
    if (!visible.value)
      previousFocus = document.activeElement as HTMLElement | null
    position.value = {
      x: Number.isFinite(x) ? Math.max(0, x) : 0,
      y: Number.isFinite(y) ? Math.max(0, y) : 0,
    }
    rememberScrollPositions(position.value.x, position.value.y)
    visible.value = true
    emit('open', { ...position.value })
    adjustPosition()
    window.addEventListener('resize', close)
    window.addEventListener('scroll', closeOnScroll, true)

    nextTick(() => focusBoundary('first'))
  }

  const close = () => {
    if (!visible.value) return
    visible.value = false
    window.removeEventListener('resize', close)
    window.removeEventListener('scroll', closeOnScroll, true)
    scrollPositions.clear()
    emit('close')
    nextTick(() => {
      if (previousFocus?.isConnected)
        previousFocus.focus({ preventScroll: true })
      previousFocus = null
    })
  }

  // ===== 菜单项选择 =====
  const handleSelect = (item: ContextMenuItem) => {
    emit('select', item)
    if (props.autoClose) close()
  }

  onBeforeUnmount(() => {
    window.removeEventListener('resize', close)
    window.removeEventListener('scroll', closeOnScroll, true)
    scrollPositions.clear()
    visible.value = false
  })

  // ===== 暴露 API =====
  defineExpose({
    /** 在指定坐标打开菜单 */
    open,
    /** 关闭菜单 */
    close,
    /** 当前是否可见 */
    visible: computed(() => visible.value),
  })
</script>

<style lang="scss">
  @use './index.scss';
</style>
