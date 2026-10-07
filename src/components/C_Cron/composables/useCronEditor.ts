/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-07
 * @Description: Cron 编辑状态、配置和预览的统一编排
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */
import { computed, ref, watch } from 'vue'
import type { CronFieldType, CronFieldValue, CronProps } from '../types'
import {
  CRON_FIELD_META,
  CRON_TEMPLATES,
  DEFAULT_CRON_EXPRESSION,
} from '../constants'
import { useCronParser } from './useCronParser'
import { useCronPreview } from './useCronPreview'
import { useCronDescription } from './useCronDescription'

/** 让页面只配置模型与选项，组件内部管理合法值和输入草稿。 */
export function useCronEditor(props: CronProps) {
  const options = computed(() => ({
    disabled: props.config?.disabled ?? props.disabled ?? false,
    height: props.config?.height ?? props.height ?? 'auto',
    showSecond: props.config?.showSecond ?? props.showSecond ?? true,
    showTemplates: props.config?.showTemplates ?? props.showTemplates ?? true,
    showPreview: props.config?.showPreview ?? props.showPreview ?? true,
    templates: props.config?.templates ?? props.templates ?? CRON_TEMPLATES,
    previewCount: Math.min(
      50,
      Math.max(
        1,
        Number.isFinite(props.config?.previewCount ?? props.previewCount ?? 5)
          ? Math.trunc(props.config?.previewCount ?? props.previewCount ?? 5)
          : 5
      )
    ),
  }))
  const initialValue = props.modelValue ?? DEFAULT_CRON_EXPRESSION
  const parser = useCronParser()
  const draft = ref(initialValue)
  const validation = computed(() =>
    draft.value === parser.expression.value
      ? parser.validation.value
      : parser.validate(draft.value)
  )
  const pending = computed(() => draft.value !== parser.expression.value)
  const previewEnabled = computed(
    () => options.value.showPreview && !pending.value
  )
  const preview = useCronPreview(
    parser.expression,
    validation,
    computed(() => options.value.previewCount),
    previewEnabled
  )
  const { description } = useCronDescription(parser.expression, validation)
  const activeField = ref<CronFieldType>(
    options.value.showSecond ? 'second' : 'minute'
  )
  const visibleFields = computed(() =>
    CRON_FIELD_META.filter(
      field => options.value.showSecond || field.type !== 'second'
    )
  )
  const activeMeta = computed(() =>
    CRON_FIELD_META.find(field => field.type === activeField.value)!
  )
  const activeValue = computed(() => parser.cronValue.value[activeField.value])
  const segments = computed(() => parser.expression.value.split(' '))

  /** 外部设置和手动应用都保留非法原文，避免悄悄覆盖已有计划。 */
  function apply(value = draft.value): boolean {
    draft.value = value
    if (!parser.parse(value)) return false
    draft.value = parser.expression.value
    return true
  }

  /** 修改字段只作用于合法模型，日和星期的互斥由解析器统一处理。 */
  function updateField(value: CronFieldValue): void {
    if (options.value.disabled) return
    parser.cronValue.value[activeField.value] = value
    if (activeField.value === 'day' || activeField.value === 'week')
      parser.handleDayWeekExclusion(activeField.value)
    draft.value = parser.expression.value
  }

  /** 重置回挂载时的值，受控模型的后续变化不会改写初始快照。 */
  function reset(): void {
    apply(initialValue)
  }

  apply(initialValue)
  watch(
    () => props.modelValue,
    value => {
      if (value !== undefined && value !== parser.expression.value) apply(value)
    }
  )
  watch(
    () => options.value.showSecond,
    show => {
      if (!show && activeField.value === 'second') activeField.value = 'minute'
    }
  )
  return {
    options,
    draft,
    validation,
    pending,
    description,
    activeField,
    visibleFields,
    activeMeta,
    activeValue,
    segments,
    expression: parser.expression,
    preview,
    apply,
    updateField,
    reset,
  }
}
