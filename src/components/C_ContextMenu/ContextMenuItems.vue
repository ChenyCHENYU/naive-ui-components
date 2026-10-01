<template>
  <template
    v-for="item in visibleItems"
    :key="item.key"
  >
    <div
      v-if="item.divider"
      class="c-context-menu__divider"
      role="separator"
    />

    <div
      v-else
      :class="[
        'c-context-menu__item',
        item.className,
        {
          'is-disabled': item.disabled,
          'is-danger': item.danger,
        },
      ]"
      role="menuitem"
      tabindex="-1"
      :aria-disabled="item.disabled || undefined"
      :aria-haspopup="item.children?.length ? 'menu' : undefined"
      :aria-expanded="
        item.children?.length ? activeSubKey === item.key : undefined
      "
      @click.stop="handleItemClick(item)"
      @keydown.enter.stop.prevent="handleKeyboardSelect(item, $event)"
      @keydown.space.stop.prevent="handleKeyboardSelect(item, $event)"
      @keydown.arrow-right.stop.prevent="openSubmenu(item, $event)"
      @keydown.arrow-left.stop.prevent="focusParentMenu($event)"
      @mouseenter="handleMouseEnter(item)"
      @mouseleave="handleMouseLeave"
    >
      <span
        v-if="item.icon"
        class="c-context-menu__icon"
      >
        <C_Icon :name="item.icon" />
      </span>

      <span class="c-context-menu__label">{{ item.label }}</span>

      <span
        v-if="item.shortcut"
        class="c-context-menu__shortcut"
      >
        {{ item.shortcut }}
      </span>

      <span
        v-if="item.children?.length"
        class="c-context-menu__arrow"
      >
        <C_Icon name="mdi:chevron-right" />
      </span>

      <div
        v-if="item.children?.length && activeSubKey === item.key"
        class="c-context-menu c-context-menu__submenu"
        :class="`is-${subMenuPlacement}`"
        :style="submenuStyle"
        role="menu"
      >
        <ContextMenuItems
          :items="item.children"
          :min-width="minWidth"
          :max-width="maxWidth"
          :sub-menu-placement="subMenuPlacement"
          :z-index="zIndex + 1"
          @select="emit('select', $event)"
        />
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
  import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
  import C_Icon from '../C_Icon/index.vue'
  import type { ContextMenuItem } from './types'

  defineOptions({ name: 'ContextMenuItems' })

  const props = defineProps<{
    items: ContextMenuItem[]
    minWidth: number
    maxWidth: number
    subMenuPlacement: 'right' | 'left'
    zIndex: number
  }>()

  const emit = defineEmits<{
    select: [item: ContextMenuItem]
  }>()

  const activeSubKey = ref<string | null>(null)
  let subTimer: ReturnType<typeof setTimeout> | undefined

  const visibleItems = computed(() => props.items.filter(item => !item.hidden))
  const submenuStyle = computed(() => ({
    minWidth: `${props.minWidth}px`,
    maxWidth: `${props.maxWidth}px`,
    zIndex: props.zIndex,
  }))

  const clearSubTimer = () => {
    if (subTimer === undefined) return
    clearTimeout(subTimer)
    subTimer = undefined
  }

  const handleItemClick = (item: ContextMenuItem) => {
    if (item.disabled || item.children?.length) return
    emit('select', item)
  }

  function openSubmenu(item: ContextMenuItem, event: KeyboardEvent) {
    if (item.disabled || !item.children?.length) return
    clearSubTimer()
    activeSubKey.value = item.key
    nextTick(() => {
      const container = event.currentTarget as HTMLElement | null
      container
        ?.querySelector<HTMLElement>(
          '.c-context-menu__submenu [role="menuitem"]:not([aria-disabled="true"])'
        )
        ?.focus()
    })
  }

  function handleKeyboardSelect(item: ContextMenuItem, event: KeyboardEvent) {
    if (item.children?.length) openSubmenu(item, event)
    else handleItemClick(item)
  }

  function focusParentMenu(event: KeyboardEvent) {
    const item = event.currentTarget as HTMLElement | null
    const submenu = item?.closest('.c-context-menu__submenu')
    const parent = submenu?.parentElement
    if (parent?.getAttribute('role') === 'menuitem') parent.focus()
  }

  const handleMouseEnter = (item: ContextMenuItem) => {
    clearSubTimer()
    activeSubKey.value = null
    if (!item.disabled && item.children?.length) {
      subTimer = setTimeout(() => {
        activeSubKey.value = item.key
        subTimer = undefined
      }, 150)
    }
  }

  const handleMouseLeave = () => {
    clearSubTimer()
    subTimer = setTimeout(() => {
      activeSubKey.value = null
      subTimer = undefined
    }, 300)
  }

  onBeforeUnmount(clearSubTimer)
</script>
