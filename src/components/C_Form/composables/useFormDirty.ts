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
import { cloneFormValue, isFormValueEqual } from '../utils/formModel'

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
export function useFormDirty(formModel: FormModel): UseFormDirtyReturn {
  const initialSnapshot: Ref<Record<string, unknown>> = ref({})

  const isDirty = computed(() => getChangedFields().length > 0)

  /** 获取与初始快照相比发生变化的字段名列表 */
  function getChangedFields(): string[] {
    const snap = initialSnapshot.value
    const allKeys = new Set([...Object.keys(snap), ...Object.keys(formModel)])
    const changed: string[] = []
    for (const key of allKeys) {
      if (
        !isFormValueEqual(
          snap[key],
          (formModel as Record<string, unknown>)[key]
        )
      ) {
        changed.push(key)
      }
    }
    return changed
  }

  /** 检查指定字段是否相对于初始快照已修改 */
  function isFieldDirty(field: string): boolean {
    return !isFormValueEqual(
      initialSnapshot.value[field],
      (formModel as Record<string, unknown>)[field]
    )
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
