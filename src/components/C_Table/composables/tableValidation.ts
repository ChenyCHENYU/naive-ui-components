import type { RuleItem, ValidateError } from 'async-validator'
import type { FormItemRule } from 'naive-ui'
import type { DataRecord, NormalTableColumn, TableColumn } from '../types'
import { createRequiredFormRule } from '../../C_Form/utils/formValidation'

/** 功能列不参与编辑和表单转换，数字字段键与普通业务列保持一致。 */
export function isEditableDataColumn<T extends object>(
  column: TableColumn<T>
): column is NormalTableColumn<T> {
  return (
    column.type === undefined &&
    column.editable !== false &&
    column.key !== '_actions' &&
    String(column.key ?? '').trim().length > 0
  )
}

/** 三种编辑模式共用列规则，复用表单的必填语义且不修改业务配置。 */
export function resolveTableColumnRules(
  column: TableColumn,
  getSource?: () => DataRecord
): FormItemRule[] {
  if (!isEditableDataColumn(column)) return []
  const rules = [...(column.editProps?.rules ?? [])]
  if (column.required && !rules.some(rule => rule.required)) {
    rules.unshift(
      createRequiredFormRule(column.title, `${column.title}不能为空`)
    )
  }
  return rules.map(rule => {
    const normalized = { ...rule }
    if (normalized.type === undefined) {
      if (column.editType === 'number') normalized.type = 'number'
      if (column.editType === 'switch') normalized.type = 'boolean'
    }
    if (rule.validator) {
      const validate = rule.validator
      normalized.validator = (nativeRule, value, callback, source, options) => {
        let called = false
        try {
          const result = validate(
            nativeRule,
            value,
            error => {
              called = true
              callback(error)
            },
            getSource?.() ?? source,
            options
          )
          // Naive 同步校验允许无返回值；已使用 callback 的校验不再重复完成。
          return result === undefined && !called ? true : result
        } catch (error) {
          return error instanceof Error ? error : new Error(String(error))
        }
      }
    }
    if (rule.asyncValidator) {
      const validate = rule.asyncValidator
      normalized.asyncValidator = (
        nativeRule,
        value,
        _callback,
        source,
        options
      ) =>
        new Promise<void>((resolve, reject) => {
          const result = validate(
            nativeRule,
            value,
            error => {
              if (error) reject(error)
              else resolve()
            },
            getSource?.() ?? source,
            options
          )
          result?.then(resolve, reject)
        })
    }
    return normalized
  })
}

/** 与 Naive 表单使用同一校验引擎，完整处理类型、嵌套、转换及异步规则。 */
export async function validateTableRule(
  rule: FormItemRule,
  value: unknown,
  label: string,
  source: DataRecord,
  field = rule.key ?? 'value'
): Promise<string | null> {
  if (rule.level === 'warning') return null
  const fallback = `${label}校验失败`
  try {
    // 只读表格不加载校验引擎；兼容浏览器打包器和 Node 的 CJS 默认导出形态。
    const module = await import('async-validator')
    const imported = module.default as
      typeof module.default | { default: typeof module.default }
    const Schema = 'default' in imported ? imported.default : imported
    const validator = new Schema({ [field]: rule as RuleItem })
    await validator.validate(
      { ...source, [field]: value },
      {
        first: true,
        suppressWarning: true,
        suppressValidatorError: true,
      }
    )
    return null
  } catch (error) {
    const errors = (error as { errors?: ValidateError[] } | null)?.errors
    return (
      errors?.[0]?.message ??
      (error instanceof Error ? error.message : fallback)
    )
  }
}
