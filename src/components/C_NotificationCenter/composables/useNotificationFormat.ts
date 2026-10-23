import { useComponentLocale } from '../../../config'
/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-27
 * @Description: 通知时间格式化
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */

/** 时间单位阈值 */
const MINUTE = 60_000
const HOUR = 3_600_000
const DAY = 86_400_000
const WEEK = 7 * DAY
const MONTH = 30 * DAY
const YEAR = 365 * DAY

/** 每次调用绑定当前应用的语言上下文，避免跨实例语言污染。 */
export function useNotificationFormat() {
  return createNotificationFormat()
}

/**
 * 创建格式化工具实例
 */
function createNotificationFormat() {
  const { t } = useComponentLocale()
  /**
   * 格式化相对时间
   * @param timestamp ISO 8601 时间字符串
   */
  function formatRelativeTime(timestamp: string): string {
    const date = new Date(timestamp)
    const now = Date.now()
    const diff = now - date.getTime()

    if (diff < 0) return t('time.now')
    if (diff < MINUTE) return t('time.now')
    if (diff < HOUR)
      return t('time.minutes', { count: Math.floor(diff / MINUTE) })
    if (diff < DAY) return t('time.hours', { count: Math.floor(diff / HOUR) })

    /* 判断是否是昨天 */
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today.getTime() - DAY)

    if (date >= yesterday && date < today) {
      return t('time.yesterday', {
        time: `${padTime(date.getHours())}:${padTime(date.getMinutes())}`,
      })
    }

    if (diff < WEEK) return t('time.days', { count: Math.floor(diff / DAY) })
    if (diff < MONTH) return t('time.weeks', { count: Math.floor(diff / WEEK) })
    if (diff < YEAR)
      return t('time.months', { count: Math.floor(diff / MONTH) })

    return formatFullDate(date)
  }

  /**
   * 格式化完整日期时间
   * @param date Date 对象
   */
  function formatFullDate(date: Date): string {
    const y = date.getFullYear()
    const m = padTime(date.getMonth() + 1)
    const d = padTime(date.getDate())
    const h = padTime(date.getHours())
    const min = padTime(date.getMinutes())
    return `${y}-${m}-${d} ${h}:${min}`
  }

  /**
   * 补零
   * @param n 数字
   */
  function padTime(n: number): string {
    return n < 10 ? `0${n}` : String(n)
  }

  return {
    formatRelativeTime,
    formatFullDate,
  }
}
