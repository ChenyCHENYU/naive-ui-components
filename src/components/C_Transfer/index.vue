<!--
 * @Description: 穿梭框组件
-->
<template>
  <div
    class="c-transfer"
    :class="[`is-${mergedProps.size}`]"
  >
    <!-- ================ Source Panel ================ -->
    <div class="c-transfer__panel">
      <div class="c-transfer__header">
        <NCheckbox
          v-if="mergedProps.showSelectAll"
          :checked="isSourceAllChecked"
          :indeterminate="isSourceIndeterminate"
          @update:checked="toggleSourceAll"
        >
          {{ mergedProps.titles?.[0] }}
        </NCheckbox>
        <span
          v-else
          class="c-transfer__title"
        >
          {{ mergedProps.titles?.[0] }}
        </span>
        <span class="c-transfer__count"
          >{{ sourceChecked.size }} / {{ sourceList.length }}</span
        >
      </div>

      <div
        v-if="mergedProps.filterable"
        class="c-transfer__filter"
      >
        <NInput
          v-model:value="sourceQuery"
          clearable
          size="small"
          :placeholder="mergedProps.filterPlaceholder"
          :input-props="{ 'aria-label': '搜索可选列表' }"
        >
          <template #prefix>
            <C_Icon name="mdi:magnify" />
          </template>
        </NInput>
      </div>

      <TransferList
        v-if="filteredSourceList.length"
        :items="filteredSourceList"
        :checked="sourceChecked"
        :query="sourceQuery"
        :size="mergedProps.size"
        :virtual-scroll="mergedProps.virtualScroll"
        @check="toggleSourceCheck"
      />
      <div
        v-else
        class="c-transfer__empty"
      >
        {{ mergedProps.sourceEmptyText }}
      </div>
    </div>

    <!-- ================ Actions ================ -->
    <div class="c-transfer__actions">
      <button
        type="button"
        class="c-transfer__btn"
        aria-label="移至已选列表"
        :class="{ 'is-disabled': movableSourceKeys.length === 0 }"
        :disabled="movableSourceKeys.length === 0"
        @click="moveToTarget"
      >
        <C_Icon name="mdi:chevron-right" />
      </button>
      <button
        type="button"
        class="c-transfer__btn"
        aria-label="移回可选列表"
        :class="{ 'is-disabled': movableTargetKeys.length === 0 }"
        :disabled="movableTargetKeys.length === 0"
        @click="moveToSource"
      >
        <C_Icon name="mdi:chevron-left" />
      </button>
    </div>

    <!-- ================ Target Panel ================ -->
    <div class="c-transfer__panel">
      <div class="c-transfer__header">
        <NCheckbox
          v-if="mergedProps.showSelectAll"
          :checked="isTargetAllChecked"
          :indeterminate="isTargetIndeterminate"
          @update:checked="toggleTargetAll"
        >
          {{ mergedProps.titles?.[1] }}
        </NCheckbox>
        <span
          v-else
          class="c-transfer__title"
        >
          {{ mergedProps.titles?.[1] }}
        </span>
        <span class="c-transfer__count"
          >{{ targetChecked.size }} / {{ targetList.length }}</span
        >
      </div>

      <div
        v-if="mergedProps.filterable"
        class="c-transfer__filter"
      >
        <NInput
          v-model:value="targetQuery"
          clearable
          size="small"
          :placeholder="mergedProps.filterPlaceholder"
          :input-props="{ 'aria-label': '搜索已选列表' }"
        >
          <template #prefix>
            <C_Icon name="mdi:magnify" />
          </template>
        </NInput>
      </div>

      <TransferList
        v-if="filteredTargetList.length"
        :items="filteredTargetList"
        :checked="targetChecked"
        :query="targetQuery"
        :size="mergedProps.size"
        :virtual-scroll="mergedProps.virtualScroll"
        @check="toggleTargetCheck"
      />
      <div
        v-else
        class="c-transfer__empty"
      >
        {{ mergedProps.targetEmptyText }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T extends TransferItem = TransferItem">
  import { computed, shallowReactive, ref, watch } from 'vue'
  import { NCheckbox, NInput } from 'naive-ui'
  import C_Icon from '../C_Icon/index.vue'
  import TransferList from './components/TransferList.vue'
  import { movableKeys, allMovableChecked } from './transferSelection'
  import {
    DEFAULT_TRANSFER_PROPS,
    type TransferItem,
    type TransferProps,
    type TransferEmits,
  } from './types'

  const props = withDefaults(defineProps<TransferProps<T>>(), {
    titles: () => DEFAULT_TRANSFER_PROPS.titles as [string, string],
    filterable: DEFAULT_TRANSFER_PROPS.filterable,
    filterPlaceholder: DEFAULT_TRANSFER_PROPS.filterPlaceholder,
    showSelectAll: DEFAULT_TRANSFER_PROPS.showSelectAll,
    sourceEmptyText: DEFAULT_TRANSFER_PROPS.sourceEmptyText,
    targetEmptyText: DEFAULT_TRANSFER_PROPS.targetEmptyText,
    size: DEFAULT_TRANSFER_PROPS.size,
    virtualScroll: DEFAULT_TRANSFER_PROPS.virtualScroll,
  })

  defineOptions({ name: 'C_Transfer' })
  const emit = defineEmits<TransferEmits<T>>()

  const mergedProps = computed(() => ({ ...DEFAULT_TRANSFER_PROPS, ...props }))

  // ==================== 数据列表 ====================

  const dataMap = computed(() => {
    const m = new Map<string | number, T>()
    for (const item of props.data) m.set(item.key, item)
    return m
  })

  const targetKeySet = computed(() => new Set(props.modelValue))

  const sourceList = computed(() =>
    [...dataMap.value.values()].filter(d => !targetKeySet.value.has(d.key))
  )

  const targetList = computed(() => {
    const result: T[] = []
    for (const key of new Set(props.modelValue)) {
      const item = dataMap.value.get(key)
      if (item) result.push(item)
    }
    return result
  })

  // ==================== 搜索 ====================

  const sourceQuery = ref('')
  const targetQuery = ref('')

  /** 默认过滤方法 */
  function defaultFilter(query: string, item: T): boolean {
    return item.label.toLowerCase().includes(query.toLowerCase())
  }

  const filterFn = computed(() => props.filterMethod ?? defaultFilter)

  const filteredSourceList = computed(() => {
    const q = sourceQuery.value.trim()
    return q
      ? sourceList.value.filter(item => filterFn.value(q, item))
      : sourceList.value
  })

  const filteredTargetList = computed(() => {
    const q = targetQuery.value.trim()
    return q
      ? targetList.value.filter(item => filterFn.value(q, item))
      : targetList.value
  })

  // ==================== 选中态 ====================

  const sourceChecked = shallowReactive(new Set<T['key']>())
  const targetChecked = shallowReactive(new Set<T['key']>())
  const movableSourceKeys = computed(() =>
    movableKeys(sourceList.value, sourceChecked)
  )
  const movableTargetKeys = computed(() =>
    movableKeys(targetList.value, targetChecked)
  )

  watch([sourceList, targetList], () => {
    const sourceKeys = new Set(
      sourceList.value.filter(item => !item.disabled).map(item => item.key)
    )
    const targetKeys = new Set(
      targetList.value.filter(item => !item.disabled).map(item => item.key)
    )
    for (const key of sourceChecked)
      if (!sourceKeys.has(key)) sourceChecked.delete(key)
    for (const key of targetChecked)
      if (!targetKeys.has(key)) targetChecked.delete(key)
  })

  /** 切换源列表项选中状态 */
  function toggleSourceCheck(key: string | number) {
    const item = dataMap.value.get(key)
    if (!item || item.disabled) return
    if (sourceChecked.has(item.key)) sourceChecked.delete(item.key)
    else sourceChecked.add(item.key)
  }

  /** 切换目标列表项选中状态 */
  function toggleTargetCheck(key: string | number) {
    const item = dataMap.value.get(key)
    if (!item || item.disabled) return
    if (targetChecked.has(item.key)) targetChecked.delete(item.key)
    else targetChecked.add(item.key)
  }

  const isSourceAllChecked = computed(() =>
    allMovableChecked(filteredSourceList.value, sourceChecked)
  )
  const isSourceIndeterminate = computed(
    () =>
      !isSourceAllChecked.value &&
      filteredSourceList.value.some(i => sourceChecked.has(i.key))
  )
  const isTargetAllChecked = computed(() =>
    allMovableChecked(filteredTargetList.value, targetChecked)
  )
  const isTargetIndeterminate = computed(
    () =>
      !isTargetAllChecked.value &&
      filteredTargetList.value.some(i => targetChecked.has(i.key))
  )

  /** 切换源列表全选状态 */
  function toggleSourceAll(checked: boolean) {
    for (const item of filteredSourceList.value) {
      if (item.disabled) continue
      if (checked) sourceChecked.add(item.key)
      else sourceChecked.delete(item.key)
    }
  }

  /** 切换目标列表全选状态 */
  function toggleTargetAll(checked: boolean) {
    for (const item of filteredTargetList.value) {
      if (item.disabled) continue
      if (checked) targetChecked.add(item.key)
      else targetChecked.delete(item.key)
    }
  }

  // ==================== 穿梭操作 ====================

  /** 将选中项移至目标列表 */
  function moveToTarget() {
    const keys = movableSourceKeys.value
    if (keys.length === 0) return
    const newVal = [...new Set([...props.modelValue, ...keys])]
    emit('update:modelValue', newVal)
    emit('change', newVal, 'right', keys)
    sourceChecked.clear()
  }

  /** 将选中项移回源列表 */
  function moveToSource() {
    const keys = movableTargetKeys.value
    if (keys.length === 0) return
    const removeSet = new Set(keys)
    const newVal = props.modelValue.filter(k => !removeSet.has(k))
    emit('update:modelValue', newVal)
    emit('change', newVal, 'left', keys)
    targetChecked.clear()
  }
</script>

<style scoped lang="scss">
  @use './index.scss';
</style>
