/*
 * @Description: 表格导出 Excel/CSV 功能
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
 */

import type { DataRecord, TableColumn, ColumnWithKey } from '../types'
import { applyFormatter, type FormatterConfig } from './useTableGlobalConfig'

/* ================= 类型定义 ================= */

export interface ExportConfig {
  /** 导出文件名（不含扩展名） */
  filename?: string
  /** 导出格式 */
  format?: 'csv' | 'xlsx'
  /** 是否包含表头 */
  includeHeader?: boolean
  /** 自定义选择导出列（传 key 数组） */
  columnKeys?: string[]
  /** CSV 分隔符 */
  csvSeparator?: string
  /** 阻止表格软件把用户文本识别为公式，默认开启 */
  preventFormulaInjection?: boolean
  /** 全局格式化配置（用于 formatter） */
  formatterConfig?: FormatterConfig
  /** 请求格式不可用并自动降级时的通知。 */
  onFallback?: (requested: 'xlsx', actual: 'csv', cause: unknown) => void
}

/* ================= 内部辅助 ================= */

/** 获取导出用的列（过滤掉内置列） */
function getExportColumns(
  columns: TableColumn[],
  columnKeys?: string[]
): ColumnWithKey[] {
  return (columns as ColumnWithKey[]).filter(col => {
    if (typeof col.key !== 'string' || col.key.startsWith('_')) return false
    if ((col as any).type === 'selection' || (col as any).type === 'expand')
      return false
    if (columnKeys?.length) return columnKeys.includes(col.key as string)
    return col.visible !== false
  })
}

/** 获取单元格导出值 */
function getCellValue(
  row: DataRecord,
  col: ColumnWithKey,
  formatterConfig?: FormatterConfig
): string {
  const raw = row[col.key as string]

  // 优先用 formatter
  if (col.formatter) {
    return applyFormatter(raw, row, col.formatter, formatterConfig)
  }

  if (raw == null) return ''
  if (typeof raw === 'boolean') return raw ? '是' : '否'
  return String(raw)
}

/* ================= CSV 导出 ================= */

/** 转义 CSV 单元格值 */
function escapeCSV(
  value: string,
  separator: string,
  preventFormulaInjection: boolean
): string {
  const safeValue =
    preventFormulaInjection && /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  if (
    safeValue.includes(separator) ||
    safeValue.includes('"') ||
    safeValue.includes('\n') ||
    safeValue.includes('\r')
  ) {
    return `"${safeValue.replace(/"/g, '""')}"`
  }
  return safeValue
}

function getSafeFilename(filename: string | undefined): string {
  const normalized = [...(filename || 'export')]
    .map(char =>
      char.charCodeAt(0) < 32 || '<>:"/\\|?*'.includes(char) ? '_' : char
    )
    .join('')
    .trim()
  return normalized || 'export'
}

/** 导出 CSV 文件 */
function exportCSV(
  data: DataRecord[],
  columns: TableColumn[],
  config: ExportConfig
): void {
  const sep = config.csvSeparator ?? ','
  const preventFormulaInjection = config.preventFormulaInjection !== false
  const exportCols = getExportColumns(columns, config.columnKeys)
  const lines: string[] = []

  if (config.includeHeader !== false) {
    lines.push(
      exportCols
        .map(col => escapeCSV(col.title ?? '', sep, preventFormulaInjection))
        .join(sep)
    )
  }

  for (const row of data) {
    const cells = exportCols.map(col =>
      escapeCSV(
        getCellValue(row, col, config.formatterConfig),
        sep,
        preventFormulaInjection
      )
    )
    lines.push(cells.join(sep))
  }

  // BOM + UTF-8
  const blob = new Blob(['\uFEFF' + lines.join('\n')], {
    type: 'text/csv;charset=utf-8;',
  })
  downloadBlob(blob, `${getSafeFilename(config.filename)}.csv`)
}

/* ================= XLSX 导出 ================= */

/** 导出 XLSX 文件（未安装 xlsx 时降级 CSV） */
async function exportXLSX(
  data: DataRecord[],
  columns: TableColumn[],
  config: ExportConfig
): Promise<void> {
  const exportCols = getExportColumns(columns, config.columnKeys)

  let XLSX: typeof import('xlsx')
  try {
    XLSX = await import('xlsx')
  } catch (error) {
    // xlsx 未安装时降级到 CSV
    config.onFallback?.('xlsx', 'csv', error)
    exportCSV(data, columns, { ...config, format: 'csv' })
    return
  }

  const headers = exportCols.map(col => col.title ?? col.key ?? '')
  const rows = data.map(row =>
    exportCols.map(col => getCellValue(row, col, config.formatterConfig))
  )

  const wsData = config.includeHeader !== false ? [headers, ...rows] : rows
  const ws = XLSX.utils.aoa_to_sheet(wsData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')

  XLSX.writeFile(wb, `${getSafeFilename(config.filename)}.xlsx`)
}

/* ================= 下载工具 ================= */

/** 下载 Blob 为文件 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/* ================= 对外 API ================= */

/**
 * 导出表格数据
 */
export async function exportTableData(
  data: DataRecord[],
  columns: TableColumn[],
  config: ExportConfig = {}
): Promise<void> {
  if (config.format === 'xlsx') {
    await exportXLSX(data, columns, config)
  } else {
    exportCSV(data, columns, config)
  }
}
