<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-09-14
 * @FilePath: \naive-ui-components\src\components\C_Tabs\index.vue
 * @Description: 数据驱动的统一紧凑标签页组件
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
-->
<template>
  <NTabs
    :value="activeValue ?? undefined"
    @update:value="handleValueUpdate"
    class="c-tabs"
    :class="[`is-${type}`, { 'is-tabs-only': tabsOnly }]"
    :type="type"
    :size="size"
    :placement="placement"
    :justify-content="justifyContent"
    :animated="animated"
    :closable="closable"
    :addable="addable"
    :before-leave="handleBeforeLeave"
    @close="emit('close', $event)"
    @add="emit('add')"
  >
    <NTabPane
      v-for="item in items"
      :key="item.key"
      :name="item.key"
      :disabled="item.disabled"
      :closable="item.closable"
      :display-directive="displayDirective"
      :class="paneClass"
      :style="paneStyle"
    >
      <template #tab>
        <slot
          name="tab"
          :item="item"
          :active="activeValue === item.key"
        >
          <RenderNode
            v-if="item.renderTab"
            :render="item.renderTab"
            :item="item"
          />
          <span
            v-else
            class="c-tabs__label"
          >
            <C_Icon
              v-if="item.icon"
              class="c-tabs__icon"
              :name="item.icon"
              :size="14"
            />
            <span>{{ item.label }}</span>
            <NBadge
              v-if="item.badge !== undefined"
              class="c-tabs__badge"
              :value="item.badge"
              :type="item.badgeType || 'info'"
            />
          </span>
        </slot>
      </template>

      <template v-if="!tabsOnly">
        <slot
          :name="getPaneSlotName(item)"
          :item="item"
          :active="activeValue === item.key"
        >
          <RenderNode
            v-if="item.render"
            :render="item.render"
            :item="item"
          />
          <slot
            v-else
            name="pane"
            :item="item"
            :active="activeValue === item.key"
          />
        </slot>
      </template>
    </NTabPane>
  </NTabs>
</template>

<script setup lang="ts">
  import {
    computed,
    defineComponent,
    ref,
    watch,
    type PropType,
    type VNodeChild,
  } from 'vue'
  import { NBadge, NTabPane, NTabs } from 'naive-ui'
  import C_Icon from '../C_Icon/index.vue'
  import type { CTabsEmits, CTabsProps, TabsItem, TabsValue } from './types'

  defineOptions({ name: 'C_Tabs' })

  const props = withDefaults(defineProps<CTabsProps>(), {
    modelValue: undefined,
    defaultValue: undefined,
    items: () => [],
    type: 'line',
    size: 'small',
    placement: 'top',
    justifyContent: 'start',
    animated: true,
    closable: false,
    addable: false,
    tabsOnly: false,
    displayDirective: 'show:lazy',
    paneClass: undefined,
    paneStyle: undefined,
    beforeChange: undefined,
  })
  const emit = defineEmits<CTabsEmits>()

  type ItemRenderer = (item: TabsItem) => VNodeChild
  const RenderNode = defineComponent({
    name: 'CTabsRenderNode',
    props: {
      render: {
        type: Function as PropType<ItemRenderer>,
        required: true,
      },
      item: {
        type: Object as PropType<TabsItem>,
        required: true,
      },
    },
    setup(renderProps) {
      return () => renderProps.render(renderProps.item)
    },
  })

  const firstEnabledValue = (): TabsValue | null =>
    props.items.find(item => !item.disabled)?.key ?? null

  const internalValue = ref<TabsValue | null>(
    props.defaultValue ?? firstEnabledValue()
  )

  const activeValue = computed<TabsValue | null>({
    get: () =>
      props.modelValue !== undefined ? props.modelValue : internalValue.value,
    set: value => {
      if (value === null) return
      if (props.modelValue === undefined) internalValue.value = value
      emit('update:modelValue', value)
      emit(
        'change',
        value,
        props.items.find(item => item.key === value)
      )
    },
  })

  const handleValueUpdate = (value: TabsValue): void => {
    activeValue.value = value
  }

  const handleBeforeLeave = async (
    target: TabsValue,
    current: TabsValue
  ): Promise<boolean> => {
    if (!props.beforeChange) return true
    try {
      return (await props.beforeChange(target, current ?? null)) !== false
    } catch {
      return false
    }
  }

  const getPaneSlotName = (item: TabsItem): string => `pane-${String(item.key)}`

  watch(
    () => props.modelValue,
    value => {
      if (value !== undefined) internalValue.value = value
    }
  )

  watch(
    () =>
      props.items
        .map(item => `${typeof item.key}:${String(item.key)}`)
        .join('|'),
    () => {
      const current = activeValue.value
      if (current !== null && props.items.some(item => item.key === current))
        return
      const fallback = props.defaultValue ?? firstEnabledValue()
      if (fallback !== null) activeValue.value = fallback
    }
  )

  defineExpose({ activeValue })
</script>

<style scoped lang="scss">
  @use './index.scss';
</style>
