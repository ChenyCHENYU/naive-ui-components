<template>
  <section
    class="c-import-wizard"
    :style="themeStyle"
    :aria-label="title ?? t('title')"
    :aria-busy="Boolean(phase)"
  >
    <h3 class="c-import-wizard__title">{{ title ?? t('title') }}</h3>
    <div class="c-import-wizard__actions">
      <label :for="inputId">{{ t('file') }}</label>
      <input
        :id="inputId"
        type="file"
        :accept="accept ?? '.csv,.xls,.xlsx'"
        :disabled="disabled || phase === 'commit'"
        @change="onFile"
      />
      <span v-if="session">{{ session.file.name }}</span>
    </div>
    <div
      v-if="phase"
      role="status"
      >{{ t(`pending.${phase}`) }}</div
    >
    <NAlert
      v-if="failedPhase"
      type="error"
      role="alert"
    >
      {{ t(`failure.${failedPhase}`) }}
    </NAlert>

    <template v-if="results">
      <slot
        name="results"
        :results="results"
      >
        <C_BatchResult
          :results="resultRows"
          :locale="locale"
          :show-retry="false"
        />
      </slot>
    </template>
    <template v-else-if="review">
      <h4 class="c-import-wizard__title">{{ t('review') }}</h4>
      <p class="c-import-wizard__summary">{{
        t('rowCount', { count: review.rowCount })
      }}</p>
      <ul
        v-if="issuePageRows.length"
        class="c-import-wizard__issues"
      >
        <li
          v-for="(issue, index) in issuePageRows"
          :key="index"
        >
          <NTag
            :type="issue.level === 'error' ? 'error' : 'warning'"
            :size="size"
          >
            {{ t(issue.level) }}
          </NTag>
          <span v-if="issue.row != null">{{
            t('row', { row: issue.row })
          }}</span>
          <span v-if="issue.field">{{ issue.field }}</span>
          <span>{{ issue.message }}</span>
        </li>
      </ul>
      <NPagination
        v-if="issues.length > issuePageSize"
        v-model:page="issuePage"
        :page-size="issuePageSize"
        :item-count="issues.length"
        :page-slot="5"
        :size="size"
      />
      <div class="c-import-wizard__actions">
        <NButton
          attr-type="button"
          :size="size"
          :disabled="disabled || phase === 'commit' || failedPhase === 'commit'"
          @click="editMapping"
        >
          {{ t('back') }}
        </NButton>
        <NButton
          attr-type="button"
          type="primary"
          :size="size"
          :loading="phase === 'commit'"
          :disabled="!canCommit"
          @click="commit"
        >
          {{ t('confirm') }}
        </NButton>
      </div>
    </template>
    <template v-else-if="sheet">
      <h4 class="c-import-wizard__title">{{ t('mapping') }}</h4>
      <div class="c-import-wizard__mapping">
        <span>{{ t('sheet') }}</span>
        <NSelect
          role="group"
          :aria-label="t('sheet')"
          :options="sheetOptions"
          :value="sheetKey"
          :size="size"
          :disabled="disabled || Boolean(phase)"
          @update:value="selectSheet"
        />
        <template
          v-for="field in fields"
          :key="field.key"
        >
          <span
            >{{ field.label
            }}<span v-if="field.required"> {{ t('required') }}</span></span
          >
          <NSelect
            role="group"
            :aria-label="field.label"
            :options="columnOptions(field.key)"
            :value="selected.get(field.key) ?? null"
            :size="size"
            :disabled="disabled || Boolean(phase)"
            :placeholder="t('column')"
            clearable
            @update:value="value => chooseMapping(field.key, value)"
          />
        </template>
      </div>
      <div class="c-import-wizard__actions">
        <NButton
          v-if="phase === 'preview'"
          attr-type="button"
          :size="size"
          @click="editMapping"
        >
          {{ t('cancelPreview') }}
        </NButton>
        <NButton
          attr-type="button"
          type="primary"
          :size="size"
          :loading="phase === 'preview'"
          :disabled="!canPreview"
          @click="preview"
        >
          {{ t('preview') }}
        </NButton>
      </div>
    </template>
    <NButton
      v-if="session || phase === 'read'"
      attr-type="button"
      text
      :size="size"
      :disabled="disabled || phase === 'commit'"
      @click="cancel"
    >
      {{ t(results || failedPhase === 'commit' ? 'restart' : 'cancel') }}
    </NButton>
  </section>
</template>

<script setup lang="ts" generic="K extends string = string, Plan = unknown">
  import { computed, defineAsyncComponent, ref, useId, watch } from 'vue'
  import { NAlert, NButton, NPagination, NSelect, NTag } from 'naive-ui'
  import { useComponentDensity } from '../../composables/useComponentDensity'
  import { useComponentTheme } from '../../composables/useComponentTheme'
  import { resolveComponentDensity } from '../../core/density'
  import type { BatchOperationResult } from '../../core/batchPatch'
  import { useScopedComponentLocale } from '../_shared/useScopedComponentLocale'
  import { useImportWizard } from './data'
  import { CHINESE, ENGLISH } from './locale'
  import type { ImportWizardPhase, ImportWizardProps } from './types'

  defineOptions({ name: 'C_ImportWizard' })
  const props = defineProps<ImportWizardProps<K, Plan>>()
  const emit = defineEmits<{
    completed: [results: readonly BatchOperationResult[]]
    failure: [phase: ImportWizardPhase, cause: unknown]
  }>()
  defineSlots<{
    results?: (props: { results: readonly BatchOperationResult[] }) => unknown
  }>()
  const C_BatchResult = defineAsyncComponent(
    () => import('../C_BatchResult/index.vue')
  )
  const inputId = useId()
  const { t: translate } = useScopedComponentLocale(
    CHINESE,
    ENGLISH,
    () => props.locale
  )
  const t = (key: string, params?: Record<string, string | number>) =>
    translate(`importWizard.${key}`, params)
  const density = useComponentDensity(() => props.density)
  const layout = computed(() => resolveComponentDensity(density.value))
  const size = computed(() => layout.value.size)
  const theme = useComponentTheme()
  const themeStyle = computed(() => ({
    ...theme.value,
    '--c-import-gap': `${layout.value.gap}px`,
  }))
  const {
    session,
    sheetKey,
    sheet,
    fields,
    selected,
    review,
    results,
    phase,
    failedPhase,
    canPreview,
    canCommit,
    loadFile,
    chooseMapping,
    preview,
    commit,
    cancel,
    editMapping,
    selectSheet,
  } = useImportWizard(
    props,
    value => emit('completed', value),
    (phase, cause) => emit('failure', phase, cause)
  )

  const sheetOptions = computed(
    () =>
      session.value?.sheets.map(({ key, label }) => ({ value: key, label })) ??
      []
  )
  const reservedColumns = computed(
    () => new Map([...selected.value].map(([field, column]) => [column, field]))
  )
  const columnOptions = (field: K) =>
    sheet.value?.columns.map(({ key, label }) => ({
      value: key,
      label,
      disabled:
        reservedColumns.value.has(key) &&
        reservedColumns.value.get(key) !== field,
    })) ?? []

  const issues = computed(() => review.value?.issues ?? [])
  const issuePage = ref(1)
  const issuePageSize = 16
  const issuePageRows = computed(() =>
    issues.value.slice(
      (issuePage.value - 1) * issuePageSize,
      issuePage.value * issuePageSize
    )
  )
  watch(review, () => {
    issuePage.value = 1
  })
  // Retry policy stays with the caller because a preview may have committed only some rows.
  const resultRows = computed(
    () => results.value?.map(row => ({ ...row, retryable: false })) ?? []
  )
  const onFile = (event: Event) => {
    const input = event.target
    if (!(input instanceof HTMLInputElement)) return
    const file = input.files?.[0]
    input.value = ''
    if (file) void loadFile(file)
  }
</script>

<style scoped lang="scss">
  @use './index.scss';
</style>
