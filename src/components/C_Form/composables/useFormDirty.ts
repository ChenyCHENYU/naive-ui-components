/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-03-13 00:22:28
 * @LastEditors: ChenYu ycyplus@gmail.com
 * @LastEditTime: 2026-03-13 00:26:33
 * @FilePath: \robot\naive-ui-components\src\components\C_Form\composables\useFormDirty.ts
 * @Description: 表单脏检查引擎 — 追踪初始快照与当前值的差异
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
 */

import {
  shallowRef,
  computed,
  toValue,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue'
import type { FormModel } from '../types'
import { cloneFormValue, isFormValueEqual } from '../utils/formModel'
import { getDataPath } from '../../../utils/data'

/** Read reactive collections before the data comparator unwraps their proxies. */
function trackNestedValue(value: unknown, seen = new Set<object>()): void {
  if (value === null || typeof value !== 'object' || seen.has(value)) return
  seen.add(value)
  if (value instanceof Map) {
    value.forEach((entry, key) => {
      trackNestedValue(key, seen)
      trackNestedValue(entry, seen)
    })
    return
  }
  if (value instanceof Set) {
    value.forEach(entry => trackNestedValue(entry, seen))
    return
  }
  Object.values(value).forEach(entry => trackNestedValue(entry, seen))
}

export interface UseFormDirtyReturn {
  /** 表单是否已修改 */
  isDirty: Ref<boolean>
  /** 获取发生变化的字段名列表 */
  getChangedFields: () => string[]
  /** 检查指定字段是否脏 */
  isFieldDirty: (field: string) => boolean
  /** 保存当前值为干净快照 */
  markAsClean: () => void
  /** 获取干净快照的独立副本 */
  getCleanModel: () => FormModel
}

/**
 * 脏检查 Composable — 追踪 formModel 相对于初始快照的变化
 * @param formModel 响应式表单数据对象（reactive）
 */
export function useFormDirty(
  formModel: FormModel,
  fields?: MaybeRefOrGetter<readonly string[]>
): UseFormDirtyReturn {
  const initialSnapshot: Ref<Record<string, unknown>> = shallowRef({})

  const fieldNames = () =>
    new Set(
      fields
        ? toValue(fields)
        : [...Object.keys(initialSnapshot.value), ...Object.keys(formModel)]
    )

  const isDirty = computed(() => {
    for (const field of fieldNames()) {
      if (isFieldDirty(field)) return true
    }
    return false
  })

  /** 获取与初始快照相比发生变化的字段名列表 */
  function getChangedFields(): string[] {
    const changed: string[] = []
    for (const field of fieldNames()) {
      if (isFieldDirty(field)) changed.push(field)
    }
    return changed
  }

  /** 检查指定字段是否相对于初始快照已修改 */
  function isFieldDirty(field: string): boolean {
    const current = getDataPath(formModel, field)
    trackNestedValue(current)
    return !isFormValueEqual(getDataPath(initialSnapshot.value, field), current)
  }

  /** 将当前 formModel 保存为干净快照 */
  function markAsClean(): void {
    initialSnapshot.value = cloneFormValue(formModel as Record<string, unknown>)
  }

  function getCleanModel(): FormModel {
    return cloneFormValue(initialSnapshot.value)
  }

  return {
    isDirty,
    getChangedFields,
    isFieldDirty,
    markAsClean,
    getCleanModel,
  }
}
