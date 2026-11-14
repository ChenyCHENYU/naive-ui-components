import type { VNodeChild } from 'vue'
import type { TableColumn } from '../C_Table/types'
import type { TreeProps, TreeNodeData } from '../C_Tree/types'
import type {
  DataPickerProps,
  DataPickerSourceInput,
  DataPickerValue,
  DataPickerExpose,
  DataPickerSelectionContext,
} from '../C_DataPicker/types'

export type UserPickerIdentityField<
  T extends object,
  V extends DataPickerValue,
> = {
  [K in Extract<keyof T, string>]: T[K] extends V ? K : never
}[Extract<keyof T, string>]

/** 编码类型由字段或 value 映射保证，不能把数字来源绑定为字符串模型。 */
export type UserPickerSource<
  T extends object,
  V extends DataPickerValue = DataPickerValue,
  F extends object = Record<string, unknown>,
> = Omit<DataPickerSourceInput<T, F>, 'rowKey' | 'value' | 'resolve'> & {
  resolve?(
    values: readonly V[],
    signal: AbortSignal,
    context?: { scope?: string | number }
  ): Promise<readonly T[]>
} & (
    | {
        rowKey: UserPickerIdentityField<T, V> | ((row: T) => V)
        value?: undefined
      }
    | {
        rowKey:
          | UserPickerIdentityField<T, DataPickerValue>
          | ((row: T) => DataPickerValue)
        value: (row: T) => V
      }
  )

export interface UserPickerFields<T extends object> {
  avatar?: Extract<keyof T, string>
  code?: Extract<keyof T, string>
  department?: Extract<keyof T, string>
  job?: Extract<keyof T, string>
  status?: Extract<keyof T, string>
}

/** 组织树只改变候选筛选范围，不把组织勾选转换为整部门人员选择。 */
export type UserPickerOrganization<
  O extends object = TreeNodeData,
  F extends object = Record<string, unknown>,
> = Omit<
  TreeProps<O>,
  'selectedKeys' | 'checkedKeys' | 'checkable' | 'multiple' | 'searchPattern'
> & {
  field: Extract<keyof F, string>
  title?: string
}

export type UserPickerModel<
  V extends DataPickerValue,
  M extends boolean,
> = M extends true ? V[] : V | null

export type UserPickerProps<
  T extends object,
  F extends object = Record<string, unknown>,
  O extends object = TreeNodeData,
  M extends boolean = false,
  V extends DataPickerValue = DataPickerValue,
> = Omit<
  DataPickerProps<T, F>,
  'source' | 'columns' | 'modelValue' | 'multiple' | 'navigation'
> & {
  source: UserPickerSource<T, V, F>
  modelValue?: M extends true ? readonly V[] : V | null
  multiple?: M
  columns?: TableColumn<T>[]
  fields?: UserPickerFields<T>
  organization?: UserPickerOrganization<O, F>
  /** 已选顺序可调整，适合顺序审批；默认只提供移除操作。 */
  selectionOrder?: boolean
}

export interface UserPickerEmits<
  T extends object,
  M extends boolean = false,
  V extends DataPickerValue = DataPickerValue,
> {
  'update:modelValue': [value: UserPickerModel<V, M>]
  select: [rows: T[]]
  cancel: []
}

export type UserPickerExpose = DataPickerExpose

export interface UserPickerSlots<T extends object> {
  trigger?: (context: {
    open: () => void
    disabled: boolean
    opened: boolean
    display: string
  }) => VNodeChild
  selected?: (context: DataPickerSelectionContext<T>) => VNodeChild
}
