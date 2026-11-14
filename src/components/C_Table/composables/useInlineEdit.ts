/** 常显控件的模型所有权；只合并同一 tick 的受控更新，不保留可取消草稿。 */
import {
  computed,
  ref,
  watch,
  nextTick,
  getCurrentInstance,
  onActivated,
  onDeactivated,
  getCurrentScope,
  onScopeDispose,
} from 'vue'
import type { DataTableRowKey } from 'naive-ui'
import type { DataRecord, TableColumn } from '../types'
import {
  flattenTableColumns,
  flattenTableRows,
  replaceTableRow,
} from '../helpers'
import { isTableColumnEditable } from './tableValidation'
import { cloneData } from '../../../utils/data'

interface InlineEditOptions {
  enabled: () => boolean
  data: () => readonly DataRecord[]
  columns: () => TableColumn[]
  rowKey: (row: DataRecord) => DataTableRowKey
  childrenKey: () => string | undefined
  update?: (rows: DataRecord[]) => void
}
interface InlinePatch {
  row: DataRecord
  values: DataRecord
}

function canWrite(
  column: TableColumn | undefined,
  row: DataRecord,
  index: number
) {
  return Boolean(
    column &&
    column.visible !== false &&
    !column.editProps?.disabled &&
    !column.editProps?.readonly &&
    isTableColumnEditable(column, row, index)
  )
}

/** 绑定当前真实源行；失活、换源和列替换都会结束旧控件的写入所有权。 */
export function useInlineEdit(options: InlineEditOptions) {
  const publish = options.update
  const revision = ref(0)
  let active = true
  let disposed = false
  let batch:
    | {
        rows: DataRecord[]
        patches: Map<DataRecord, InlinePatch>
      }
    | undefined
  const owners = computed(() => {
    const result = new Map<
      DataTableRowKey,
      { row: DataRecord; index: number } | null
    >()
    if (options.enabled())
      flattenTableRows(options.data(), options.childrenKey()).forEach(
        (row, index) => {
          const key = options.rowKey(row)
          result.set(key, result.has(key) ? null : { row, index })
        }
      )
    return result
  })
  const invalidate = () => {
    revision.value++
    batch = undefined
  }
  watch([owners, options.columns], invalidate, { flush: 'sync' })
  if (getCurrentInstance()) {
    onDeactivated(() => {
      active = false
      invalidate()
    })
    onActivated(() => {
      if (!active) {
        active = true
        invalidate()
      }
    })
  }
  if (getCurrentScope())
    onScopeDispose(() => {
      disposed = true
      invalidate()
    })

  const currentModel = (row: DataRecord, prior?: InlinePatch) => {
    const children = options.childrenKey()
    // 子行更新会复制祖先；树内按稳定键取得当下目标，不能覆盖刚更新的后代。
    const key = options.rowKey(prior?.row ?? row)
    const matches =
      batch && children
        ? flattenTableRows(batch.rows, children).filter(
            item => options.rowKey(item) === key
          )
        : [prior?.row ?? row]
    if (matches.length !== 1) return
    const previous = matches[0]
    const value = { ...row, ...prior?.values }
    if (children) value[children] = previous[children]
    return { previous, value }
  }

  const bind = (column: TableColumn, row: DataRecord) => {
    const expected = revision.value
    if (disposed || !active || !options.enabled() || !publish) return
    const owner = owners.value.get(options.rowKey(row))
    if (
      !owner ||
      owner.row !== row ||
      !isTableColumnEditable(column, row, owner.index)
    )
      return
    const field = String(column.key)
    const owns = () =>
      !disposed && active && expected === revision.value && options.enabled()
    const writableModel = () => {
      if (!owns()) return
      const current = flattenTableColumns(options.columns()).find(
        item => String(item.key) === field
      )
      const model = currentModel(row, batch?.patches.get(row))
      return model && canWrite(current, model.value, owner.index)
        ? model
        : undefined
    }
    return {
      index: owner.index,
      update: (value: unknown) => {
        // 权限按当下模型判断；同 tick 的控制字段更新不能被旧回调绕过。
        const model = writableModel()
        if (!model || !owns()) return
        if (!batch) {
          const pending = (batch = {
            rows: [...options.data()],
            patches: new Map(),
          })
          // 父级可同步接收多个字段事件；下一轮渲染以其受控源为准，不累积未确认值。
          void nextTick(() => {
            if (batch === pending) batch = undefined
          })
        }
        const values = {
          ...batch.patches.get(row)?.values,
          [field]: cloneData(value),
        }
        const updated = { ...model.value, [field]: values[field] }
        batch.rows = replaceTableRow(
          batch.rows,
          model.previous,
          updated,
          options.childrenKey()
        )
        batch.patches.set(row, { row: updated, values })
        publish(batch.rows)
      },
    }
  }
  return { bind }
}
