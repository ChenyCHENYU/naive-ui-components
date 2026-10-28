<template>
  <nav
    class="c-section-nav"
    :aria-label="ariaLabel || t('section.navigation')"
    :style="themeStyle"
  >
    <button
      v-for="item in items"
      :key="item.key"
      :ref="value => setButton(item.key, value)"
      type="button"
      class="c-section-nav__item"
      :class="{ 'is-active': item.key === modelValue }"
      :disabled="item.disabled"
      :aria-current="item.key === modelValue ? 'location' : undefined"
      @click="select(item)"
      @keydown="onKeydown($event, item.key)"
    >
      <span class="c-section-nav__label">{{ item.label }}</span>
      <span
        v-if="item.errorCount && item.errorCount > 0"
        class="c-section-nav__count"
        :aria-label="t('section.errors', { count: item.errorCount })"
        >{{ item.errorCount }}</span
      >
    </button>
  </nav>
</template>

<script setup lang="ts">
  import { computed, type ComponentPublicInstance } from 'vue'
  import { useThemeVars } from 'naive-ui'
  import { useComponentLocale } from '../../composables/useComponentLocale'
  import type { SectionNavItem, SectionNavProps } from './types'

  defineOptions({ name: 'C_SectionNav' })
  const props = defineProps<SectionNavProps>()
  const emit = defineEmits<{
    'update:modelValue': [key: string]
    select: [key: string]
  }>()
  const { t } = useComponentLocale(() => props.locale)
  const theme = useThemeVars()
  const themeStyle = computed(() => ({
    '--c-section-primary': theme.value.primaryColor,
    '--c-section-text': theme.value.textColor2,
    '--c-section-error': theme.value.errorColor,
    '--c-section-active': theme.value.actionColor,
    '--c-section-radius': theme.value.borderRadius,
  }))
  const buttons = new Map<string, HTMLButtonElement>()
  const setButton = (
    key: string,
    value: Element | ComponentPublicInstance | null
  ) => {
    if (value instanceof HTMLButtonElement) buttons.set(key, value)
    else buttons.delete(key)
  }
  const select = (item: SectionNavItem) => {
    if (item.disabled) return
    emit('update:modelValue', item.key)
    emit('select', item.key)
  }
  const onKeydown = (event: KeyboardEvent, key: string) => {
    const enabled = props.items.filter(item => !item.disabled)
    const index = enabled.findIndex(item => item.key === key)
    let next = index
    if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = enabled.length - 1
    else if (event.key === 'ArrowDown')
      next = Math.min(enabled.length - 1, index + 1)
    else if (event.key === 'ArrowUp') next = Math.max(0, index - 1)
    else return
    event.preventDefault()
    const target = enabled[next]
    if (target) buttons.get(target.key)?.focus()
  }
</script>

<style scoped lang="scss">
  @use './index.scss';
</style>
