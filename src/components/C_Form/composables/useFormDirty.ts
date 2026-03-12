/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-03-13 00:22:28
 * @LastEditors: ChenYu ycyplus@gmail.com
 * @LastEditTime: 2026-03-13 00:26:33
 * @FilePath: \robot\naive-ui-components\src\components\C_Form\composables\useFormDirty.ts
 * @Description: 表单脏检查引擎 — 追踪初始快照与当前值的差异
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
 */

import { ref, computed, type Ref } from 'vue'
import type { FormModel } from '../types'

/**
 * 深度比较两个值是否相等（支持基本类型、数组、普通对象）
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (a == null || b == null) return a === b
  if (typeof a !== typeof b) return false

  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false
    return a.every((v, i) => deepEqual(v, b[i]))
  }

  if (typeof a === 'object') {
    const keysA = Object.keys(a as Record<string, unknown>)
    const keysB = Object.keys(b as Record<string, unknown>)
    if (keysA.length !== keysB.length) return false
    return keysA.every(key =>
      deepEqual(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key]
      )
    )
  }

  return false
}

/**
 * 深拷贝（去除响应式引用）
 */
function snapshot(obj: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(obj))
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
}

/**
 * 脏检查 Composable — 追踪 formModel 相对于初始快照的变化
 * @param formModel 响应式表单数据对象（reactive）
 */
export function useFormDirty(formModel: FormModel): UseFormDirtyReturn {
  const initialSnapshot: Ref<Record<string, unknown>> = ref({})

  const isDirty = computed(() => getChangedFields().length > 0)

  /** 获取与初始快照相比发生变化的字段名列表 */
  function getChangedFields(): string[] {
    const snap = initialSnapshot.value
    const allKeys = new Set([...Object.keys(snap), ...Object.keys(formModel)])
    const changed: string[] = []
    for (const key of allKeys) {
      if (!deepEqual(snap[key], (formModel as Record<string, unknown>)[key])) {
        changed.push(key)
      }
    }
    return changed
  }

  /** 检查指定字段是否相对于初始快照已修改 */
  function isFieldDirty(field: string): boolean {
    return !deepEqual(
      initialSnapshot.value[field],
      (formModel as Record<string, unknown>)[field]
    )
  }

  /** 将当前 formModel 保存为干净快照 */
  function markAsClean(): void {
    initialSnapshot.value = snapshot(formModel as Record<string, unknown>)
  }

  return {
    isDirty,
    getChangedFields,
    isFieldDirty,
    markAsClean,
  }
}
