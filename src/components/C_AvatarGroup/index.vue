<!--
 * @Description: 头像组组件
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
-->
<template>
  <div
    class="c-avatar-group"
    :style="themeStyle"
    :class="{ 'is-rtl': mergedProps.direction === 'rtl' }"
  >
    <NTooltip
      v-for="(item, idx) in visibleItems"
      :key="item.id"
      :disabled="!mergedProps.showTooltip"
      placement="top"
    >
      <template #trigger>
        <component
          :is="mergedProps.clickable ? 'button' : 'div'"
          :type="mergedProps.clickable ? 'button' : undefined"
          :aria-label="mergedProps.clickable ? item.name : undefined"
          class="c-avatar-group__item"
          :class="[
            `is-${mergedProps.shape}`,
            { 'is-clickable': mergedProps.clickable },
          ]"
          :style="itemStyle(idx)"
          @click="mergedProps.clickable && emit('itemClick', item)"
        >
          <img
            v-if="item.src"
            :src="item.src"
            :alt="item.name"
            class="c-avatar-group__img"
          />
          <div
            v-else
            class="c-avatar-group__initials"
            :style="{
              background: nameToColor(item.name),
              fontSize: initialsFontSize,
            }"
          >
            {{ getInitials(item.name) }}
          </div>

          <span
            v-if="mergedProps.showStatus && item.status"
            class="c-avatar-group__status"
            :style="statusStyle(item.status)"
          />
        </component>
      </template>
      {{ item.tooltip ?? item.name }}
    </NTooltip>

    <!-- 溢出 +N -->
    <NTooltip
      v-if="overflowCount > 0"
      placement="top"
    >
      <template #trigger>
        <component
          :is="mergedProps.overflowClickable ? 'button' : 'div'"
          :type="mergedProps.overflowClickable ? 'button' : undefined"
          :aria-label="
            mergedProps.overflowClickable
              ? t('avatarGroup.more', { count: overflowCount })
              : undefined
          "
          class="c-avatar-group__overflow"
          :class="[
            `is-${mergedProps.shape}`,
            { 'is-clickable': mergedProps.overflowClickable },
          ]"
          :style="overflowStyle"
          @click="
            mergedProps.overflowClickable && emit('overflowClick', hiddenItems)
          "
        >
          +{{ overflowCount }}
        </component>
      </template>
      <div style="max-width: 200px">
        <div
          v-for="h in hiddenItems"
          :key="h.id"
          style="line-height: 1.6"
        >
          {{ h.name }}
        </div>
      </div>
    </NTooltip>
  </div>
</template>

<script setup lang="ts">
  import { useComponentTheme } from '../../composables/useComponentTheme'
  import { computed } from 'vue'
  import { useAvatarGroupLocale } from './locale'
  import {
    DEFAULT_AVATAR_GROUP_PROPS,
    getInitials,
    nameToColor,
    type AvatarGroupProps,
    type AvatarItem,
  } from './types'

  defineOptions({ name: 'C_AvatarGroup' })
  const themeStyle = useComponentTheme()
  const { t } = useAvatarGroupLocale()

  const props = withDefaults(
    defineProps<{
      items: AvatarGroupProps['items']
      max?: number
      size?: number
      overlap?: number
      shape?: AvatarGroupProps['shape']
      showStatus?: boolean
      showTooltip?: boolean
      clickable?: boolean
      overflowClickable?: boolean
      direction?: AvatarGroupProps['direction']
    }>(),
    {
      max: DEFAULT_AVATAR_GROUP_PROPS.max,
      size: DEFAULT_AVATAR_GROUP_PROPS.size,
      overlap: DEFAULT_AVATAR_GROUP_PROPS.overlap,
      shape: DEFAULT_AVATAR_GROUP_PROPS.shape,
      showStatus: DEFAULT_AVATAR_GROUP_PROPS.showStatus,
      showTooltip: DEFAULT_AVATAR_GROUP_PROPS.showTooltip,
      clickable: DEFAULT_AVATAR_GROUP_PROPS.clickable,
      overflowClickable: DEFAULT_AVATAR_GROUP_PROPS.overflowClickable,
      direction: DEFAULT_AVATAR_GROUP_PROPS.direction,
    }
  )

  const emit = defineEmits<{
    itemClick: [item: AvatarItem]
    overflowClick: [hiddenItems: AvatarItem[]]
  }>()

  const mergedProps = computed(() => ({
    ...DEFAULT_AVATAR_GROUP_PROPS,
    ...props,
  }))

  const visibleItems = computed(() => {
    const max = Math.max(0, Math.floor(mergedProps.value.max!))
    return props.items.length > max ? props.items.slice(0, max) : props.items
  })

  const hiddenItems = computed(() => {
    const max = Math.max(0, Math.floor(mergedProps.value.max!))
    return props.items.length > max ? props.items.slice(max) : []
  })

  const overflowCount = computed(() => hiddenItems.value.length)

  const initialsFontSize = computed(
    () => `${Math.round(mergedProps.value.size! * 0.38)}px`
  )

  /** 计算头像项定位样式 */
  function itemStyle(idx: number) {
    const s = mergedProps.value.size!
    const overlap = mergedProps.value.overlap!
    return {
      width: `${s}px`,
      height: `${s}px`,
      marginLeft: idx === 0 ? '0' : `${overlap}px`,
    }
  }

  const overflowStyle = computed(() => {
    const s = mergedProps.value.size!
    const overlap = mergedProps.value.overlap!
    return {
      width: `${s}px`,
      height: `${s}px`,
      marginLeft: `${overlap}px`,
      fontSize: `${Math.round(s * 0.32)}px`,
    }
  })

  const statusColors: Record<string, string> = {
    online: 'var(--c-success, var(--c-theme-success))',
    offline: 'var(--c-text-3, var(--c-theme-text-3))',
    busy: 'var(--c-error, var(--c-theme-error))',
    away: 'var(--c-warning, var(--c-theme-warning))',
  }

  /** 状态点表达语义；头像姓名色仍保持稳定，不随主题改变。 */
  function statusStyle(status: string) {
    const dotSize = Math.max(8, Math.round(mergedProps.value.size! * 0.24))
    return {
      width: `${dotSize}px`,
      height: `${dotSize}px`,
      backgroundColor: statusColors[status] ?? statusColors.offline,
    }
  }
</script>

<style scoped lang="scss">
  @use './index.scss';
</style>
