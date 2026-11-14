<template>
  <div class="c-orgchart__node-wrapper">
    <div
      ref="element"
      class="c-orgchart__node"
      :class="[
        entry.className,
        {
          'c-orgchart__node--leaf': isLeaf,
          'c-orgchart__node--selected': isSelected,
        },
      ]"
    >
      <div
        class="c-orgchart__node-select"
        :role="$slots.node ? undefined : 'button'"
        :tabindex="$slots.node ? undefined : 0"
        :aria-label="$slots.node ? undefined : entry.label"
        :aria-pressed="$slots.node ? undefined : isSelected"
        @click.stop="selectNode"
        @keydown.enter="selectNode"
        @keydown.space="selectNode"
      >
        <slot
          name="node"
          :node="entry.node"
          :key="entry.key"
          :is-leaf="isLeaf"
          :is-expanded="isExpanded"
          :is-selected="isSelected"
          :select="select"
          :toggle="toggle"
        >
          <div class="c-orgchart__node-default">
            <div
              v-if="entry.avatar"
              class="c-orgchart__avatar"
            >
              <img
                :src="entry.avatar"
                :alt="entry.label"
              />
            </div>
            <div class="c-orgchart__info">
              <div class="c-orgchart__label">{{ entry.label }}</div>
              <div
                v-if="entry.subtitle"
                class="c-orgchart__subtitle"
              >
                {{ entry.subtitle }}
              </div>
            </div>
          </div>
        </slot>
      </div>
      <button
        v-if="collapsible && !isLeaf"
        type="button"
        class="c-orgchart__toggle"
        :aria-label="
          t(isExpanded ? 'orgChart.collapse' : 'orgChart.expand', {
            label: entry.label,
          })
        "
        :aria-expanded="isExpanded"
        @click.stop="$emit('toggle', entry)"
      >
        {{ isExpanded ? '−' : '+' }}
      </button>
    </div>
    <div
      v-if="!isLeaf && isExpanded"
      class="c-orgchart__children"
    >
      <OrgNode
        v-for="child in entry.children"
        :key="child.key"
        :entry="child"
        :collapsible="collapsible"
        :expanded-keys="expandedKeys"
        :selected-key="selectedKey"
        @select="$emit('select', $event)"
        @toggle="$emit('toggle', $event)"
        @register="(key, element) => $emit('register', key, element)"
      >
        <template
          v-if="$slots.node"
          #node="slotProps"
        >
          <slot
            name="node"
            v-bind="slotProps"
          />
        </template>
      </OrgNode>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T extends object">
  import { computed, onBeforeUnmount, onMounted, shallowRef } from 'vue'
  import { useComponentLocale } from '../../component-config'
  import type { OrgChartKey, OrgChartSlots } from './types'
  import type { OrgChartEntry } from './tree'

  defineOptions({ name: 'OrgNode' })
  const props = defineProps<{
    entry: OrgChartEntry<T>
    collapsible: boolean
    expandedKeys: ReadonlySet<OrgChartKey>
    selectedKey: OrgChartKey | null
  }>()
  const emit = defineEmits<{
    select: [entry: OrgChartEntry<T>]
    toggle: [entry: OrgChartEntry<T>]
    register: [key: OrgChartKey, element: HTMLElement | null]
  }>()
  defineSlots<OrgChartSlots<T>>()
  const { t } = useComponentLocale()
  const element = shallowRef<HTMLElement | null>(null)
  const isLeaf = computed(() => props.entry.children.length === 0)
  const isExpanded = computed(() => props.expandedKeys.has(props.entry.key))
  const isSelected = computed(() => props.selectedKey === props.entry.key)

  onMounted(() => emit('register', props.entry.key, element.value))
  onBeforeUnmount(() => emit('register', props.entry.key, null))
  const select = () => emit('select', props.entry)
  const toggle = () => {
    if (props.collapsible && !isLeaf.value) emit('toggle', props.entry)
  }
  const selectNode = (event: MouseEvent | KeyboardEvent) => {
    if (event instanceof KeyboardEvent && event.target !== event.currentTarget)
      return
    const { target } = event
    if (
      target instanceof Element &&
      target.closest(
        'button, a, input, select, textarea, [contenteditable="true"]'
      )
    )
      return
    if (event instanceof KeyboardEvent) {
      event.preventDefault()
      event.stopPropagation()
    }
    select()
  }
</script>
