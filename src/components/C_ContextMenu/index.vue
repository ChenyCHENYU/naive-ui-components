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
    position.value = { x, y }
    visible.value = true
    emit('open', { x, y })
    adjustPosition()

    // 聚焦以支持 Escape 关闭
    nextTick(() => menuRef.value?.focus())
  }

  const close = () => {
    visible.value = false
    emit('close')
  }

  // ===== 菜单项选择 =====
  const handleSelect = (item: ContextMenuItem) => {
    emit('select', item)
    if (props.autoClose) close()
  }

  onBeforeUnmount(() => {
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
