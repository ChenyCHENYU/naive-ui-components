<template>
  <section
    class="c-task-panel"
    :style="themeStyle"
    :aria-label="heading"
  >
    <header class="c-task-panel__head">
      <strong>{{ heading }}</strong>
      <span
        v-if="tasks.length"
        class="c-task-panel__muted"
        role="status"
      >
        {{
          t('taskPanel.summary', { active, finished: tasks.length - active })
        }}
      </span>
    </header>

    <p
      v-if="error"
      class="c-task-panel__message"
      role="alert"
      >{{ error }}</p
    >
    <p
      v-else-if="loading && !tasks.length"
      class="c-task-panel__muted"
      role="status"
    >
      {{ t('taskPanel.loading') }}
    </p>
    <NEmpty
      v-else-if="!tasks.length"
      :description="t('taskPanel.empty')"
      size="small"
    />

    <ul
      v-if="pageRows.length"
      class="c-task-panel__list"
      role="list"
    >
      <li
        v-for="row in pageRows"
        :key="row.task.key"
        class="c-task-panel__task"
        tabindex="-1"
      >
        <div class="c-task-panel__row">
          <span class="c-task-panel__title">{{ row.task.title }}</span>
          <NTag
            size="small"
            round
            :type="statusTone[row.task.status]"
          >
            {{ t(`taskPanel.status.${row.task.status}`) }}
          </NTag>
        </div>

        <div
          v-if="row.task.status === 'running'"
          class="c-task-panel__row"
        >
          <div
            class="c-task-panel__progress"
            :class="{
              'c-task-panel__progress--unknown': row.progress === undefined,
            }"
            role="progressbar"
            :aria-label="t('taskPanel.progress', { title: row.task.title })"
            :aria-valuemin="0"
            :aria-valuemax="100"
            :aria-valuenow="row.progress"
            :aria-valuetext="
              row.progress === undefined
                ? t('taskPanel.unknownProgress')
                : undefined
            "
          >
            <span
              :style="
                row.progress === undefined
                  ? undefined
                  : { width: `${row.progress}%` }
              "
            />
          </div>
          <span
            class="c-task-panel__muted"
            aria-hidden="true"
          >
            {{
              row.progress === undefined
                ? t('taskPanel.unknownProgress')
                : formatter.format(row.progress / 100)
            }}
          </span>
        </div>

        <p
          v-if="row.task.message"
          class="c-task-panel__message"
          >{{ row.task.message }}</p
        >
        <div
          v-if="
            row.task.downloadable || row.canRetry || row.task.results?.length
          "
          class="c-task-panel__actions"
        >
          <NButton
            v-if="row.task.downloadable"
            size="small"
            :aria-label="t('taskPanel.downloadTask', { title: row.task.title })"
            :disabled="pending.has(row.task.key)"
            @click="emit('download', row.task)"
          >
            {{ t('taskPanel.download') }}
          </NButton>
          <NButton
            v-if="row.canRetry"
            size="small"
            :aria-label="t('taskPanel.retryTask', { title: row.task.title })"
            :disabled="pending.has(row.task.key)"
            @click="retry(row.task, $event)"
          >
            {{ t('taskPanel.retry') }}
          </NButton>
          <NButton
            v-if="row.task.results?.length"
            size="small"
            :aria-label="t('taskPanel.taskResults', { title: row.task.title })"
            :aria-expanded="expandedKey === row.task.key"
            @click="
              expandedKey =
                expandedKey === row.task.key ? undefined : row.task.key
            "
            >{{ t('taskPanel.details') }}</NButton
          >
        </div>

        <AsyncBatchResult
          v-if="expandedKey === row.task.key && row.task.results?.length"
          :results="row.task.results"
          :title="t('taskPanel.taskResults', { title: row.task.title })"
          :show-retry="false"
          :locale="locale"
        />
      </li>
    </ul>

    <nav
      v-if="pageCount > 1"
      class="c-task-panel__pagination"
      :aria-label="t('taskPanel.pageNavigation')"
    >
      <NButton
        size="small"
        :disabled="currentPage === 1"
        @click="page = currentPage - 1"
        >{{ t('taskPanel.previous') }}</NButton
      >
      <span
        class="c-task-panel__muted"
        role="status"
        >{{
          t('taskPanel.page', { page: currentPage, total: pageCount })
        }}</span
      >
      <NButton
        size="small"
        :disabled="currentPage === pageCount"
        @click="page = currentPage + 1"
        >{{ t('taskPanel.next') }}</NButton
      >
    </nav>
  </section>
</template>

<script setup lang="ts" generic="T extends TaskPanelTask">
  import { computed, defineAsyncComponent, h, ref, watch } from 'vue'
  import { NButton, NEmpty, NTag } from 'naive-ui'
  import { useComponentTheme } from '../../composables/useComponentTheme'
  import { useScopedComponentLocale } from '../_shared/useScopedComponentLocale'
  import { CHINESE, ENGLISH } from './locale'
  import type {
    TaskPanelKey,
    TaskPanelProps,
    TaskPanelStatus,
    TaskPanelTask,
  } from './types'

  defineOptions({ name: 'C_TaskPanel' })
  const props = defineProps<TaskPanelProps<T>>()
  const emit = defineEmits<{ download: [task: T]; retry: [task: T] }>()

  const themeStyle = useComponentTheme()
  const { t, locale: language } = useScopedComponentLocale(
    CHINESE,
    ENGLISH,
    () => props.locale
  )
  const heading = computed(() => props.title ?? t('taskPanel.title'))
  const formatter = computed(
    () =>
      new Intl.NumberFormat(language.value, {
        style: 'percent',
        maximumFractionDigits: 1,
      })
  )
  const active = computed(
    () =>
      props.tasks.filter(
        ({ status }) => status === 'queued' || status === 'running'
      ).length
  )
  const pending = computed(() => new Set(props.pendingKeys))
  const statusTone = {
    queued: 'default',
    running: 'info',
    success: 'success',
    failed: 'error',
    cancelled: 'warning',
  } as const satisfies Record<TaskPanelStatus, string>

  const page = ref(1)
  const size = computed(() => {
    const requested = props.pageSize ?? 8
    return Number.isFinite(requested) && requested >= 1
      ? Math.min(50, Math.floor(requested))
      : 8
  })
  const pageCount = computed(() =>
    Math.max(1, Math.ceil(props.tasks.length / size.value))
  )
  const currentPage = computed(() => Math.min(page.value, pageCount.value))
  watch(pageCount, count => {
    page.value = Math.min(page.value, count)
  })

  const pageRows = computed(() => {
    const start = (currentPage.value - 1) * size.value
    return props.tasks.slice(start, start + size.value).map(task => ({
      task,
      progress: getProgress(task.progress),
      canRetry: task.status === 'failed' && task.retryable,
    }))
  })
  const expandedKey = ref<TaskPanelKey>()
  watch(pageRows, rows => {
    if (
      !rows.some(
        ({ task }) => task.key === expandedKey.value && task.results?.length
      )
    )
      expandedKey.value = undefined
  })

  const AsyncBatchResult = defineAsyncComponent({
    loader: () => import('../C_BatchResult/index.vue'),
    loadingComponent: () =>
      h('p', { role: 'status' }, t('taskPanel.loadingResults')),
    errorComponent: () =>
      h('p', { role: 'alert' }, t('taskPanel.resultsLoadFailed')),
  })

  function getProgress(value: number | undefined): number | undefined {
    return typeof value === 'number' && value >= 0 && value <= 100
      ? value
      : undefined
  }

  function retry(task: T, event: MouseEvent) {
    const button = event.currentTarget as HTMLButtonElement
    // 重试后状态可以立即变为排队，按键操作的焦点先留在对应任务。
    if (event.detail === 0 && button === button.ownerDocument.activeElement)
      button.closest('li')?.focus({ preventScroll: true })
    emit('retry', task)
  }
</script>

<style scoped lang="scss">
  @use './index.scss';
</style>
