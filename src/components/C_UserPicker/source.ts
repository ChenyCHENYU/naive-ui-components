import type {
  DataPickerSourceInput,
  DataPickerValue,
} from '../C_DataPicker/types'
import type { UserPickerSource, UserPickerIdentityField } from './types'

/** 注册一次人员来源；字段编码保留其本来的 string/number 类型。 */
export function createUserPickerSource<
  T extends object,
  F extends object,
  K extends UserPickerIdentityField<T, DataPickerValue>,
>(
  source: Omit<DataPickerSourceInput<T, F>, 'rowKey' | 'value'> & {
    rowKey: K
    value?: undefined
  }
): UserPickerSource<T, Extract<T[K], DataPickerValue>, F>
export function createUserPickerSource<
  T extends object,
  V extends DataPickerValue,
  F extends object,
>(source: UserPickerSource<T, V, F>): UserPickerSource<T, V, F>
export function createUserPickerSource<T extends object, F extends object>(
  source: DataPickerSourceInput<T, F>
): DataPickerSourceInput<T, F> {
  return source
}
