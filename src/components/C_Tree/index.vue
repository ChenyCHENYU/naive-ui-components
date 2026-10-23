<template>
  <div
    class="c-tree"
    :class="[
      `c-tree--${density.density}`,
      { 'c-tree--virtual': treeBindings.virtualScroll },
    ]"
    :style="themeStyle"
  >
    <div
      v-if="showToolbar"
      class="c-tree-toolbar"
    >
      <div class="toolbar-left">
        <NInput
          v-if="searchable"
          v-model:value="currentSearchPattern"
          :size="density.size"
          :placeholder="searchPlaceholder ?? t('common.search')"
          :input-props="{ 'aria-label': t('tree.search') }"
          clearable
          class="search-input"
        >
          <template #prefix
            ><C_Icon
              name="mdi:magnify"
              :size="16"
          /></template>
        </NInput>
      </div>
      <div class="toolbar-right">
        <slot name="toolbar-actions">
          <NButton
            v-if="addable"
            type="primary"
            :size="density.size"
            @click="handleAdd()"
          >
            <template #icon
              ><C_Icon
                name="mdi:plus"
                :size="16"
            /></template>
            {{ addText ?? t('common.add') }}
          </NButton>
          <NButton
            :size="density.size"
            :disabled="!data.length"
            :aria-pressed="isAllExpanded"
            @click="toggleExpandAll"
          >
            <template #icon
              ><C_Icon
                name="mdi:file-tree"
                :size="16"
            /></template>
            {{ isAllExpanded ? t('tree.collapseAll') : t('tree.expandAll') }}
          </NButton>
          <NButton
            v-if="refreshable"
            :size="density.size"
            @click="handleRefresh"
          >
            <template #icon
              ><C_Icon
                name="mdi:refresh"
                :size="16"
            /></template>
            {{ t('common.refresh') }}
          </NButton>
        </slot>
      </div>
    </div>
    <div class="c-tree-container">
      <NTree
        ref="treeRef"
        v-bind="treeBindings"
        class="tree-instance"
      >
        <template
          v-if="$slots.empty"
          #empty
          ><slot name="empty"
        /></template>
      </NTree>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T extends object = TreeNodeData">
  import { useComponentLocale } from '../../config'
  import { computed } from 'vue'
  import { NInput, NButton, NTree, useThemeVars } from 'naive-ui'
  import C_Icon from '../C_Icon/index.vue'
  import { useTreeOperations } from './composables/useTreeOperations'
  import type { TreeProps, TreeEmits, TreeSlots, TreeNodeData } from './types'

  defineOptions({ name: 'C_Tree' })
  const { t } = useComponentLocale()
  const props = withDefaults(defineProps<TreeProps<T>>(), {
    mode: 'custom',
    density: 'default',
    draggable: undefined,
    showLine: undefined,
    defaultExpandAll: undefined,
    searchable: true,
    showToolbar: true,
    addable: true,
    refreshable: true,
  })
  const emit = defineEmits<TreeEmits<T>>()
  const slots = defineSlots<TreeSlots<T>>()
  const theme = useThemeVars()
  const themeStyle = computed(() => ({
    '--c-tree-border': theme.value.borderColor,
    '--c-tree-surface': theme.value.actionColor,
    '--c-tree-radius': theme.value.borderRadius,
  }))
  const {
    currentSearchPattern,
    isAllExpanded,
    treeBindings,
    treeRef,
    density,
    toggleExpandAll,
    handleAdd,
    handleRefresh,
    expose,
  } = useTreeOperations(props, emit, slots)
  defineExpose(expose)
</script>

<style lang="scss" scoped>
  @use './index.scss';
</style>
