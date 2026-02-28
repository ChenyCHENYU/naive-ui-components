<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2025-06-27
 * @Description: 树型组件 — 薄 UI 壳，逻辑由 useTreeOperations 驱动
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
-->
<template>
  <div class="c-tree">
    <div v-if="showToolbar" class="c-tree-toolbar">
      <div class="toolbar-left">
        <NInput
          v-if="searchable"
          v-model:value="internalSearchPattern"
          :placeholder="searchPlaceholder"
          clearable
          class="search-input"
        >
          <template #prefix>
            <C_Icon name="mdi:magnify" :size="16" />
          </template>
        </NInput>
      </div>
      <div class="toolbar-right">
        <slot name="toolbar-actions">
          <NButton v-if="addable" type="primary" @click="handleAdd()">
            <template #icon>
              <C_Icon name="mdi:plus" :size="16" />
            </template>
            {{ addText }}
          </NButton>
          <NButton @click="toggleExpandAll">
            <template #icon>
              <C_Icon name="mdi:file-tree" :size="16" />
            </template>
            {{ isAllExpanded ? "收起全部" : "展开全部" }}
          </NButton>
          <NButton v-if="refreshable" @click="handleRefresh">
            <template #icon>
              <C_Icon name="mdi:refresh" :size="16" />
            </template>
            刷新
          </NButton>
        </slot>
      </div>
    </div>

    <div class="c-tree-container">
      <NTree
        :data="treeData"
        :pattern="currentSearchPattern"
        :expanded-keys="expandedKeys"
        :selected-keys="selectedKeys"
        :draggable="draggable"
        :show-line="showLine"
        :render-prefix="renderPrefix"
        :render-suffix="renderSuffix"
        :render-label="renderLabel"
        :key-field="keyField"
        :label-field="labelField"
        :children-field="childrenField"
        @update:expanded-keys="handleExpandedKeysChange"
        @update:selected-keys="handleSelectedKeysChange"
        @drop="handleDrop"
        class="tree-instance"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { NInput, NButton, NTree } from "naive-ui";
import C_Icon from "../C_Icon/index.vue";
import { useTreeOperations } from "./composables/useTreeOperations";
import type { TreeProps, TreeEmits, TreeExpose } from "./types";

defineOptions({ name: "C_Tree" });

const props = withDefaults(defineProps<TreeProps>(), {
  mode: "custom",
  keyField: "id",
  labelField: "name",
  childrenField: "children",
  searchPattern: "",
  searchable: true,
  searchPlaceholder: "搜索...",
  draggable: false,
  showLine: true,
  showToolbar: true,
  addable: true,
  addText: "新增",
  refreshable: true,
  iconField: "icon",
  iconConfig: () => ({
    default: "mdi:circle-outline",
    typeMap: {},
    colorMap: {},
  }),
  statusConfigs: () => [],
  actions: () => [],
  defaultExpandAll: false,
  defaultExpandedKeys: () => [],
  defaultSelectedKeys: () => [],
});

const emit = defineEmits<TreeEmits>();

const {
  internalSearchPattern,
  expandedKeys,
  selectedKeys,
  isAllExpanded,
  treeData,
  currentSearchPattern,
  renderPrefix,
  renderLabel,
  renderSuffix,
  toggleExpandAll,
  handleExpandedKeysChange,
  handleSelectedKeysChange,
  handleDrop,
  handleAdd,
  handleRefresh,
  expose,
} = useTreeOperations(props, emit);

defineExpose<TreeExpose>(expose);
</script>

<style lang="scss" scoped>
@use "./index.scss";
</style>
