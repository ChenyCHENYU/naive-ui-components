<template>
  <section
    class="c-user-picker__selected"
    :style="themeStyle"
    :aria-label="t('userPicker.selected')"
  >
    <div class="c-user-picker__selected-heading"
      ><strong>{{ t('userPicker.selected') }}</strong
      ><span>{{ context.items.length }}</span></div
    >
    <p
      v-if="!context.items.length"
      class="c-user-picker__empty"
      >{{ t('userPicker.emptySelection') }}</p
    >
    <ol
      v-else
      class="c-user-picker__selected-list"
    >
      <li
        v-for="(item, index) in visible"
        :key="`${typeof item.value}:${item.value}`"
      >
        <span class="c-user-picker__order">{{ start + index + 1 }}</span>
        <div class="c-user-picker__identity"
          ><strong>{{ item.label }}</strong
          ><small>{{
            item.row
              ? [
                  personField(item.row, fields?.code),
                  personField(item.row, fields?.department),
                  disabledReason?.(item.row),
                ]
                  .filter(Boolean)
                  .join(' · ')
              : String(item.value)
          }}</small></div
        >
        <div class="c-user-picker__item-actions">
          <template v-if="ordered">
            <NButton
              text
              size="tiny"
              :disabled="context.disabled || start + index === 0"
              :aria-label="t('userPicker.moveUp', { name: item.label })"
              @click="context.move(item.value, -1)"
              >↑</NButton
            >
            <NButton
              text
              size="tiny"
              :disabled="
                context.disabled || start + index === context.items.length - 1
              "
              :aria-label="t('userPicker.moveDown', { name: item.label })"
              @click="context.move(item.value, 1)"
              >↓</NButton
            >
          </template>
          <NButton
            text
            size="tiny"
            :disabled="context.disabled"
            :aria-label="t('userPicker.remove', { name: item.label })"
            @click="context.remove(item.value)"
            >×</NButton
          >
        </div>
      </li>
    </ol>
    <NPagination
      v-if="context.items.length > 8"
      v-model:page="page"
      :page-size="8"
      :item-count="context.items.length"
      simple
      size="small"
      :aria-label="t('userPicker.selectedPages')"
    />
  </section>
</template>
<script setup lang="ts" generic="T extends object">
  import { useComponentTheme } from '../../composables/useComponentTheme'
  import { computed, ref, watch } from 'vue'
  import { NButton, NPagination, useThemeVars } from 'naive-ui'
  import { useComponentLocale } from '../../composables/useComponentLocale'
  import type { ComponentLocale } from '../../core/contracts'
  import type { DataPickerSelectionContext } from '../C_DataPicker/types'
  import type { UserPickerFields } from './types'
  import { personField } from './personColumns'
  const props = defineProps<{
    context: DataPickerSelectionContext<T>
    fields?: UserPickerFields<T>
    ordered?: boolean
    locale?: ComponentLocale
    disabledReason?: (row: T) => string | undefined
  }>()
  const { t } = useComponentLocale(() => props.locale)
  const componentTheme = useComponentTheme()
  const theme = useThemeVars()
  const themeStyle = computed(() => ({
    ...componentTheme.value,
    '--c-user-picker-muted': theme.value.textColor3,
    '--c-user-picker-border': theme.value.borderColor,
  }))
  const page = ref(1)
  const start = computed(() => (page.value - 1) * 8)
  const visible = computed(() =>
    props.context.items.slice(start.value, start.value + 8)
  )
  watch(
    () => props.context.items.length,
    count => {
      page.value = Math.min(page.value, Math.max(1, Math.ceil(count / 8)))
    }
  )
</script>
