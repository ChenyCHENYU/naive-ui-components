import * as XLSX from 'xlsx'
import { MAX_EXCEL_PREVIEW_CELLS, resolvePreviewLimit } from './previewLimits'
import type {
  ExcelCell,
  ExcelColumn,
  ExcelLoadResult,
  ExcelRow,
  ExcelSheet,
} from './types'

interface ExcelMergeInfo {
  isMain: boolean
  rowspan: number
  colspan: number
}
function createExcelCell(
  cell: XLSX.CellObject | undefined,
  merge?: ExcelMergeInfo
): ExcelCell {
  const span = merge?.isMain ? merge : { rowspan: 1, colspan: 1 }
  return {
    value: cell?.v ?? '',
    displayValue: cell ? (cell.w ?? XLSX.utils.format_cell(cell)) : '',
    type: cell?.t,
    merged: Boolean(merge),
    hidden: Boolean(merge && !merge.isMain),
    rowspan: span.rowspan,
    colspan: span.colspan,
  }
}

function isValidExcelMerge(merge: XLSX.Range, maxRow: number, maxCol: number) {
  const { s, e } = merge
  return (
    [s.r, s.c, e.r, e.c].every(Number.isSafeInteger) &&
    s.r >= 0 &&
    s.c >= 0 &&
    e.r <= maxRow &&
    e.c <= maxCol &&
    e.r >= s.r &&
    e.c >= s.c
  )
}

/** Project a worksheet with a bounded cell and merge budget. */
export const processExcelSheet = (
  worksheet: XLSX.WorkSheet,
  merges: readonly XLSX.Range[],
  maxCells = MAX_EXCEL_PREVIEW_CELLS
): { data: ExcelRow[]; columns: ExcelColumn[] } => {
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1')
  const { c: maxCol, r: maxRow } = range.e
  const cellCount = (maxCol + 1) * (maxRow + 1)
  if (
    !Number.isSafeInteger(cellCount) ||
    cellCount < 1 ||
    cellCount >
      resolvePreviewLimit(maxCells, MAX_EXCEL_PREVIEW_CELLS, 'maxCells')
  ) {
    throw new Error(
      `工作表范围超过 ${maxCells.toLocaleString()} 个单元格的预览上限，请下载文件查看`
    )
  }

  const columns: ExcelColumn[] = Array.from({ length: maxCol + 1 }, (_, c) => {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c })
    const cell: XLSX.CellObject | undefined = worksheet[cellAddress]
    const columnName = cell ? String(cell.v ?? '').trim() : `列${c + 1}`
    return {
      title: columnName || `列${c + 1}`,
      key: `col_${c}`,
      width: Math.min(Math.max(columnName.length * 12, 80), 200),
    }
  })

  const mergeMap = new Map<string, ExcelMergeInfo>()
  let mergeCellVisits = 0
  merges.forEach(merge => {
    if (!isValidExcelMerge(merge, maxRow, maxCol)) return
    const {
      s: { r: sRow, c: sCol },
      e: { r: eRow, c: eCol },
    } = merge
    mergeCellVisits += (eRow - sRow + 1) * (eCol - sCol + 1)
    if (!Number.isSafeInteger(mergeCellVisits) || mergeCellVisits > cellCount) {
      throw new Error('合并单元格累计范围超过预览上限，请下载文件查看')
    }
    for (let r = sRow; r <= eRow; r++) {
      for (let c = sCol; c <= eCol; c++) {
        mergeMap.set(`${r}-${c}`, {
          isMain: r === sRow && c === sCol,
          rowspan: eRow - sRow + 1,
          colspan: eCol - sCol + 1,
        })
      }
    }
  })

  const data: ExcelRow[] = Array.from({ length: maxRow + 1 }, (_, r) => {
    const row: ExcelRow = {}
    for (let c = 0; c <= maxCol; c++) {
      const cellAddress = XLSX.utils.encode_cell({ r, c })
      const cell: XLSX.CellObject | undefined = worksheet[cellAddress]
      const mergeInfo = mergeMap.get(`${r}-${c}`)

      row[`col_${c}`] = createExcelCell(cell, mergeInfo)
    }
    return row
  })

  return { data, columns }
}

/** Read the workbook after the Excel parser is loaded for an Excel preview. */
export function readExcelWorkbook(
  arrayBuffer: ArrayBuffer,
  maxCells: number
): ExcelLoadResult {
  const workbook = XLSX.read(arrayBuffer, {
    type: 'array',
    cellStyles: true,
    cellFormula: true,
    cellDates: true,
  })

  if (!workbook.SheetNames.length) {
    throw new Error('Excel文件中没有找到工作表')
  }

  const sheets: ExcelSheet[] = workbook.SheetNames.map(name => {
    const worksheet = workbook.Sheets[name]
    const merges = worksheet['!merges'] || []
    return {
      name,
      data: [],
      merges,
      columns: [],
      load: () => processExcelSheet(worksheet, merges, maxCells),
    }
  })

  // 先准备首张表，让错误进入统一预览反馈；其他工作表在切换时才展开。
  Object.assign(sheets[0], sheets[0].load?.())
  return { sheets }
}
