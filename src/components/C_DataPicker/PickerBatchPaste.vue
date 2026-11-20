<template>
  <div class="c-data-picker__batch">
    <NButton
      :size="size"
      :disabled="confirming"
      :aria-expanded="visible"
      :aria-controls="visible ? batchId : undefined"
      @click="toggleBatch"
      >{{ t('picker.batch.open') }}</NButton
    >
    <section
      v-if="visible"
      :id="batchId"
      class="c-data-picker__batch-body"
      :aria-label="t('picker.batch.open')"
      :aria-busy="pending"
    >
      <NInput
        ref="batchInput"
        type="textarea"
        :value="input"
        :size="size"
        :rows="4"
        :resizable="false"
        :placeholder="t('picker.batch.hint')"
        :input-props="{ 'aria-label': t('picker.batch.input') }"
        :disabled="confirming"
        @update:value="update"
        @keydown.enter.stop
      />
      <div class="c-data-picker__batch-actions">
        <NButton
          :size="size"
          :disabled="confirming"
          :loading="pending"
          @click="lookup"
          >{{ t('picker.batch.lookup') }}</NButton
        >
        <NButton
          v-if="results.length"
          :size="size"
          :disabled="confirming || !count"
          type="primary"
          secondary
          @click="apply"
          >{{ t('picker.batch.add', { count: count }) }}</NButton
        >
      </div>
      <p
        v-if="error"
        role="alert"
        class="c-data-picker__batch-error"
        >{{
          t(`picker.batch.${error}`, {
            count: maxItems,
          })
        }}</p
      >
      <ul
        v-if="results.length"
        class="c-data-picker__batch-results"
        :aria-label="t('picker.batch.results')"
      >
        <li
          v-for="result in results"
          :key="result.code"
          :data-match="result.status"
        >
          <span class="c-data-picker__batch-code">{{ result.code }}</span>
          <span
            v-if="result.row"
            class="c-data-picker__batch-label"
            >{{ source.label(result.row) }}</span
          >
          <NTag
            :type="
              result.status === 'match'
                ? 'success'
                : result.status === 'selected'
                  ? 'default'
                  : 'warning'
            "
            size="small"
            >{{ t(`picker.batch.${result.status}`) }}</NTag
          >
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts" generic="T extends object">
  import { nextTick, shallowRef } from 'vue'
  import { NButton, NInput, NTag, type InputInst } from 'naive-ui'
  import { useBatchLocale } from './batchLocale'
  import type { usePickerBatchPaste } from './usePickerBatchPaste'
  import type { DataPickerSourceInput } from './types'

  const props = defineProps<{
    state: ReturnType<typeof usePickerBatchPaste<T, object>>
    source: Pick<DataPickerSourceInput<T>, 'label'>
    size: 'tiny' | 'small' | 'medium' | 'large'
    confirming: boolean
    batchId: string
  }>()

  const { t } = useBatchLocale()
  const {
    visible,
    input,
    pending,
    results,
    count,
    error,
    maxItems,
    update,
    lookup,
    apply,
  } = props.state
  const batchInput = shallowRef<InputInst | null>(null)
  function toggleBatch() {
    props.state.toggle()
    if (visible.value) void nextTick(() => batchInput.value?.focus())
  }
</script>

<style scoped lang="scss">
  .c-data-picker {
    &__batch {
      margin-block-end: 12px;
    }
    &__batch-body {
      display: grid;
      gap: 8px;
      margin-block-start: 8px;
      padding: 10px;
      border: 1px solid var(--c-border, var(--c-theme-border, #e0e0e6));
      border-radius: var(--c-radius, var(--c-theme-radius, 8px));
    }
    &__batch-actions,
    &__batch-results li {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    &__batch-results {
      display: grid;
      gap: 6px;
      max-block-size: 140px;
      overflow: auto;
      margin: 0;
      padding: 0;
      list-style: none;
      font-size: 12px;
    }
    &__batch-code,
    &__batch-label {
      overflow-wrap: anywhere;
    }
    &__batch-code {
      font-weight: 600;
    }
    &__batch-error {
      margin: 0;
      font-size: 12px;
      color: var(--c-error, var(--c-theme-error, #d03050));
    }
  }
</style>
