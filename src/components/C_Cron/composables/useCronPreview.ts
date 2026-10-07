/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-25
 * @Description: Cron 执行时间预测
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */

import { onScopeDispose, ref, watch, type Ref } from 'vue'
import type { CronValidation } from '../types'
import { findNextCronExecutions } from '../cronSchedule'

/**
 * 解析 Cron 表达式，预测未来 N 次执行时间
 * 纯逻辑实现，不依赖外部库
 */
export function useCronPreview(
  expression: Ref<string>,
  validation: Ref<CronValidation>,
  count: Ref<number>,
  enabled: Ref<boolean> = ref(true)
) {
  /** 预测的执行时间列表 */
  const nextExecutions = ref<Date[]>([])

  /** 是否正在计算 */
  const computing = ref(false)
  let computationVersion = 0
  let computationTimer: ReturnType<typeof setTimeout> | null = null

  /* ─── 监听表达式变化自动计算 ─────────────────── */

  watch(
    [expression, count, validation, enabled],
    () => {
      computationVersion += 1
      const version = computationVersion
      if (computationTimer) clearTimeout(computationTimer)
      if (!validation.value.valid || !enabled.value) {
        nextExecutions.value = []
        computing.value = false
        computationTimer = null
        return
      }
      nextExecutions.value = []
      computing.value = true
      computationTimer = setTimeout(async () => {
        const result = await findNextCronExecutions(
          expression.value,
          count.value,
          new Date(),
          () => version !== computationVersion
        )
        if (version !== computationVersion) return
        nextExecutions.value = result
        computing.value = false
        computationTimer = null
      }, 0)
    },
    { immediate: true }
  )

  onScopeDispose(() => {
    computationVersion += 1
    if (computationTimer) clearTimeout(computationTimer)
  })

  /* ─── 格式化输出 ───────────────────────────── */

  /** 格式化日期为字符串 */
  function formatDate(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  }

  /** 获取日期的中文星期名称 */
  function formatWeekDay(date: Date): string {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return days[date.getDay()]
  }

  return {
    nextExecutions,
    computing,
    formatDate,
    formatWeekDay,
  }
}
