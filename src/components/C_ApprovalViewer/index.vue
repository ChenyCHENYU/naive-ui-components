<template>
  <NModal
    :show="show"
    preset="card"
    closable
    close-focusable
    :title="heading"
    :aria-label="heading"
    class="c-approval-viewer"
    :style="themeStyle"
    :content-style="{ minHeight: 0, overflowY: 'auto' }"
    @update:show="emit('update:show', $event)"
  >
    <label
      v-if="instances.length"
      class="c-approval-viewer__picker"
    >
      <span>{{ t('approval.instances') }}</span>
      <select
        :value="activeId"
        @change="select(($event.target as HTMLSelectElement).value)"
      >
        <option
          v-if="directOption"
          :value="directOption"
        >
          {{ directOption }}
        </option>
        <option
          v-for="attempt in instances"
          :key="attempt.id"
          :value="attempt.id"
        >
          {{ attempt.label ?? attempt.id }} · {{ statusLabel(attempt.status) }}
        </option>
      </select>
    </label>

    <p
      v-if="listStatus === 'loading'"
      class="c-approval-viewer__notice"
      role="status"
    >
      {{ t('approval.loadingInstances') }}
    </p>
    <div
      v-else-if="listStatus === 'error'"
      class="c-approval-viewer__notice"
      role="alert"
    >
      {{ t('approval.instancesError') }}
      <NButton
        size="small"
        @click="list.reload()"
        >{{ t('approval.retry') }}</NButton
      >
    </div>
    <NEmpty
      v-else-if="!activeId && (!businessKey.trim() || listStatus === 'empty')"
      :description="
        t(
          businessKey.trim() ? 'approval.noInstances' : 'approval.noBusinessKey'
        )
      "
    />

    <p
      v-if="detailStatus === 'loading'"
      class="c-approval-viewer__notice"
      role="status"
    >
      {{ t('approval.loadingDetail') }}
    </p>
    <div
      v-else-if="detailStatus === 'error'"
      class="c-approval-viewer__notice"
      role="alert"
    >
      {{ t('approval.detailError') }}
      <NButton
        size="small"
        @click="detail.reload()"
        >{{ t('approval.retry') }}</NButton
      >
    </div>
    <div
      v-else-if="instance"
      class="c-approval-viewer__detail"
    >
      <section
        class="c-approval-viewer__summary"
        :aria-label="t('approval.summary')"
      >
        <div class="c-approval-viewer__summary-heading">
          <strong>{{ instance.label ?? instance.id }}</strong>
          <NTag
            :type="statusTone[instance.status]"
            size="small"
            round
          >
            {{ statusLabel(instance.status) }}
          </NTag>
        </div>
        <dl class="c-approval-viewer__meta">
          <div v-if="instance.initiator">
            <dt>{{ t('approval.initiator') }}</dt>
            <dd>{{ instance.initiator }}</dd>
          </div>
          <div v-if="instance.currentHandler">
            <dt>{{ t('approval.handler') }}</dt>
            <dd>{{ instance.currentHandler }}</dd>
          </div>
          <div>
            <dt>{{ t('approval.startedAt') }}</dt>
            <dd>{{ formatDate(instance.startedAt) }}</dd>
          </div>
          <div v-if="instance.finishedAt != null">
            <dt>{{ t('approval.finishedAt') }}</dt>
            <dd>{{ formatDate(instance.finishedAt) }}</dd>
          </div>
        </dl>
      </section>

      <div
        v-if="$slots.diagram"
        class="c-approval-viewer__views"
        role="group"
        :aria-label="t('approval.summary')"
      >
        <NButton
          size="small"
          :type="!showDiagram ? 'primary' : 'default'"
          :aria-pressed="!showDiagram"
          @click="showDiagram = false"
          >{{ t('approval.records') }}</NButton
        >
        <NButton
          size="small"
          :type="showDiagram ? 'primary' : 'default'"
          :aria-pressed="showDiagram"
          @click="showDiagram = true"
          >{{ t('approval.diagram') }}</NButton
        >
      </div>

      <slot
        v-if="$slots.diagram && showDiagram"
        name="diagram"
        :instance="instance"
      />
      <section
        v-else
        class="c-approval-viewer__history"
        :aria-label="t('approval.records')"
      >
        <h3>{{ t('approval.records') }}</h3>
        <NTimeline v-if="instance.history.length">
          <NTimelineItem
            v-for="event in instance.history"
            :key="event.id"
            :title="event.title"
            :time="formatDate(event.occurredAt)"
          >
            <div
              v-if="event.actor"
              class="c-approval-viewer__actor"
              >{{ event.actor }}</div
            >
            <div
              v-if="event.comment"
              class="c-approval-viewer__comment"
              >{{ event.comment }}</div
            >
          </NTimelineItem>
        </NTimeline>
        <NEmpty
          v-else
          :description="t('approval.noEvents')"
        />
      </section>
    </div>
  </NModal>
</template>

<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import {
    NButton,
    NEmpty,
    NModal,
    NTag,
    NTimeline,
    NTimelineItem,
  } from 'naive-ui'
  import { useComponentTheme } from '../../composables/useComponentTheme'
  import { useScopedComponentLocale } from '../_shared/useScopedComponentLocale'
  import { CHINESE, ENGLISH } from './locale'
  import type {
    ApprovalInstanceDetail,
    ApprovalInstanceStatus,
    ApprovalViewerProps,
  } from './types'
  import { useApprovalViewer } from './useApprovalViewer'

  defineOptions({ name: 'C_ApprovalViewer' })
  const props = defineProps<ApprovalViewerProps>()
  const emit = defineEmits<{ 'update:show': [show: boolean] }>()
  defineSlots<{
    diagram?: (slot: { instance: ApprovalInstanceDetail }) => unknown
  }>()

  const { t, locale } = useScopedComponentLocale(
    CHINESE,
    ENGLISH,
    () => props.locale
  )
  const themeStyle = useComponentTheme()
  const heading = computed(() => props.title ?? t('approval.title'))
  const dateFormatter = computed(
    () =>
      new Intl.DateTimeFormat(locale.value, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
  )
  const statusTone = {
    pending: 'warning',
    running: 'info',
    approved: 'success',
    rejected: 'error',
    withdrawn: 'default',
    cancelled: 'default',
    terminated: 'warning',
  } as const satisfies Record<ApprovalInstanceStatus, string>

  const { activeId, detail, directOption, instances, list, select } =
    useApprovalViewer(props)
  const { data: instance, status: detailStatus } = detail
  const { status: listStatus } = list
  const showDiagram = ref(false)
  watch(instance, () => {
    showDiagram.value = false
  })

  function statusLabel(status: ApprovalInstanceStatus) {
    return t(`approval.status.${status}`)
  }

  function formatDate(timestamp: number) {
    const date = new Date(timestamp)
    return Number.isFinite(date.getTime())
      ? dateFormatter.value.format(date)
      : '—'
  }
</script>

<style scoped lang="scss">
  @use './index.scss';
</style>
