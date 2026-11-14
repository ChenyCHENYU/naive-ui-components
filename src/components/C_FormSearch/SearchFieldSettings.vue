<template>
  <NPopover
    trigger="click"
    placement="bottom-end"
    :show-arrow="false"
  >
    <template #trigger>
      <NButton
        :size="size"
        :aria-label="t('search.fieldSettings')"
      >
        <template #icon
          ><span
            class="i-mdi:tune-variant"
            aria-hidden="true"
        /></template>
        {{ t('search.fields') }}
      </NButton>
    </template>
    <div
      class="search-field-settings"
      role="group"
      :aria-label="t('search.fieldSettings')"
    >
      <NCheckboxGroup
        :value="value"
        @update:value="next => emit('update', next.map(String))"
      >
        <NCheckbox
          v-for="field in fields"
          :key="field.key"
          :value="field.key"
          :disabled="field.locked"
          :label="field.label"
        />
      </NCheckboxGroup>
      <NButton
        text
        size="small"
        @click="emit('reset')"
        >{{ t('search.restoreFields') }}</NButton
      >
    </div>
  </NPopover>
</template>
<script setup lang="ts">
  import { NButton, NCheckbox, NCheckboxGroup, NPopover } from 'naive-ui'
  import { useComponentLocale } from '../../component-config'
  import type { ComponentLocale } from '../../core/contracts'
  const props = defineProps<{
    fields: readonly { key: string; label: string; locked: boolean }[]
    value: string[]
    size: 'small' | 'medium' | 'large'
    locale?: ComponentLocale
  }>()
  const emit = defineEmits<{ update: [keys: string[]]; reset: [] }>()
  const { t } = useComponentLocale(() => props.locale)
</script>
<style scoped lang="scss">
  .search-field-settings {
    max-inline-size: min(20rem, calc(100vw - 3rem));
    :deep(.n-checkbox-group) {
      display: grid;
      gap: 8px;
      max-block-size: min(24rem, 55vh);
      overflow: auto;
      margin-block-end: 12px;
    }
  }
</style>
