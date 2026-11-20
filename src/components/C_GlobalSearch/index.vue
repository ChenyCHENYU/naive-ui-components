<!--
 * @Description: 全局搜索组件 - 命令面板式搜索
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
-->
<template>
  <div
    class="robot-search-palette"
    :style="themeStyle"
  >
    <!-- 搜索触发按钮 -->
    <button
      type="button"
      class="robot-search-trigger"
      :class="{ 'trigger-dark': isDark }"
      @click="openDialog"
    >
      <span class="i-mdi:search robot-trigger-icon" />
      <span class="robot-trigger-text">{{ t('globalSearch.trigger') }}</span>
      <span class="robot-trigger-shortcut">Ctrl K</span>
    </button>

    <!-- 搜索对话框 -->
    <Teleport to="body">
      <Transition name="robot-dialog">
        <div
          v-if="showDialog"
          class="robot-dialog-overlay"
          :style="themeStyle"
          @click="closeDialog"
          @keydown="handleDialogKeydown"
        >
          <div
            class="robot-dialog-container"
            :class="{ 'dialog-dark': isDark }"
            role="dialog"
            aria-modal="true"
            :aria-label="t('globalSearch.dialog')"
            @click.stop
          >
            <!-- 搜索头部 -->
            <div class="robot-search-header">
              <div class="i-mdi:magnify robot-search-icon" />
              <input
                ref="searchInputRef"
                v-model="searchValue"
                type="text"
                :placeholder="
                  placeholder ??
                  t(
                    commandEnabled
                      ? 'globalSearch.commandPlaceholder'
                      : 'globalSearch.placeholder'
                  )
                "
                class="robot-search-input"
                role="combobox"
                :aria-label="
                  t(
                    commandEnabled
                      ? 'globalSearch.commandInput'
                      : 'globalSearch.input'
                  )
                "
                aria-autocomplete="list"
                :aria-expanded="showDialog"
                :aria-controls="activeOptionId ? optionListId : undefined"
                :aria-activedescendant="activeOptionId"
                @keydown="handleInputKeydown"
                @compositionstart="handleCompositionStart"
                @compositionend="handleCompositionEnd"
              />
              <button
                class="robot-close-btn"
                :aria-label="t('globalSearch.close')"
                @click="closeDialog"
              >
                <div class="i-mdi:close" />
              </button>
            </div>

            <!-- 搜索内容 -->
            <div
              ref="searchContentRef"
              class="robot-search-content"
              :class="{
                'robot-search-content--virtual':
                  !commandEnabled && searchValue.trim() && hasResults,
              }"
            >
              <!-- 空状态 -->
              <div
                v-if="!hasContent"
                class="robot-empty-state"
              >
                <div class="i-mdi:magnify robot-empty-icon" />
                <p>{{
                  emptyText ??
                  t(
                    commandEnabled
                      ? 'globalSearch.commandEmpty'
                      : 'globalSearch.empty'
                  )
                }}</p>
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
                      {{ t('globalSearch.recent') }}
                      <span class="robot-group-count">{{
                        displayHistory.length
                      }}</span>
                      <button
                        class="robot-clear-history"
                        @click="clearHistory"
                        :title="t('globalSearch.clearHistory')"
                        :aria-label="t('globalSearch.clearHistory')"
                      >
                        <div class="i-mdi:delete-outline" />
                      </button>
                    </div>
                    <div
                      :id="optionListId"
                      ref="historyItemsRef"
                      class="robot-group-items"
                      role="listbox"
                      :aria-label="t('globalSearch.recent')"
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
                              formatDisplayPath(historyItem.menuItem?.key || '')
                            }}
                          </div>
                        </div>
                        <button
                          class="robot-history-delete"
                          @click.stop="removeHistoryItem(index)"
                          :title="t('globalSearch.removeHistory')"
                          :aria-label="t('globalSearch.removeHistory')"
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
                  <p
                    v-if="commandLoading"
                    class="robot-command-status"
                    role="status"
                  >
                    {{ t('globalSearch.commandLoading') }}
                  </p>
                  <div
                    v-if="commandFailed"
                    class="robot-command-status"
                    role="status"
                  >
                    {{ t('globalSearch.commandFailed') }}
                    <button
                      type="button"
                      @click="retryCommands"
                    >
                      {{ t('globalSearch.commandRetry') }}
                    </button>
                  </div>
                  <!-- 无结果状态 -->
                  <div
                    v-if="!hasResults && !commandLoading && !commandFailed"
                    class="robot-empty-state"
                  >
                    <div class="i-mdi:magnify robot-empty-icon" />
                    <p>{{
                      t('globalSearch.noResults', { query: searchValue })
                    }}</p>
                  </div>

                  <div
                    v-if="hasResults"
                    :id="commandEnabled ? optionListId : undefined"
                    :role="commandEnabled ? 'listbox' : undefined"
                    :aria-label="
                      commandEnabled
                        ? t('globalSearch.commandResults')
                        : undefined
                    "
                  >
                    <div
                      v-if="filteredMenuItems.length"
                      class="robot-result-group"
                    >
                      <div class="robot-group-title">
                        <div class="i-mdi:menu robot-group-icon" />
                        {{ resultGroupTitle ?? t('globalSearch.group') }}
                        <span class="robot-group-count">{{
                          filteredMenuItems.length
                        }}</span>
                      </div>
                      <VVirtualList
                        :id="commandEnabled ? undefined : optionListId"
                        ref="resultListRef"
                        class="robot-group-items robot-virtual-items"
                        :role="commandEnabled ? 'group' : 'listbox'"
                        :aria-label="
                          resultGroupTitle ?? t('globalSearch.group')
                        "
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
                            :aria-setsize="resultCount"
                            :title="`${item.label} · ${formatDisplayPath(item.key)}`"
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
                                {{ formatDisplayPath(item.key) }}
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
                    <template
                      v-for="group in commandGroups"
                      :key="group.key"
                    >
                      <div
                        v-if="group.items.length"
                        class="robot-result-group"
                        role="group"
                        :aria-label="group.title"
                      >
                        <div
                          class="robot-group-title"
                          aria-hidden="true"
                        >
                          {{ group.title }}
                          <span class="robot-group-count">{{
                            group.items.length
                          }}</span>
                        </div>
                        <div
                          v-for="(item, index) in group.items"
                          :key="`${typeof item.key}:${item.key}`"
                          :id="optionId(group.start + index)"
                          :class="getItemClasses(group.start + index, false)"
                          :aria-selected="selectedIndex === group.start + index"
                          :aria-posinset="group.start + index + 1"
                          :aria-setsize="resultCount"
                          :data-command-index="group.start + index"
                          role="option"
                          @click="selectCommand(group.key, item)"
                          @mouseenter="selectedIndex = group.start + index"
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
                            <div class="i-mdi:flash-outline" />
                          </div>
                          <div class="robot-item-content">
                            <div class="robot-item-label">{{ item.label }}</div>
                            <div
                              v-if="item.description"
                              class="robot-item-desc"
                              >{{ item.description }}</div
                            >
                          </div>
                        </div>
                      </div>
                    </template>
                  </div>
                </div>
              </template>
            </div>

            <!-- 搜索底部 -->
            <div class="robot-search-footer">
              <div class="robot-footer-actions">
                <div class="robot-action-item">
                  <kbd>↵</kbd><span>{{ t('globalSearch.select') }}</span>
                </div>
                <div class="robot-action-item">
                  <kbd>↑↓</kbd><span>{{ t('globalSearch.navigate') }}</span>
                </div>
                <div class="robot-action-item">
                  <kbd>esc</kbd><span>{{ t('globalSearch.closeHint') }}</span>
                </div>
              </div>
              <div
                v-if="hasContent"
                class="robot-footer-info"
              >
                <span v-if="searchValue.trim() && hasResults">
                  {{
                    t('globalSearch.resultCount', {
                      count: resultCount,
                    })
                  }}
                </span>
                <span
                  v-else-if="!searchValue.trim() && displayHistory.length > 0"
                >
                  {{
                    t('globalSearch.historyCount', {
                      count: displayHistory.length,
                    })
                  }}
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
  import { useComponentTheme } from '../../composables/useComponentTheme'
  import { computed, nextTick, ref, useId, watch } from 'vue'
  import type { VirtualListInst } from 'vueuc'
  import { VVirtualList } from '../../utils/virtualList'
  import { useGlobalSearch } from './composables/useGlobalSearch'
  import type { GlobalSearchCommandItem, GlobalSearchOptions } from './types'
  import { useGlobalSearchLocale } from './locale'

  defineOptions({ name: 'C_GlobalSearch' })
  const { t } = useGlobalSearchLocale()

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

  const props = defineProps<Props>()
  const emit = defineEmits<{
    'command-select': [source: string, item: GlobalSearchCommandItem]
  }>()

  const {
    showDialog,
    searchValue,
    selectedIndex,
    searchInputRef,
    isDark,
    filteredMenuItems,
    commandGroups,
    commandEnabled,
    commandLoading,
    commandFailed,
    retryCommands: refreshCommands,
    selectCommand,
    resultCount,
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
  } = useGlobalSearch(
    () => props.options,
    (source, item) => emit('command-select', source, item)
  )
  const themeStyle = useComponentTheme(() => (isDark.value ? 'dark' : 'light'))
  function retryCommands() {
    refreshCommands()
    searchInputRef.value?.focus()
  }

  const formatDisplayPath = (key: string) =>
    key === '' || key === '/' ? t('globalSearch.home') : formatMenuPath(key)

  const optionListId = `robot-search-options-${useId()}`
  const optionId = (index: number) => `${optionListId}-${index}`
  const activeOptionId = computed(() => {
    const count = searchValue.value.trim()
      ? resultCount.value
      : displayHistory.value.length
    return count > 0 ? optionId(selectedIndex.value) : undefined
  })
  const resultListRef = ref<VirtualListInst>()
  const searchContentRef = ref<HTMLElement>()
  const historyItemsRef = ref<HTMLElement>()
  let scrollPending = false
  function scrollToSearchResult(index: number) {
    if (index >= filteredMenuItems.value.length) {
      searchContentRef.value
        ?.querySelector(`[data-command-index="${index}"]`)
        ?.scrollIntoView({ block: 'nearest' })
      return
    }
    resultListRef.value?.scrollTo({ index })
    if (commandEnabled.value)
      searchContentRef.value
        ?.querySelector('.robot-virtual-items')
        ?.scrollIntoView({ block: 'nearest' })
  }

  const scrollToSelected = async () => {
    if (scrollPending) return
    scrollPending = true
    await nextTick()
    scrollPending = false
    if (!showDialog.value) return
    if (searchValue.value.trim()) {
      scrollToSearchResult(selectedIndex.value)
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
    [
      selectedIndex,
      filteredMenuItems,
      commandGroups,
      displayHistory,
      showDialog,
    ],
    scrollToSelected,
    { flush: 'post' }
  )

  defineExpose({ openDialog, closeDialog })
</script>

<style lang="scss" scoped>
  @use './index.scss';
</style>
