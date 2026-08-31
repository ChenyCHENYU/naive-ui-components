/**
 * @description 动态表单状态管理组合式函数
 * @module useDynamicFormState
 * @Migration: naive-ui-components 组件库迁移版本
 * @returns 包含动态表单状态和操作方法的对象
 */

import { reactive, computed, readonly } from 'vue'
import type {
  FormOption,
  ComponentType,
  DynamicFieldConfig,
  DynamicFormConfig,
  DynamicFormController,
  DynamicFormState,
} from '../types'

/**
 * @description 默认表单配置
 */
const DEFAULT_CONFIG: DynamicFormConfig = {
  maxFields: 20,
  autoSave: false,
  enableSort: true,
  showControls: true,
  showItemControls: true,
}

/**
 * @description 可用的字段类型选项
 */
export const FIELD_TYPE_OPTIONS = [
  { label: '文本输入', value: 'input' as ComponentType },
  { label: '数字输入', value: 'inputNumber' as ComponentType },
  { label: '多行文本', value: 'textarea' as ComponentType },
  { label: '下拉选择', value: 'select' as ComponentType },
  { label: '开关切换', value: 'switch' as ComponentType },
  { label: '评分组件', value: 'rate' as ComponentType },
] as const

// eslint-disable-next-line complexity -- Defaults are resolved independently for every public field option.
function createDynamicField(
  counter: number,
  config: Partial<DynamicFieldConfig>
): DynamicFieldConfig {
  const label = config.label || `动态字段 ${counter}`
  return {
    ...config,
    id: config.id?.trim() || `dynamic_field_${counter}`,
    type: config.type || FIELD_TYPE_OPTIONS[0].value,
    prop: config.prop?.trim() || `dynamic_${counter}`,
    label,
    placeholder: config.placeholder || `请输入${label || '内容'}`,
    visible: config.visible ?? true,
    removable: config.removable ?? true,
    created: config.created ?? Date.now(),
    layout: config.layout || { span: 12 },
  }
}

/**
 * @description 创建和管理动态表单状态
 * @returns 包含状态和方法的对象
 */
export const useDynamicFormState = (): DynamicFormController => {
  /**
   * @description 响应式表单状态
   */
  const state = reactive<DynamicFormState>({
    config: { ...DEFAULT_CONFIG },
    baseFields: [],
    dynamicFields: [],
    hiddenFieldIds: new Set<string>(),
    fieldCounter: 0,
    isInitialized: false,
  })

  /**
   * @description 计算所有字段（基础字段+动态字段）
   */
  const allFields = computed<FormOption[]>(() => [
    ...state.baseFields,
    ...state.dynamicFields.map(field => ({
      ...field,
      show: !state.hiddenFieldIds.has(field.prop),
    })),
  ])

  /**
   * @description 计算可见字段
   */
  const visibleFields = computed<FormOption[]>(() =>
    allFields.value.filter(field => field.show !== false)
  )

  /**
   * @description 计算动态字段数量
   */
  const dynamicFieldsCount = computed(() => state.dynamicFields.length)

  /**
   * @description 计算隐藏字段数量
   */
  const hiddenFieldsCount = computed(() => state.hiddenFieldIds.size)

  /**
   * @description 是否可以添加更多字段
   */
  const canAddMoreFields = computed(
    () => state.dynamicFields.length < state.config.maxFields
  )

  /**
   * @description 是否所有字段都可见
   */
  const allVisible = computed(() => state.hiddenFieldIds.size === 0)

  /**
   * @description 添加动态字段
   * @param config - 字段配置
   */
  const addField = (
    config: Partial<DynamicFieldConfig> = {}
  ): DynamicFieldConfig | null => {
    if (!canAddMoreFields.value) {
      return null
    }

    state.fieldCounter++
    const newField = createDynamicField(state.fieldCounter, config)
    if (allFields.value.some(field => field.prop === newField.prop)) return null

    state.dynamicFields.push(newField)
    return newField
  }

  /**
   * @description 移除动态字段
   * @param index - 可选，要移除的字段索引，默认移除最后一个
   */
  const removeField = (index?: number): DynamicFieldConfig | null => {
    if (state.dynamicFields.length === 0) {
      return null
    }

    const targetIndex = index ?? state.dynamicFields.length - 1

    if (targetIndex < 0 || targetIndex >= state.dynamicFields.length) {
      return null
    }

    if (state.dynamicFields[targetIndex]?.removable === false) return null
    const removed = state.dynamicFields.splice(targetIndex, 1)[0]
    if (removed) {
      state.hiddenFieldIds.delete(removed.prop)
    }
    return removed ?? null
  }

  /**
   * @description 清空所有动态字段
   */
  const clearDynamicFields = (): number => {
    const removedCount = state.dynamicFields.length
    state.dynamicFields.forEach(field =>
      state.hiddenFieldIds.delete(field.prop)
    )
    state.dynamicFields.length = 0
    state.fieldCounter = 0
    return removedCount
  }

  /**
   * @description 切换字段可见性
   * @param fieldId - 字段ID
   */
  const toggleFieldVisibility = (fieldId: string): boolean => {
    if (!allFields.value.some(field => field.prop === fieldId)) return false
    if (state.hiddenFieldIds.has(fieldId)) {
      state.hiddenFieldIds.delete(fieldId)
    } else {
      state.hiddenFieldIds.add(fieldId)
    }
    return !state.hiddenFieldIds.has(fieldId)
  }

  /**
   * @description 切换所有字段可见性
   */
  const toggleAllVisibility = (): boolean => {
    if (allVisible.value) {
      state.dynamicFields.forEach(field => {
        state.hiddenFieldIds.add(field.prop)
      })
    } else {
      state.hiddenFieldIds.clear()
    }
    return allVisible.value
  }

  /**
   * @description 更新表单配置
   * @param newConfig - 新的配置对象
   */
  const updateConfig = (newConfig: Partial<DynamicFormConfig>) => {
    const normalized = { ...newConfig }
    if (normalized.maxFields !== undefined) {
      normalized.maxFields = Math.max(0, Math.trunc(normalized.maxFields))
    }
    Object.assign(state.config, normalized)
  }

  /**
   * @description 导出当前表单配置
   * @returns JSON格式的配置字符串
   */
  const exportConfig = () => {
    const config = {
      baseFields: state.baseFields,
      dynamicFields: state.dynamicFields,
      config: state.config,
      hiddenFields: Array.from(state.hiddenFieldIds),
      timestamp: Date.now(),
    }
    return JSON.stringify(config, null, 2)
  }

  /**
   * @description 初始化表单状态
   * @param baseFields - 基础字段配置
   * @param config - 可选，表单配置
   */
  const initialize = (
    baseFields: FormOption[],
    config: Partial<DynamicFormConfig> = {}
  ) => {
    state.baseFields = [...baseFields]
    state.dynamicFields.length = 0
    state.hiddenFieldIds.clear()
    state.fieldCounter = 0
    Object.assign(state.config, DEFAULT_CONFIG)
    updateConfig(config)
    state.isInitialized = true
  }

  return {
    state: readonly(state),
    allFields,
    visibleFields,
    dynamicFieldsCount,
    hiddenFieldsCount,
    canAddMoreFields,
    allVisible,
    FIELD_TYPE_OPTIONS,
    addField,
    removeField,
    clearDynamicFields,
    toggleFieldVisibility,
    toggleAllVisibility,
    updateConfig,
    exportConfig,
    initialize,
  }
}

/**
 * @description 动态表单状态类型
 */
export type DynamicFormStateType = DynamicFormController

/**
 * @description 动态表单状态注入键
 */
export const DYNAMIC_FORM_STATE_KEY = Symbol('dynamicFormState')
