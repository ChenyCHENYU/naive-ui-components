/*
 * @Description: 表格全局配置 — provide/inject 机制实现全局默认值 + 局部覆盖
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
 */

import { inject, type InjectionKey } from 'vue'
import type { TableConfig, DisplayConfig } from './useTableConfig'
import type { DataRecord } from '../types'

/* ================= 内置格式化器 ================= */

export type FormatterType =
  | 'date'
  | 'datetime'
  | 'currency'
  | 'percent'
  | 'enum'
  | 'number'

export interface FormatterConfig {
  /** 日期格式 */
  date?: { format?: string }
  /** 日期时间格式 */
  datetime?: { format?: string }
  /** 货币格式 */
  currency?: { prefix?: string; suffix?: string; precision?: number }
  /** 百分比格式 */
  percent?: { precision?: number; suffix?: string }
  /** 数字格式（千分位） */
  number?: { precision?: number }
}

/** 列级 formatter 配置 */
export interface ColumnFormatter {
  type: FormatterType
  /** enum mapping：{ male: '男', female: '女' } */
  mapping?: Record<string, string>
  /** 自定义格式化函数（优先级最高） */
  fn?: (value: unknown, row: DataRecord) => string
  /** 覆盖全局格式配置 */
  config?: Record<string, unknown>
}

/* ================= 全局配置类型 ================= */

export interface TableGlobalConfig {
  /** 表格显示默认值 */
  display?: DisplayConfig
  /** 默认分页条数 */
  pageSize?: number
  /** 空状态文案 */
  emptyText?: string
  /** 全局格式化配置 */
  formatter?: FormatterConfig
  /** 列配置持久化前缀 */
  persistPrefix?: string
  /** 默认导出文件名 */
  exportFilename?: string
}

/* ================= Injection Key ================= */

export const TABLE_GLOBAL_CONFIG_KEY: InjectionKey<TableGlobalConfig> = Symbol(
  'C_TABLE_GLOBAL_CONFIG'
)

/* ================= 格式化引擎 ================= */

const defaultFormatters: FormatterConfig = {
  date: { format: 'YYYY-MM-DD' },
  datetime: { format: 'YYYY-MM-DD HH:mm:ss' },
  currency: { prefix: '¥', precision: 2 },
  percent: { precision: 2, suffix: '%' },
  number: { precision: 0 },
}

/**
 *
 */
function formatDate(value: unknown, format: string): string {
  if (value == null || value === '') return '-'
  const d = new Date(typeof value === 'number' ? value : String(value))
  if (Number.isNaN(d.getTime())) return String(value)

  const pad = (n: number) => String(n).padStart(2, '0')
  return format
    .replace('YYYY', String(d.getFullYear()))
    .replace('MM', pad(d.getMonth() + 1))
    .replace('DD', pad(d.getDate()))
    .replace('HH', pad(d.getHours()))
    .replace('mm', pad(d.getMinutes()))
    .replace('ss', pad(d.getSeconds()))
}

/**
 *
 */
function formatNumber(value: unknown, precision: number): string {
  if (value == null || value === '') return '-'
  const num = Number(value)
  if (Number.isNaN(num)) return String(value)
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  })
}

/** 各类型的格式化策略 */
const formatterStrategies: Record<
  string,
  (value: unknown, cfg: Record<string, any>) => string
> = {
  date: (v, cfg) => formatDate(v, cfg.format ?? 'YYYY-MM-DD'),
  datetime: (v, cfg) => formatDate(v, cfg.format ?? 'YYYY-MM-DD HH:mm:ss'),
  currency: (v, cfg) => {
    const numStr = formatNumber(v, cfg.precision ?? 2)
    return numStr === '-'
      ? '-'
      : `${cfg.prefix ?? '¥'}${numStr}${cfg.suffix ?? ''}`
  },
  percent: (v, cfg) => {
    if (v == null || v === '') return '-'
    const num = Number(v)
    if (Number.isNaN(num)) return String(v)
    return `${(num * 100).toFixed(cfg.precision ?? 2)}${cfg.suffix ?? '%'}`
  },
  number: (v, cfg) => formatNumber(v, cfg.precision ?? 0),
}

/** 根据 ColumnFormatter 配置格式化单元格值 */
export function applyFormatter(
  value: unknown,
  row: DataRecord,
  formatter: ColumnFormatter,
  globalConfig?: FormatterConfig
): string {
  if (formatter.fn) return formatter.fn(value, row)

  if (formatter.type === 'enum') {
    if (!formatter.mapping) return String(value ?? '-')
    return formatter.mapping[String(value)] ?? String(value ?? '-')
  }

  const strategy = formatter.type && formatterStrategies[formatter.type]
  if (!strategy) return String(value ?? '-')

  const merged = { ...defaultFormatters, ...globalConfig }
  const cfg = {
    ...(merged as Record<string, any>)[formatter.type!],
    ...(formatter.config as Record<string, any> | undefined),
  }
  return strategy(value, cfg)
}

/* ================= Hook ================= */

/** 在组件内获取全局配置（自动合并默认值） */
export function useTableGlobalConfig(): TableGlobalConfig {
  return inject(TABLE_GLOBAL_CONFIG_KEY, {})
}

/** 合并全局配置到 TableConfig（局部 > 全局 > 默认） */
export function mergeGlobalConfig(
  local: TableConfig,
  global: TableGlobalConfig
): TableConfig {
  const merged = { ...local }

  if (global.display) {
    merged.display = local.display
      ? { ...global.display, ...local.display }
      : global.display
  }

  if (global.pageSize && local.pagination !== false) {
    const cur = typeof local.pagination === 'object' ? local.pagination : {}
    if (!cur.pageSize) {
      merged.pagination = { ...cur, pageSize: global.pageSize }
    }
  }

  return merged
}
