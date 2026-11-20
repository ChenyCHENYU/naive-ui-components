<template>
  <section
    class="c-task-board"
    :aria-label="title ?? t('title')"
    :style="themeStyle"
  >
    <h3
      v-if="title"
      class="c-task-board__title"
      >{{ title }}</h3
    >
    <div
      v-if="!board.columnsByKey.size"
      role="status"
      >{{ t('noColumns') }}</div
    >
    <div
      v-else
      class="c-task-board__viewport"
      role="region"
      tabindex="0"
      :aria-label="t('columns')"
    >
      <section
        v-for="lane in board.rows"
        :key="laneKey(lane.key)"
        class="c-task-board__lane"
        :aria-label="
          lane.label ?? (lanes?.length ? t('unassigned') : t('tasks'))
        "
      >
        <h4
          v-if="lanes?.length"
          class="c-task-board__lane-title"
          >{{ lane.label ?? t('unassigned') }}</h4
        >
        <div class="c-task-board__columns">
          <section
            v-for="column in board.columnsByKey.values()"
            :key="column.key"
            class="c-task-board__column"
            :aria-label="column.label"
          >
            <header class="c-task-board__column-header">
              <strong>{{ column.label }}</strong>
              <span>{{ lane.byStatus.get(column.key)?.length ?? 0 }}</span>
            </header>
            <C_Draggable
              :model-value="lane.byStatus.get(column.key) ?? emptyCards"
              :group="laneKey(lane.key)"
              :item-key="card => card.key"
              :disabled="!draggable || disabled || column.disabled"
              :sort="false"
              :gap="densityValues.gap"
              handle=".c-task-board__handle"
              list-class="c-task-board__cards"
              :show-empty-state="false"
              @item-add="
                (card, index) =>
                  requestMove(card.key, lane.key, column.key, 'drag', index)
              "
            >
              <template #default="{ item }">
                <article class="c-task-board__card">
                  <span
                    v-if="draggable && !blocked(item.key, column)"
                    class="c-task-board__handle"
                    aria-hidden="true"
                    >⠿</span
                  >
                  <div class="c-task-board__card-content">
                    <slot
                      name="card"
                      :task="getTask(item.key)"
                      :column="column"
                      :lane="lane.key"
                    >
                      <strong>{{ getTask(item.key).title }}</strong>
                    </slot>
                  </div>
                  <NDropdown
                    v-if="
                      !blocked(item.key, column) &&
                      destinations.get(column.key)?.length
                    "
                    trigger="click"
                    :options="destinations.get(column.key)"
                    @select="
                      key => requestMove(item.key, lane.key, key, 'menu')
                    "
                  >
                    <NButton
                      attr-type="button"
                      quaternary
                      :size="densityValues.size"
                      :aria-label="
                        t('moveTask', { task: getTask(item.key).title })
                      "
                    >
                      {{ t('move') }}
                    </NButton>
                  </NDropdown>
                </article>
              </template>
            </C_Draggable>
          </section>
        </div>
      </section>
    </div>
    <span
      v-if="denied"
      class="c-task-board__feedback"
      role="status"
      >{{ t('blocked') }}</span
    >
  </section>
</template>

<script setup lang="ts" generic="T extends TaskBoardTask = TaskBoardTask">
  import { computed, shallowRef } from 'vue'
  import { NButton, NDropdown } from 'naive-ui'
  import { useComponentDensity } from '../../composables/useComponentDensity'
  import { useComponentTheme } from '../../composables/useComponentTheme'
  import { resolveComponentDensity } from '../../core/density'
  import { useScopedComponentLocale } from '../_shared/useScopedComponentLocale'
  import C_Draggable from '../C_Draggable/index.vue'
  import { buildTaskBoard, createTaskBoardDragGroup } from './data'
  import { CHINESE, ENGLISH } from './locale'
  import type {
    TaskBoardColumn,
    TaskBoardKey,
    TaskBoardMove,
    TaskBoardProps,
    TaskBoardTask,
  } from './types'

  defineOptions({ name: 'C_TaskBoard' })
  const props = defineProps<TaskBoardProps<T>>()
  const emit = defineEmits<{ 'move-request': [move: TaskBoardMove<T>] }>()
  defineSlots<{
    card?: (props: {
      task: T
      column: TaskBoardColumn<T['status']>
      lane: string | null
    }) => unknown
  }>()
  const dragGroup = createTaskBoardDragGroup()
  const laneKey = (key: string | null) =>
    `${dragGroup}-${key === null ? 'unassigned' : `lane-${key}`}`
  const { t: translate } = useScopedComponentLocale(
    CHINESE,
    ENGLISH,
    () => props.locale
  )
  const t = (key: string, params?: Record<string, string | number>) =>
    translate(`taskBoard.${key}`, params)
  const density = useComponentDensity(() => props.density)
  const densityValues = computed(() => resolveComponentDensity(density.value))
  const theme = useComponentTheme()
  const board = computed(() =>
    buildTaskBoard(props.tasks, props.columns, props.lanes)
  )
  const themeStyle = computed(() => ({
    ...theme.value,
    '--c-board-gap': `${densityValues.value.gap}px`,
    '--c-board-columns': board.value.columnsByKey.size,
  }))
  const emptyCards: { key: TaskBoardKey }[] = []
  const pending = computed(() => new Set(props.pendingKeys ?? []))
  const denied = shallowRef(false)
  const blocked = (key: TaskBoardKey, column: TaskBoardColumn) => {
    const task = board.value.taskPositions.get(key)?.task
    return (
      !task ||
      props.disabled ||
      column.disabled ||
      task.disabled ||
      pending.value.has(key)
    )
  }
  const getTask = (key: TaskBoardKey) =>
    board.value.taskPositions.get(key)!.task
  const destinations = computed(() => {
    const columns = [...board.value.columnsByKey.values()]
    return new Map(
      columns.map(({ key }) => [
        key,
        columns
          .filter(item => item.key !== key && !item.disabled)
          .map(({ key, label }) => ({ key, label })),
      ])
    )
  })

  const destination = (
    key: TaskBoardKey,
    lane: string | null,
    status: string
  ) => {
    const current = board.value.taskPositions.get(key)
    const target = board.value.columnsByKey.get(status)
    if (
      !current ||
      !target ||
      target.disabled ||
      lane !== current.position.lane
    )
      return
    const origin = board.value.columnsByKey.get(current.position.status)!
    if (blocked(key, origin) || status === origin.key) return
    return { current, target }
  }
  const requestMove = (
    key: TaskBoardKey,
    lane: string | null,
    status: string | number,
    source: TaskBoardMove<T>['source'],
    index?: number
  ) => {
    denied.value = false
    if (typeof status !== 'string' || (source === 'drag' && !props.draggable))
      return
    const moveTarget = destination(key, lane, status)
    if (!moveTarget) return
    const { current, target } = moveTarget
    const count = (
      board.value.rows.find(item => item.key === lane)?.byStatus.get(status) ??
      emptyCards
    ).length
    const move: TaskBoardMove<T> = {
      task: current.task,
      from: { ...current.position },
      to: {
        status: target.key,
        lane,
        index:
          index === undefined ? count : Math.max(0, Math.min(index, count)),
      },
      source,
    }
    if (props.canMove?.(move) === false) {
      denied.value = true
      return
    }
    emit('move-request', move)
  }
</script>

<style scoped lang="scss">
  @use './index.scss';
</style>
