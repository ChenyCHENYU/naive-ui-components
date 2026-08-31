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
      :aria-disabled="item.disabled || undefined"
      :aria-haspopup="item.children?.length ? 'menu' : undefined"
      :aria-expanded="
        item.children?.length ? activeSubKey === item.key : undefined
      "
      @click.stop="handleItemClick(item)"
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
  import { computed, onBeforeUnmount, ref } from 'vue'
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
