<template>
  <fieldset class="c-filter-builder__group">
    <legend>{{ depth ? t('group') : t('logic') }}</legend>
    <div class="c-filter-builder__group-header">
      <NSelect
        class="c-filter-builder__logic"
        :value="group.operator"
        :options="logicOptions"
        :size="settings.size"
        :disabled="settings.disabled"
        :aria-label="t('logic')"
        @update:value="setLogic"
      />
      <NButton
        v-if="depth"
        attr-type="button"
        quaternary
        :size="settings.size"
        :disabled="settings.disabled"
        :aria-label="t('removeGroup')"
        @click="emit('remove')"
      >
        {{ t('remove') }}
      </NButton>
    </div>
    <small
      v-if="settings.issueAt(path)"
      class="c-filter-builder__issue"
      >{{ settings.issueAt(path) }}</small
    >
    <ul
      v-if="group.children.length"
      class="c-filter-builder__children"
    >
      <li
        v-for="(child, index) in group.children"
        :key="childKeys[index]"
      >
        <FilterGroupEditor
          v-if="isFilterGroup<K>(child) && depth < settings.maxDepth"
          :group="child"
          :depth="depth + 1"
          :path="childPath(index)"
          :settings="settings"
          @update="value => replaceChild(index, value)"
          @remove="removeChild(index)"
        />
        <FilterRuleEditor
          v-else-if="isFilterRule<K>(child)"
          :rule="child"
          :settings="settings"
          :issue="settings.issueAt(childPath(index))"
          @update="value => replaceChild(index, value)"
          @remove="removeChild(index)"
        />
        <div
          v-else
          class="c-filter-builder__controls"
        >
          <small class="c-filter-builder__issue">{{
            settings.issueAt(childPath(index))
          }}</small>
          <NButton
            attr-type="button"
            quaternary
            :size="settings.size"
            :disabled="settings.disabled"
            @click="removeChild(index)"
          >
            {{ t('remove') }}
          </NButton>
        </div>
      </li>
    </ul>
    <div class="c-filter-builder__actions">
      <NButton
        ref="addRuleButton"
        attr-type="button"
        secondary
        :size="settings.size"
        :disabled="settings.disabled || !settings.fields.size"
        @click="addRule"
      >
        {{ t('addRule') }}
      </NButton>
      <NButton
        v-if="depth < settings.maxDepth"
        attr-type="button"
        text
        :size="settings.size"
        :disabled="settings.disabled || !settings.fields.size"
        @click="addGroup"
      >
        {{ t('addGroup') }}
      </NButton>
    </div>
  </fieldset>
</template>

<script setup lang="ts" generic="K extends string">
  import { computed, nextTick, ref } from 'vue'
  import { NButton, NSelect } from 'naive-ui'
  import FilterRuleEditor from './FilterRuleEditor.vue'
  import type { FilterEditorSettings } from './editor'
  import {
    createFilterGroup,
    getFilterOperators,
    isFilterGroup,
    isFilterLogic,
    isFilterRule,
  } from './model'
  import type { FilterGroup, FilterLogic, FilterNode } from './types'

  const props = defineProps<{
    group: FilterGroup<K>
    depth: number
    path: string
    settings: FilterEditorSettings<K>
  }>()
  const emit = defineEmits<{
    update: [group: FilterGroup<K>]
    remove: []
  }>()
  const t = (key: string) => props.settings.t(key)
  const logicOptions = computed(() => [
    { value: 'and', label: t('and') },
    { value: 'or', label: t('or') },
  ])
  const addRuleButton = ref<InstanceType<typeof NButton>>()
  const childPath = (index: number) =>
    props.path ? `${props.path}.${index}` : String(index)
  const childKeys = computed(() => {
    const seen = new Set<string>()
    return Array.from(props.group.children, (child, index) => {
      if (typeof child?.id !== 'string' || !child.id || seen.has(child.id))
        return index
      seen.add(child.id)
      return child.id
    })
  })

  const setLogic = (operator: FilterLogic) => {
    if (!props.settings.disabled && isFilterLogic(operator))
      emit('update', { ...props.group, operator })
  }
  const setChildren = (children: FilterNode<K>[]) => {
    emit('update', { ...props.group, children })
  }
  const replaceChild = (index: number, child: FilterNode<K>) => {
    if (props.settings.disabled) return
    const children = [...props.group.children]
    children[index] = child
    setChildren(children)
  }
  const removeChild = async (index: number) => {
    if (props.settings.disabled) return
    setChildren(
      props.group.children.filter((_, childIndex) => childIndex !== index)
    )
    await nextTick()
    addRuleButton.value?.$el.focus()
  }
  const addRule = () => {
    const [field] = props.settings.fields.values()
    if (props.settings.disabled || !field) return
    setChildren([
      ...props.group.children,
      {
        type: 'rule',
        id: props.settings.createId(),
        field: field.key,
        operator: getFilterOperators(field)[0],
        value: null,
      },
    ])
  }
  const addGroup = () => {
    if (
      props.settings.disabled ||
      props.depth >= props.settings.maxDepth ||
      !props.settings.fields.size
    )
      return
    setChildren([
      ...props.group.children,
      createFilterGroup<K>(props.settings.createId()),
    ])
  }
</script>
