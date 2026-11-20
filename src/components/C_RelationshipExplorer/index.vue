<template>
  <section
    class="c-relationship-explorer"
    :style="theme"
    :aria-label="t('relations.title')"
    :aria-busy="loading || undefined"
  >
    <NSelect
      :value="modelValue ?? null"
      :options="options"
      filterable
      virtual-scroll
      size="small"
      :placeholder="t('relations.select')"
      :aria-label="t('relations.select')"
      @update:value="navigate"
    />
    <template v-if="current">
      <div
        v-if="traceFrom != null"
        class="c-relationship-explorer__path"
      >
        <strong>{{ t('relations.path') }}</strong>
        <ol v-if="pathNodes.length">
          <li
            v-for="node in pathNodes"
            :key="node.key"
          >
            <button
              type="button"
              @click="navigate(node.key)"
              >{{ node.label }}</button
            >
          </li>
        </ol>
        <span v-else>{{ t('relations.noPath') }}</span>
      </div>

      <div class="c-relationship-explorer__layout">
        <section
          v-for="panel in panels"
          :key="panel.direction"
          class="c-relationship-explorer__panel"
          :aria-label="t(`relations.${panel.direction}`)"
        >
          <strong>{{ t(`relations.${panel.direction}`) }}</strong>
          <ul v-if="panel.rows.length">
            <li
              v-for="neighbor in panel.rows"
              :key="neighbor.edge.key"
            >
              <button
                type="button"
                :data-traced="neighbor.traced || undefined"
                @click="navigate(neighbor.node.key)"
              >
                <span>{{ neighbor.node.label }}</span>
                <small v-if="neighbor.edge.label">{{
                  neighbor.edge.label
                }}</small>
              </button>
            </li>
          </ul>
          <span v-else>{{ t('relations.emptyNeighbors') }}</span>
        </section>

        <section
          class="c-relationship-explorer__panel c-relationship-explorer__current"
          :aria-label="t('relations.current')"
        >
          <strong>{{ current.label }}</strong>
          <small v-if="current.type">{{ current.type }}</small>
          <p v-if="current.subtitle">{{ current.subtitle }}</p>
          <slot
            name="details"
            :node="current"
          />
          <NButton
            v-if="expandable"
            size="small"
            :loading="loading"
            :disabled="loading"
            @click="emit('expand', current)"
            >{{ t('relations.expand') }}</NButton
          >
        </section>
      </div>
    </template>
    <p
      v-else
      role="status"
      >{{ t(loading ? 'relations.loading' : 'relations.empty') }}</p
    >
  </section>
</template>

<script setup lang="ts" generic="T extends RelationshipNode = RelationshipNode">
  import { computed } from 'vue'
  import { NButton, NSelect } from 'naive-ui'
  import { useComponentTheme } from '../../composables/useComponentTheme'
  import { useScopedComponentLocale } from '../_shared/useScopedComponentLocale'
  import type {
    RelationshipExplorerProps,
    RelationshipKey,
    RelationshipNeighbor,
    RelationshipNode,
  } from './types'
  import { indexRelationships, traceRelationshipPath } from './data'
  import { CHINESE, ENGLISH } from './locale'

  defineOptions({ name: 'C_RelationshipExplorer' })
  const props = defineProps<RelationshipExplorerProps<T>>()
  const emit = defineEmits<{
    'update:modelValue': [key: T['key']]
    select: [node: T]
    expand: [node: T]
  }>()
  defineSlots<{ details?: (context: { node: T }) => unknown }>()
  const theme = useComponentTheme()
  const { t } = useScopedComponentLocale(CHINESE, ENGLISH, () => props.locale)
  const graph = computed(() =>
    indexRelationships(props.nodes, props.edges, props.edgeTypes)
  )
  const options = computed(() =>
    [...graph.value.nodeByKey.values()].map(node => ({
      value: node.key,
      label: node.label,
    }))
  )
  const current = computed(() =>
    props.modelValue == null
      ? undefined
      : graph.value.nodeByKey.get(props.modelValue)
  )
  const path = computed(() => {
    if (
      props.traceFrom == null ||
      !current.value ||
      !graph.value.nodeByKey.has(props.traceFrom)
    )
      return undefined
    return traceRelationshipPath(
      graph.value.outgoing,
      props.traceFrom,
      current.value.key
    )
  })
  const pathNodes = computed(() => {
    const start =
      props.traceFrom == null
        ? undefined
        : graph.value.nodeByKey.get(props.traceFrom)
    if (!start || !path.value) return []
    return [
      start,
      ...path.value.flatMap(edge => graph.value.nodeByKey.get(edge.to) ?? []),
    ]
  })
  const panels = computed(() => {
    const found = current.value
    if (!found) return []
    const traced = new Set(path.value?.map(edge => edge.key))
    return (['incoming', 'outgoing'] as const).map(direction => {
      const rows: RelationshipNeighbor<T>[] = []
      for (const edge of graph.value[direction].get(found.key) ?? []) {
        const node = graph.value.nodeByKey.get(
          direction === 'incoming' ? edge.from : edge.to
        )
        if (node) rows.push({ node, edge, traced: traced.has(edge.key) })
      }
      return { direction, rows }
    })
  })

  function navigate(key: RelationshipKey | null) {
    if (key == null) return
    const node = graph.value.nodeByKey.get(key)
    if (node) {
      emit('update:modelValue', node.key)
      emit('select', node)
    }
  }
</script>

<style scoped lang="scss">
  @use './index.scss';
</style>
