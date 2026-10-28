<template>
  <NAlert
    v-if="issues.length"
    type="error"
    class="c-error-summary"
    :title="`${title || t('validation.summary')}（${issues.length}）`"
  >
    <ul class="c-error-summary__list">
      <li
        v-for="issue in visibleIssues"
        :key="issue.key"
      >
        <button
          type="button"
          class="c-error-summary__target"
          @click="emit('navigate', issue)"
        >
          {{ issue.message }}
        </button>
      </li>
    </ul>
    <div
      v-if="issues.length > itemLimit"
      class="c-error-summary__pages"
    >
      <NButton
        text
        size="small"
        :disabled="currentPage === 0"
        @click="page = currentPage - 1"
        >{{ t('validation.previous') }}</NButton
      >
      <span aria-live="polite"
        >{{ currentPage * itemLimit + 1 }}–{{
          Math.min((currentPage + 1) * itemLimit, issues.length)
        }}
        / {{ issues.length }}</span
      >
      <NButton
        text
        size="small"
        :disabled="currentPage === pageCount - 1"
        @click="page = currentPage + 1"
        >{{ t('validation.next') }}</NButton
      >
    </div>
  </NAlert>
</template>

<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import { NAlert, NButton } from 'naive-ui'
  import type { ErrorSummaryProps } from './types'
  import type { ValidationIssue } from '../../core/validation'
  import { useComponentLocale } from '../../composables/useComponentLocale'

  defineOptions({ name: 'C_ErrorSummary' })
  const props = withDefaults(defineProps<ErrorSummaryProps>(), {
    limit: 8,
  })
  const emit = defineEmits<{ navigate: [issue: ValidationIssue] }>()
  const { t } = useComponentLocale(() => props.locale)
  const page = ref(0)
  const itemLimit = computed(() =>
    Number.isFinite(props.limit)
      ? Math.min(100, Math.max(1, Math.floor(props.limit)))
      : 8
  )
  const pageCount = computed(() =>
    Math.max(1, Math.ceil(props.issues.length / itemLimit.value))
  )
  const currentPage = computed(() => Math.min(page.value, pageCount.value - 1))
  const visibleIssues = computed(() =>
    props.issues.slice(
      currentPage.value * itemLimit.value,
      (currentPage.value + 1) * itemLimit.value
    )
  )
  watch(
    () => props.issues,
    () => {
      page.value = 0
    }
  )
</script>

<style scoped lang="scss">
  @use './index.scss';
</style>
