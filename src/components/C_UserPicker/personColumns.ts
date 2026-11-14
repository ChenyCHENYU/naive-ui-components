import { h } from 'vue'
import { NAvatar, NText } from 'naive-ui'
import type { TableColumn } from '../C_Table/types'
import type { DataPickerSourceInput } from '../C_DataPicker/types'
import type { UserPickerFields } from './types'

/** 可选人员字段只按声明的业务键读取，保留数字零的显示。 */
export function personField<T extends object>(
  row: T,
  field: Extract<keyof T, string> | undefined
): string {
  if (field === undefined) return ''
  const value = row[field]
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : ''
}

/** 常规人员显示在包中完成；特殊业务可直接覆盖 columns。 */
export function createPersonColumns<T extends object, F extends object>(
  source: DataPickerSourceInput<T, F>,
  fields: UserPickerFields<T> | undefined,
  label: (key: string) => string,
  disabledReason: ((row: T) => string | undefined) | undefined
): TableColumn<T>[] {
  const columns: TableColumn<T>[] = [
    {
      key: '__person',
      title: label('userPicker.name'),
      minWidth: 190,
      render: row =>
        h('div', { class: 'c-user-picker__person' }, [
          h(
            NAvatar,
            {
              round: true,
              size: 32,
              src: personField(row, fields?.avatar) || undefined,
            },
            { default: () => source.label(row).slice(0, 1) }
          ),
          h('div', { class: 'c-user-picker__identity' }, [
            h('strong', source.label(row)),
            h('small', personField(row, fields?.code)),
          ]),
        ]),
    },
  ]
  for (const key of ['department', 'job'] as const) {
    if (fields?.[key])
      columns.push({
        key: `__${key}`,
        title: label(`userPicker.${key}`),
        minWidth: 130,
        render: row => personField(row, fields[key]),
      })
  }
  if (fields?.status || disabledReason)
    columns.push({
      key: '__status',
      title: label('userPicker.status'),
      minWidth: 110,
      render: row => {
        const reason = disabledReason?.(row)
        return h(
          NText,
          {
            type: reason ? 'error' : undefined,
            title: reason,
          },
          () => reason || personField(row, fields?.status)
        )
      },
    })
  return columns
}
