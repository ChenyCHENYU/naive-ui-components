<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2025-06-25
 * @Description: 拖拽组件 - 基于 vue-draggable-plus 封装（薄 UI 壳 + useDraggableLayout 引擎）
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
-->
<template>
  <div class="c-draggable-wrapper" :class="wrapperClass">
    <VueDraggable
      v-model="internalList"
      v-bind="draggableOptions"
      :class="listClasses"
      :style="listStyles"
      @start="handleStart"
      @end="handleEnd"
      @add="handleAdd"
      @remove="handleRemove"
      @update="handleUpdate"
    >
      <div
        v-for="(item, index) in internalList"
        :key="getItemKey(item, index)"
        :class="getItemClass(index)"
        :data-index="index"
      >
        <slot
          :item="item"
          :index="index"
          :is-dragging="isDragging"
          :is-disabled="disabled"
        >
          <div class="default-item">
            <div v-if="showHandle" class="drag-handle">
              <div class="i-mdi:drag-vertical"></div>
            </div>
            <div class="item-content">
              <div class="item-title">{{ getItemTitle(item) }}</div>
              <div v-if="getItemDescription(item)" class="item-description">
                {{ getItemDescription(item) }}
              </div>
            </div>
          </div>
        </slot>
      </div>
    </VueDraggable>

    <div v-if="isEmpty && showEmptyState" class="empty-state">
      <slot name="empty">
        <div class="default-empty">
          <div class="empty-icon i-mdi:inbox-outline"></div>
          <p class="empty-text">{{ emptyText }}</p>
        </div>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { readonly } from "vue";
import { VueDraggable } from "vue-draggable-plus";
import { useDraggableLayout } from "./composables/useDraggableLayout";
import type { DraggableProps, DraggableEmits } from "./types";

defineOptions({ name: "C_Draggable" });

const props = withDefaults(defineProps<DraggableProps>(), {
  modelValue: () => [],
  disabled: false,
  group: "default",
  sort: true,
  animation: 200,
  delay: 0,
  handle: "",
  showHandle: false,
  ghostClass: "sortable-ghost",
  chosenClass: "sortable-chosen",
  dragClass: "sortable-drag",
  wrapperClass: "",
  listClass: "",
  itemClass: "",
  showEmptyState: true,
  emptyText: "暂无数据",
  swapThreshold: 1,
  invertSwap: false,
  direction: "vertical",
  layout: "vertical",
  gridColumns: 4,
  gridRows: undefined,
  gap: "8px",
  flexWrap: false,
  justifyContent: "flex-start",
  alignItems: "stretch",
  customStyles: () => ({}),
});

const emit = defineEmits<DraggableEmits>();

const {
  isDragging,
  internalList,
  isEmpty,
  listClasses,
  listStyles,
  draggableOptions,
  getItemKey,
  getItemTitle,
  getItemDescription,
  getItemClass,
  handleStart,
  handleEnd,
  handleAdd,
  handleRemove,
  handleUpdate,
  addItem,
  removeItem,
  moveItem,
  updateList,
  clear,
  getItem,
  findIndex,
} = useDraggableLayout(props, emit);

defineExpose({
  isDragging: readonly(isDragging),
  list: readonly(internalList),
  isEmpty: readonly(isEmpty),
  addItem,
  removeItem,
  moveItem,
  updateList,
  clear,
  getItem,
  findIndex,
});
</script>

<style lang="scss" scoped>
@use "./index.scss";
</style>
