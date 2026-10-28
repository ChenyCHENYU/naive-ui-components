<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2025-06-01
 * @Description: 表单组件 - 标签布局组件
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
-->

<template>
  <div class="c-form-tabs">
    <!-- 无标签配置时的单一面板模式 -->
    <div
      v-if="!hasTabs"
      class="single-panel"
    >
      <component
        v-for="(item, index) in formItems"
        :key="getItemKey(item, index)"
        :is="item"
      />
    </div>

    <!-- 有标签配置时的分标签模式 -->
    <div
      v-else
      class="tabs-container"
    >
      <NTabs
        :value="currentTab"
        :type="tabsConfig.type"
        :size="tabsConfig.size"
        :placement="tabsConfig.placement"
        :animated="tabsConfig.animated"
        :closable="tabsConfig.closable"
        :addable="tabsConfig.addable"
        class="form-tabs"
        @update:value="handleTabChange"
        @close="handleTabClose"
        @add="handleTabAdd"
      >
        <NTabPane
          v-for="tab in tabsWithItems"
          :key="tab.config.key"
          :name="tab.config.key"
          :tab="tab.config.title"
          :disabled="tab.config.disabled || switching"
          :closable="tab.config.closable"
          display-directive="show"
        >
          <template #tab>
            <NSpace
              align="center"
              :size="8"
            >
              <C_Icon
                v-if="tab.config.icon"
                :name="tab.config.icon"
                :size="16"
                class="tab-icon"
              />
              <span>{{ tab.config.title }}</span>
              <NBadge
                v-if="tabsConfig.showCount"
                :value="tab.items.length"
                :max="99"
                :show="tab.items.length > 0"
                type="info"
              />
            </NSpace>
          </template>

          <!-- 标签页头部信息 -->
          <div
            v-if="tabsConfig.showTabHeader && tab.config.description"
            class="tab-header"
          >
            <p class="tab-description">{{ tab.config.description }}</p>
          </div>

          <!-- 标签页内的表单项 -->
          <div class="tab-form-items">
            <component
              v-for="(item, itemIndex) in tab.items"
              :key="getItemKey(item, itemIndex)"
              :is="item"
            />
          </div>

          <!-- 空状态 -->
          <NEmpty
            v-if="tab.items.length === 0"
            description="暂无表单项"
            class="tab-empty"
          />
        </NTabPane>
      </NTabs>

      <!-- 标签页操作按钮 -->
      <div
        v-if="tabsConfig.showActions"
        class="tabs-actions"
      >
        <NSpace justify="space-between">
          <NSpace>
            <NButton
              v-if="tabsConfig.validateBeforeSwitch"
              type="primary"
              :size="controlSize ?? 'small'"
              @click="validateCurrentTab"
            >
              <C_Icon
                :name="'carbon:star-check'"
                :size="14"
                style="margin-right: 4px"
              />
              验证当前标签
            </NButton>
          </NSpace>

          <NSpace>
            <slot
              name="tab-actions"
              :current-tab="currentTab"
              :total-tabs="tabsWithItems.length"
              :validate-tab="validateCurrentTab"
              :switch-to-tab="switchToTab"
            />
          </NSpace>
        </NSpace>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import {
    ref,
    reactive,
    computed,
    watch,
    nextTick,
    onMounted,
    onScopeDispose,
    readonly,
    type VNode,
  } from 'vue'
  import type {
    FormOption,
    MaybePromise,
    TabConfig,
    TabsLayoutConfig,
  } from '../../types'
  import C_Icon from '../../../C_Icon/index.vue'

  /* ================= 类型定义 ================= */
  interface TabWithItems {
    config: TabConfig
    items: VNode[]
  }

  interface Props {
    controlSize?: 'small' | 'medium' | 'large'
    formItems: VNode[]
    layoutConfig?: {
      tabs?: TabsLayoutConfig
    }
    options?: FormOption[]
    beforeTabChange?: (
      currentTab: string,
      targetTab: string
    ) => MaybePromise<boolean | void>
    validateTab?: (tabKey: string) => MaybePromise<boolean>
  }

  /* ================= 组件属性和事件 ================= */
  const props = withDefaults(defineProps<Props>(), {
    layoutConfig: () => ({}),
    options: () => [],
  })

  const emit = defineEmits<{
    'tab-change': [tabKey: string, tabIndex: number]
    'tab-before-change': [currentTab: string, targetTab: string]
    'tab-validate': [tabKey: string]
    'tab-close': [tabKey: string]
    'tab-add': []
  }>()

  /* ================= 响应式状态 ================= */
  const currentTab = ref<string>('')
  const switching = ref(false)
  let disposed = false
  const tabValidationStatus = reactive<Record<string, boolean>>({})

  /* ================= 默认配置 ================= */
  const getDefaultTabsConfig = (): Required<TabsLayoutConfig> => ({
    tabs: [],
    type: 'line',
    size: 'medium',
    placement: 'top',
    animated: true,
    closable: false,
    addable: false,
    showTabHeader: true,
    showActions: false,
    showCount: false,
    validateBeforeSwitch: false,
    defaultTab: '',
  })

  /* ================= 计算属性 ================= */
  const tabsConfig = computed(() => {
    const defaultConfig = getDefaultTabsConfig()
    const userConfig = props.layoutConfig?.tabs || {}

    return {
      ...defaultConfig,
      ...userConfig,
    }
  })

  const hasTabs = computed((): boolean => {
    return tabsConfig.value.tabs.length > 0
  })

  const tabsWithItems = computed((): TabWithItems[] => {
    if (!hasTabs.value) return []

    const tabMap = new Map<string, VNode[]>()

    /* 初始化标签映射 */
    tabsConfig.value.tabs.forEach(tab => {
      tabMap.set(tab.key, [])
    })

    /* 分配表单项到对应标签 */
    props.formItems.forEach((item, index) => {
      const option = props.options?.[index]
      const tabKey =
        option?.layout?.tab || tabsConfig.value.tabs[0]?.key || 'default'

      if (!tabMap.has(tabKey)) {
        tabMap.set(tabKey, [])
      }
      tabMap.get(tabKey)!.push(item)
    })

    /* 返回所有标签（包括空标签） */
    return tabsConfig.value.tabs.map(tabConfig => ({
      config: tabConfig,
      items: tabMap.get(tabConfig.key) || [],
    }))
  })

  /* ================= 工具方法 ================= */
  const getItemKey = (item: VNode, index: number): string => {
    if (item.key != null) {
      return String(item.key)
    }

    const itemProps = item.props as Record<string, unknown> | null
    if (itemProps?.path) {
      return String(itemProps.path)
    }

    return `tab-item-${index}`
  }

  const validateCurrentTab = async (): Promise<boolean> => {
    if (!currentTab.value) return true

    try {
      const valid = props.validateTab
        ? await props.validateTab(currentTab.value)
        : true
      emit('tab-validate', currentTab.value)
      tabValidationStatus[currentTab.value] = valid
      return valid
    } catch {
      tabValidationStatus[currentTab.value] = false
      return false
    }
  }

  const availableTab = (key: string) =>
    tabsWithItems.value.find(
      tab => tab.config.key === key && !tab.config.disabled
    )
  const currentTransition = (
    source: string,
    isCurrent: () => boolean
  ): boolean => !disposed && currentTab.value === source && isCurrent()
  const canCommitTab = (
    source: string,
    target: string,
    isCurrent: () => boolean
  ): boolean => currentTransition(source, isCurrent) && !!availableTab(target)

  const canLeaveTab = async (
    source: string,
    target: string,
    isCurrent: () => boolean
  ): Promise<boolean> => {
    if (
      tabsConfig.value.validateBeforeSwitch &&
      source &&
      !(await validateCurrentTab())
    )
      return false
    if (!currentTransition(source, isCurrent)) return false
    if (source) {
      const allowed = await props.beforeTabChange?.(source, target)
      if (allowed === false || !currentTransition(source, isCurrent))
        return false
      emit('tab-before-change', source, target)
    }
    return true
  }

  const switchToTab = async (
    targetTab: string,
    isCurrent = () => true
  ): Promise<boolean> => {
    const source = currentTab.value
    if (switching.value || !currentTransition(source, isCurrent)) return false
    if (!targetTab || targetTab === currentTab.value) return true
    if (!availableTab(targetTab)) return false
    try {
      switching.value = true
      if (
        !(await canLeaveTab(source, targetTab, isCurrent)) ||
        !canCommitTab(source, targetTab, isCurrent)
      )
        return false
      currentTab.value = targetTab
      const tabIndex = tabsWithItems.value.findIndex(
        tab => tab.config.key === targetTab
      )
      emit('tab-change', targetTab, tabIndex)
      return true
    } catch {
      return false
    } finally {
      switching.value = false
    }
  }

  /* ================= 事件处理方法 ================= */
  const handleTabChange = (tabKey: string): void => {
    switchToTab(tabKey)
  }

  const handleTabClose = (tabKey: string): void => {
    emit('tab-close', tabKey)
  }

  const handleTabAdd = (): void => {
    emit('tab-add')
  }

  const initializeCurrentTab = (): void => {
    if (!hasTabs.value || tabsWithItems.value.length === 0) {
      currentTab.value = ''
      return
    }

    const { defaultTab } = tabsConfig.value
    const targetTab =
      tabsWithItems.value.find(
        tab => tab.config.key === defaultTab && !tab.config.disabled
      )?.config.key ||
      tabsWithItems.value.find(tab => !tab.config.disabled)?.config.key

    if (targetTab && targetTab !== currentTab.value) {
      currentTab.value = targetTab
      nextTick(() => {
        const tabIndex = tabsWithItems.value.findIndex(
          tab => tab.config.key === targetTab
        )
        if (tabIndex >= 0) {
          emit('tab-change', targetTab, tabIndex)
        }
      })
    }
  }

  /* ================= 生命周期 ================= */
  onMounted(() => {
    initializeCurrentTab()
  })
  onScopeDispose(() => {
    disposed = true
  })

  /* 只监听标签结构变化（key / 数量），不监听表单项内容变化 */
  const tabStructureKey = computed(() =>
    tabsConfig.value.tabs.map(t => t.key).join(',')
  )

  watch(tabStructureKey, () => {
    if (!tabsConfig.value.tabs.some(tab => tab.key === currentTab.value)) {
      initializeCurrentTab()
    }
  })

  /* 监听配置变化 */
  watch(
    () => tabsConfig.value.defaultTab,
    newDefaultTab => {
      if (newDefaultTab && newDefaultTab !== currentTab.value) {
        switchToTab(newDefaultTab)
      }
    }
  )

  /* ================= 对外暴露 ================= */
  const revealField = async (
    field: string,
    isCurrent = () => true
  ): Promise<boolean> => {
    if (!hasTabs.value) return isCurrent()
    const option = props.options.find(item => item.prop === field)
    const key = option?.layout?.tab || tabsConfig.value.tabs[0]?.key
    const target = tabsWithItems.value.find(tab => tab.config.key === key)
    if (!target || target.config.disabled) return false
    return switchToTab(target.config.key, isCurrent)
  }

  defineExpose({
    revealField,
    switchToTab,
    validateCurrentTab,
    currentTab: readonly(currentTab),
    totalTabs: computed(() => tabsWithItems.value.length),
    tabsWithItems: readonly(tabsWithItems),
  })
</script>

<style scoped lang="scss">
  @use './index.scss';
</style>
