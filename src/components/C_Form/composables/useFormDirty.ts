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
  isReactive,
  type ComputedRef,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue'
import type { FormModel } from '../types'
import { cloneFormValue, isFormValueEqual } from '../utils/formModel'
import { getDataPath, parseDataPath } from '../../../utils/data'

/** 路径中任一中间容器不可观察时，完整报告需要实时比较。 */
function isObservablePath(model: FormModel, field: string): boolean {
  // 跟踪 literal dotted-key 的新增/移除，保持 getDataPath 的优先语义。
  if (
    Reflect.has(model, field) &&
    Object.prototype.hasOwnProperty.call(model, field)
  ) {
    return isReactive(model)
  }
  let current: unknown = model
  for (const segment of parseDataPath(field)) {
    if (!current || typeof current !== 'object' || !isReactive(current))
      return false
    current = (current as Record<string, unknown>)[segment]
  }
  return true
}

/** Read reactive collections before the data comparator unwraps their proxies. */
function trackNestedValue(value: unknown, seen = new Set<object>()): boolean {
  if (value === null || typeof value !== 'object' || seen.has(value))
    return true
  seen.add(value)
  // Date、标记为 raw 的值和第三方实例没有深层失效信号，不能缓存比较结果。
  let observable = isReactive(value)
  if (Array.isArray(value)) {
    // 数组迭代订阅也覆盖空位填充；Object.values 会遗漏这类失效信号。
    for (const entry of value)
      observable = trackNestedValue(entry, seen) && observable
    return observable
  }
  if (value instanceof Map) {
    value.forEach((entry, key) => {
      observable = trackNestedValue(key, seen) && observable
      observable = trackNestedValue(entry, seen) && observable
    })
    return observable
  }
  if (value instanceof Set) {
    value.forEach(entry => {
      observable = trackNestedValue(entry, seen) && observable
    })
    return observable
  }
  Object.values(value).forEach(entry => {
    observable = trackNestedValue(entry, seen) && observable
  })
  return observable
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
  const fieldChecks = new Map<
    string,
    ComputedRef<{ dirty: boolean; cacheable: boolean }>
  >()
  const reactiveModel = isReactive(formModel)

  function collectFieldNames(): Set<string> {
    const names = new Set(
      fields
        ? toValue(fields)
        : [...Object.keys(initialSnapshot.value), ...Object.keys(formModel)]
    )
    // 动态字段移除后不保留它的计算闭包和旧数据依赖。
    for (const field of fieldChecks.keys()) {
      if (!names.has(field)) fieldChecks.delete(field)
    }
    return names
  }
  const isDirty = computed(() => {
    for (const field of collectFieldNames()) {
      if (cachedFieldDirty(field)) return true
    }
    return false
  })

  /** 获取与初始快照相比发生变化的字段名列表 */
  function getChangedFields(): string[] {
    const changed: string[] = []
    for (const field of collectFieldNames()) {
      if (cachedFieldDirty(field)) changed.push(field)
    }
    return changed
  }

  /** 检查指定字段是否相对于初始快照已修改 */
  function isFieldDirty(field: string): boolean {
    return compareField(field)
  }

  function cachedFieldDirty(field: string): boolean {
    // 独立调用可传普通对象；没有响应式失效信号时仍实时比较。
    if (!reactiveModel) return compareField(field)
    let check = fieldChecks.get(field)
    if (!check) {
      // 只重新比较真正变化的字段；总脏状态与完整报告共享计算结果。
      check = computed(() => {
        const current = getDataPath(formModel, field)
        const observablePath = isObservablePath(formModel, field)
        return {
          cacheable: trackNestedValue(current) && observablePath,
          dirty: !isFormValueEqual(
            getDataPath(initialSnapshot.value, field),
            current
          ),
        }
      })
      fieldChecks.set(field, check)
    }
    return check.value.cacheable ? check.value.dirty : compareField(field)
  }

  function compareField(field: string): boolean {
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
