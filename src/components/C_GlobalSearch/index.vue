<!--
 * @Description: 全局搜索组件 - 命令面板式搜索
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
-->
<template>
  <div class="robot-search-palette">
    <!-- 搜索触发按钮 -->
    <div
      class="robot-search-trigger"
      :class="{ 'trigger-dark': isDark }"
      @click="openDialog"
    >
      <div class="i-mdi:search robot-trigger-icon" />
      <span class="robot-trigger-text">搜索</span>
      <span class="robot-trigger-shortcut">Ctrl K</span>
    </div>

    <!-- 搜索对话框 -->
    <Teleport to="body">
      <Transition name="robot-dialog">
        <div
          v-if="showDialog"
          class="robot-dialog-overlay"
          @click="closeDialog"
          @keydown="handleDialogKeydown"
        >
          <div
            class="robot-dialog-container"
            :class="{ 'dialog-dark': isDark }"
            role="dialog"
            aria-modal="true"
            aria-label="全局搜索"
            @click.stop
          >
            <!-- 搜索头部 -->
            <div class="robot-search-header">
              <div class="i-mdi:magnify robot-search-icon" />
              <input
                ref="searchInputRef"
                v-model="searchValue"
                type="text"
                :placeholder="placeholder"
                class="robot-search-input"
                role="combobox"
                aria-label="搜索菜单"
                aria-autocomplete="list"
                :aria-expanded="showDialog"
                :aria-controls="optionListId"
                :aria-activedescendant="activeOptionId"
                @keydown="handleInputKeydown"
                @compositionstart="handleCompositionStart"
                @compositionend="handleCompositionEnd"
              />
              <button
                class="robot-close-btn"
                aria-label="关闭搜索"
                @click="closeDialog"
              >
                <div class="i-mdi:close" />
              </button>
            </div>

            <!-- 搜索内容 -->
            <div
              class="robot-search-content"
              :class="{
                'robot-search-content--virtual':
                  searchValue.trim() && hasResults,
              }"
            >
              <!-- 空状态 -->
              <div
                v-if="!hasContent"
                class="robot-empty-state"
              >
                <div class="i-mdi:magnify robot-empty-icon" />
                <p>{{ emptyText }}</p>
              </div>

              <!-- 搜索历史 -->
              <template
                v-else-if="!searchValue.trim() && displayHistory.length > 0"
              >
                <div class="robot-search-results">
                  <div class="robot-result-group">
                    <div class="robot-group-title">
                      <div
                        class="i-mdi:clock-time-four-outline robot-group-icon"
                      />
                      最近搜索
                      <span class="robot-group-count">{{
                        displayHistory.length
                      }}</span>
                      <button
                        class="robot-clear-history"
                        @click="clearHistory"
                        title="清空历史"
                      >
                        <div class="i-mdi:delete-outline" />
                      </button>
                    </div>
                    <div
                      :id="optionListId"
                      ref="historyItemsRef"
                      class="robot-group-items"
                      role="listbox"
                      aria-label="最近搜索"
                    >
                      <div
                        v-for="(historyItem, index) in displayHistory"
                        :key="`history-${index}`"
                        :id="optionId(index)"
                        :class="getItemClasses(index, true)"
                        role="option"
                        :aria-selected="selectedIndex === index"
                        :data-option-index="index"
                        @click="selectHistoryItem(historyItem)"
                        @mouseenter="selectedIndex = index"
                      >
                        <component
                          v-if="historyItem.menuItem?.icon"
                          :is="historyItem.menuItem.icon"
                          class="robot-item-icon"
                        />
                        <div
                          v-else
                          class="robot-item-icon robot-default-icon"
                        >
                          <div class="i-mdi:file-document-outline" />
                        </div>
                        <div class="robot-item-content">
                          <div class="robot-item-label">
                            {{ historyItem.query }}
                          </div>
                          <div class="robot-item-desc">
                            {{
                              formatMenuPath(historyItem.menuItem?.key || '')
                            }}
                          </div>
                        </div>
                        <button
                          class="robot-history-delete"
                          @click.stop="removeHistoryItem(index)"
                          title="删除此记录"
                        >
                          <div class="i-mdi:close" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </template>

              <!-- 搜索结果 -->
              <template v-else-if="searchValue.trim()">
                <div class="robot-search-results">
                  <!-- 无结果状态 -->
                  <div
                    v-if="!hasResults"
                    class="robot-empty-state"
                  >
                    <div class="i-mdi:magnify robot-empty-icon" />
                    <p>未找到 "{{ searchValue }}" 相关内容</p>
                  </div>

                  <!-- 搜索结果列表 -->
                  <div
                    v-else
                    class="robot-result-group"
                  >
                    <div class="robot-group-title">
                      <div class="i-mdi:menu robot-group-icon" />
                      {{ resultGroupTitle }}
                      <span class="robot-group-count">{{
                        filteredMenuItems.length
                      }}</span>
                    </div>
                    <VVirtualList
                      :id="optionListId"
                      ref="resultListRef"
                      class="robot-group-items robot-virtual-items"
                      role="listbox"
                      :aria-label="resultGroupTitle"
                      :items="filteredMenuItems"
                      :item-size="64"
                      :style="{
                        height: `${Math.min(filteredMenuItems.length * 64, 336)}px`,
                      }"
                    >
                      <template #default="{ item, index }">
                        <div
                          :id="optionId(index)"
                          :class="getItemClasses(index, false)"
                          role="option"
                          :aria-selected="selectedIndex === index"
                          :aria-posinset="index + 1"
                          :aria-setsize="filteredMenuItems.length"
                          :title="`${item.label} · ${formatMenuPath(item.key)}`"
                          @click="selectItem(item)"
                          @mouseenter="selectedIndex = index"
                        >
                          <component
                            v-if="item.icon"
                            :is="item.icon"
                            class="robot-item-icon"
                          />
                          <div
                            v-else
                            class="robot-item-icon robot-default-icon"
                          >
                            <div class="i-mdi:file-document-outline" />
                          </div>
                          <div class="robot-item-content">
                            <div class="robot-item-label">
                              <template
                                v-for="(part, partIndex) in highlightMatch(
                                  item.label,
                                  searchValue
                                )"
                                :key="partIndex"
                              >
                                <mark
                                  v-if="part.matched"
                                  class="robot-highlight"
                                  >{{ part.text }}</mark
                                >
                                <template v-else>{{ part.text }}</template>
                              </template>
                            </div>
                            <div class="robot-item-desc">
                              {{ formatMenuPath(item.key) }}
                            </div>
                          </div>
                          <div
                            v-if="item.children?.length"
                            class="robot-item-badge"
                          >
                            {{ item.children.length }}
                          </div>
                        </div>
                      </template>
                    </VVirtualList>
                  </div>
                </div>
              </template>
            </div>

            <!-- 搜索底部 -->
            <div class="robot-search-footer">
              <div class="robot-footer-actions">
                <div class="robot-action-item">
                  <kbd>↵</kbd><span>选择</span>
                </div>
                <div class="robot-action-item">
                  <kbd>↑↓</kbd><span>导航</span>
                </div>
                <div class="robot-action-item">
                  <kbd>esc</kbd><span>关闭</span>
                </div>
              </div>
              <div
                v-if="hasContent"
                class="robot-footer-info"
              >
                <span v-if="searchValue.trim() && hasResults">
                  共 {{ filteredMenuItems.length }} 项结果
                </span>
                <span
                  v-else-if="!searchValue.trim() && displayHistory.length > 0"
                >
                  {{ displayHistory.length }} 条历史记录
                </span>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
  import { computed, nextTick, ref, useId, watch } from 'vue'
  import { VVirtualList, type VirtualListInst } from 'vueuc'
  import { useGlobalSearch } from './composables/useGlobalSearch'
  import type { GlobalSearchOptions } from './types'

  defineOptions({ name: 'C_GlobalSearch' })

  interface Props {
    /** useGlobalSearch 配置（必须传入 menuItems + onSelect） */
    options: GlobalSearchOptions
    /** 搜索框 placeholder */
    placeholder?: string
    /** 无内容提示文字 */
    emptyText?: string
    /** 结果分组标题 */
    resultGroupTitle?: string
  }

  const props = withDefaults(defineProps<Props>(), {
    placeholder: '搜索导航菜单...',
    emptyText: '输入关键词搜索菜单',
    resultGroupTitle: '菜单导航',
  })

  const {
    showDialog,
    searchValue,
    selectedIndex,
    searchInputRef,
    isDark,
    filteredMenuItems,
    displayHistory,
    hasResults,
    hasContent,
    getItemClasses,
    highlightMatch,
    formatMenuPath,
    clearHistory,
    removeHistoryItem,
    openDialog,
    closeDialog,
    selectHistoryItem,
    selectItem,
    handleInputKeydown: processInputKeydown,
    handleDialogKeydown,
    handleCompositionStart,
    handleCompositionEnd,
  } = useGlobalSearch(() => props.options)

  const optionListId = `robot-search-options-${useId()}`
  const optionId = (index: number) => `${optionListId}-${index}`
  const activeOptionId = computed(() => {
    const count = searchValue.value.trim()
      ? filteredMenuItems.value.length
      : displayHistory.value.length
    return count > 0 ? optionId(selectedIndex.value) : undefined
  })
  const resultListRef = ref<VirtualListInst>()
  const historyItemsRef = ref<HTMLElement>()
  let scrollPending = false

  const scrollToSelected = async () => {
    if (scrollPending) return
    scrollPending = true
    await nextTick()
    scrollPending = false
    if (!showDialog.value) return
    if (searchValue.value.trim()) {
      if (filteredMenuItems.value.length) {
        resultListRef.value?.scrollTo({ index: selectedIndex.value })
      }
    } else {
      historyItemsRef.value
        ?.querySelector<HTMLElement>(
          `[data-option-index="${selectedIndex.value}"]`
        )
        ?.scrollIntoView({ block: 'nearest' })
    }
  }
  const handleInputKeydown = (event: KeyboardEvent) => {
    const alreadyHandled = event.defaultPrevented
    processInputKeydown(event)
    if (
      !alreadyHandled &&
      event.defaultPrevented &&
      (event.key === 'ArrowDown' || event.key === 'ArrowUp')
    ) {
      // At a boundary the index is unchanged; still restore its visibility
      // after the user has scrolled away with the pointer.
      void scrollToSelected()
    }
  }

  watch(
    [selectedIndex, filteredMenuItems, displayHistory, showDialog],
    scrollToSelected,
    { flush: 'post' }
  )

  defineExpose({ openDialog, closeDialog })
</script>

<style lang="scss" scoped>
  @use './index.scss';
</style>
