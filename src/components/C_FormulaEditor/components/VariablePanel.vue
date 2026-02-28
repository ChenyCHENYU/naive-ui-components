<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-25
 * @Description: 变量选择面板（分组 + 搜索 + 函数）
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
-->

<template>
  <div class="variable-panel">
    <!-- 切换 Tab：变量 / 函数 -->
    <div class="variable-panel__tabs">
      <div
        class="variable-panel__tab"
        :class="{ 'variable-panel__tab--active': activeTab === 'variable' }"
        @click="activeTab = 'variable'"
      >
        表单项目
      </div>
      <div
        class="variable-panel__tab"
        :class="{ 'variable-panel__tab--active': activeTab === 'function' }"
        @click="activeTab = 'function'"
      >
        常用函数
      </div>
    </div>

    <!-- 搜索框 -->
    <div class="variable-panel__search">
      <NInput
        v-model:value="searchText"
        size="small"
        placeholder="搜索..."
        clearable
      >
        <template #prefix>
          <C_Icon name="mdi:magnify" :size="16" />
        </template>
      </NInput>
    </div>

    <!-- 变量列表 -->
    <NScrollbar v-if="activeTab === 'variable'" class="variable-panel__list">
      <template v-if="groupedVariables.length > 0">
        <div
          v-for="group in groupedVariables"
          :key="group.name"
          class="variable-panel__group"
        >
          <div
            class="variable-panel__group-title"
            @click="toggleGroup(group.name)"
          >
            <C_Icon
              :name="
                expandedGroups.has(group.name)
                  ? 'mdi:chevron-down'
                  : 'mdi:chevron-right'
              "
              :size="16"
            />
            {{ group.name }}
          </div>
          <div
            v-show="expandedGroups.has(group.name)"
            class="variable-panel__items"
          >
            <div
              v-for="variable in group.items"
              :key="variable.field"
              class="variable-panel__item"
              @click="$emit('select-variable', variable)"
            >
              <C_Icon
                :name="getTypeIcon(variable.type)"
                :size="15"
                class="variable-panel__item-icon"
              />
              <span>{{ variable.name }}</span>
            </div>
          </div>
        </div>
      </template>
      <NEmpty v-else size="small" description="无匹配变量" />
    </NScrollbar>

    <!-- 函数列表 -->
    <NScrollbar v-else class="variable-panel__list">
      <template v-if="filteredFunctions.length > 0">
        <div
          v-for="func in filteredFunctions"
          :key="func.name"
          class="variable-panel__func"
          @click="$emit('select-function', func)"
        >
          <div class="variable-panel__func-name">
            <span class="variable-panel__func-badge">ƒ</span>
            {{ func.name }}
          </div>
          <div class="variable-panel__func-desc">
            {{ func.description }}
          </div>
          <div class="variable-panel__func-sig">
            {{ func.signature }}
          </div>
        </div>
      </template>
      <NEmpty v-else size="small" description="无匹配函数" />
    </NScrollbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { NInput, NScrollbar, NEmpty } from "naive-ui";
import type {
  FormulaFunction,
  FormulaVariable,
  FormulaVariableType,
} from "../types";
import C_Icon from "../../C_Icon/index.vue";

interface Props {
  variables: FormulaVariable[];
  functions: FormulaFunction[];
}

interface Emits {
  (e: "select-variable", variable: FormulaVariable): void;
  (e: "select-function", func: FormulaFunction): void;
}

const props = defineProps<Props>();
defineEmits<Emits>();

const activeTab = ref<"variable" | "function">("variable");
const searchText = ref("");
const expandedGroups = ref(new Set<string>());

/* ─── 变量分组 ──────────────────────────────── */

interface VariableGroup {
  name: string;
  items: FormulaVariable[];
}

/** 过滤并按 group 分组变量 */
const groupedVariables = computed<VariableGroup[]>(() => {
  const keyword = searchText.value.toLowerCase();
  const filtered = keyword
    ? props.variables.filter(
        (v) =>
          v.name.toLowerCase().includes(keyword) ||
          v.field.toLowerCase().includes(keyword) ||
          (v.description ?? "").toLowerCase().includes(keyword),
      )
    : props.variables;

  const map = new Map<string, FormulaVariable[]>();
  for (const v of filtered) {
    const group = v.group ?? "其他";
    const list = map.get(group);
    if (list) {
      list.push(v);
    } else {
      map.set(group, [v]);
    }
  }

  return Array.from(map, ([name, items]) => ({ name, items }));
});

/* 默认展开所有分组 */
watch(
  groupedVariables,
  (groups) => {
    for (const g of groups) {
      expandedGroups.value.add(g.name);
    }
  },
  { immediate: true },
);

/** 切换分组折叠 */
function toggleGroup(name: string) {
  if (expandedGroups.value.has(name)) {
    expandedGroups.value.delete(name);
  } else {
    expandedGroups.value.add(name);
  }
}

/* ─── 函数过滤 ──────────────────────────────── */

const filteredFunctions = computed(() => {
  const keyword = searchText.value.toLowerCase();
  if (!keyword) return props.functions;
  return props.functions.filter(
    (f) =>
      f.name.toLowerCase().includes(keyword) ||
      f.description.toLowerCase().includes(keyword),
  );
});

/* ─── 变量类型图标 ──────────────────────────── */

/** 根据变量类型返回图标 */
function getTypeIcon(type: FormulaVariableType): string {
  switch (type) {
    case "number":
      return "mdi:numeric";
    case "text":
      return "mdi:format-text";
    case "boolean":
      return "mdi:toggle-switch-outline";
    default:
      return "mdi:variable";
  }
}
</script>

<style lang="scss" scoped>
@use "./VariablePanel.scss";
</style>
