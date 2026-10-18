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
          :placeholder="searchPlaceholder"
          :input-props="{ 'aria-label': '搜索树节点' }"
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
            {{ addText }}
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
            {{ isAllExpanded ? '收起全部' : '展开全部' }}
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
            刷新
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

<script setup lang="ts">
  import { computed } from 'vue'
  import { NInput, NButton, NTree, useThemeVars } from 'naive-ui'
  import C_Icon from '../C_Icon/index.vue'
  import { useTreeOperations } from './composables/useTreeOperations'
  import type { TreeProps, TreeEmits, TreeExpose, TreeSlots } from './types'

  defineOptions({ name: 'C_Tree' })
  const props = withDefaults(defineProps<TreeProps>(), {
    mode: 'custom',
    density: 'default',
    draggable: undefined,
    showLine: undefined,
    defaultExpandAll: undefined,
    searchable: true,
    searchPlaceholder: '搜索...',
    showToolbar: true,
    addable: true,
    addText: '新增',
    refreshable: true,
  })
  const emit = defineEmits<TreeEmits>()
  const slots = defineSlots<TreeSlots>()
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
  defineExpose<TreeExpose>(expose)
</script>

<style lang="scss" scoped>
  @use './index.scss';
</style>
