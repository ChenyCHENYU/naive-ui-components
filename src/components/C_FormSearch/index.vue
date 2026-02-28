<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2025-06-10
 * @Description: 表单搜索组件（薄 UI 壳 — 逻辑由 composable 驱动）
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
-->
<template>
  <NCard class="form-search-card custom-card" :bordered="bordered">
    <NForm class="form-search" :model="formParams" ref="formRef" :size="size">
      <div
        class="form-search-item-box"
        v-for="(item, index) of visibleFields"
        :key="index"
      >
        <NFormItem
          class="form-item-input"
          v-if="item.type !== 'spacer'"
          :path="item.prop"
          :show-feedback="false"
          :show-label="false"
        >
          <NInput
            v-if="item.type === 'input'"
            clearable
            v-model:value="formParams[item.prop]"
            :placeholder="item.placeholder"
            @focus="history.handleFocus(item.prop)"
            @blur="history.closeAllPanels"
          />

          <div class="input-history" v-if="item.isFocus" @mousedown.prevent>
            <div
              class="history-item"
              @click="history.selectHistoryItem(hisValue, item.prop)"
              v-for="(hisValue, hisIndex) of item.hisList"
              :key="hisValue"
            >
              <span class="history-text">{{ hisValue }}</span>
              <NIcon
                class="delete-icon"
                size="14"
                @click.stop="history.deleteHistoryItem(item.prop, hisIndex)"
              >
                <div class="i-mdi:close" />
              </NIcon>
            </div>
            <div
              class="history-footer"
              v-if="item.hisList && item.hisList.length > 0"
            >
              <span
                class="clear-all"
                @click.stop="history.clearAllHistory(item.prop)"
              >
                清空历史记录
              </span>
            </div>
          </div>

          <NSelect
            v-if="item.type === 'select'"
            v-model:value="formParams[item.prop]"
            :placeholder="item.placeholder || '请选择'"
            clearable
            :options="normalizeOptions(item.list)"
          />

          <NDatePicker
            v-if="item.type === 'date-range'"
            type="datetimerange"
            v-model:value="formParams[item.prop]"
            format="yyyy-MM-dd HH:mm"
            value-format="yyyy-MM-dd HH:mm"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            clearable
          />
        </NFormItem>
      </div>

      <div class="form-search-item-box">
        <div class="form-item-input">
          <div class="button-label-placeholder"></div>
          <NSpace>
            <NTooltip trigger="hover">
              <template #trigger>
                <NButton type="primary" @click="searchFn" :loading="searching">
                  <template #icon>
                    <div class="i-mdi:search w-4 h-4" />
                  </template>
                </NButton>
              </template>
              搜索
            </NTooltip>

            <NTooltip trigger="hover">
              <template #trigger>
                <NButton @click="resetFn">
                  <template #icon>
                    <div class="i-mdi:refresh w-4 h-4" />
                  </template>
                </NButton>
              </template>
              重置
            </NTooltip>

            <NTooltip v-if="hasExpandButton" trigger="hover">
              <template #trigger>
                <NButton @click="toggleFold">
                  <template #icon>
                    <div
                      :class="
                        expanded
                          ? 'i-mdi:chevron-up w-4 h-4'
                          : 'i-mdi:chevron-down w-4 h-4'
                      "
                    />
                  </template>
                </NButton>
              </template>
              {{ expanded ? "收起" : "展开" }}
            </NTooltip>
          </NSpace>
        </div>
      </div>
    </NForm>
  </NCard>
</template>

<script setup lang="ts">
import { watch } from "vue";
import {
  NCard,
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NDatePicker,
  NSpace,
  NButton,
  NTooltip,
  NIcon,
} from "naive-ui";
import { useSearchState } from "./composables/useSearchState";
import type {
  SearchFormItem,
  SearchFormParams,
  SearchOptionItem,
  SearchConfig,
} from "./types";

defineOptions({ name: "C_FormSearch" });

interface Props {
  bordered?: boolean;
  formItemList: SearchFormItem[];
  formParams: SearchFormParams;
  formSearchInputHistoryString?: string;
  size?: "small" | "medium" | "large";
  config?: SearchConfig;
}

const props = withDefaults(defineProps<Props>(), {
  bordered: true,
  formItemList: () => [],
  size: "medium",
});

const emits = defineEmits<{
  search: [params: SearchFormParams];
  reset: [];
  "change-params": [params: SearchFormParams];
}>();

const {
  formRef,
  formParams,
  expanded,
  searching,
  visibleFields,
  hasExpandButton,
  history,
  searchFn,
  resetFn,
  toggleFold,
  syncFromProps,
} = useSearchState(emits, {
  formItemList: props.formItemList,
  formParams: props.formParams,
  config: props.config,
  historyOptions: {
    storageKey: props.formSearchInputHistoryString,
    maxItems: props.config?.historyMaxItems,
  },
});

const normalizeOptions = (list?: SearchOptionItem[]) =>
  list?.map((opt) => ({
    label: opt.label || opt.labelDefault || "",
    value: opt.value !== undefined ? opt.value : opt.label || opt.labelDefault,
  }));

watch(
  () => props.formItemList,
  (newItems) => syncFromProps(newItems, props.formParams),
  { deep: true },
);

defineExpose({
  formRef,
  formParams,
  searchFn,
  cleanFn: resetFn,
  changeFoldState: toggleFold,
});
</script>

<style lang="scss" scoped>
@use "./index.scss";
</style>
