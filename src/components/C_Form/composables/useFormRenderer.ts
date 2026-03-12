/*
 * @Description: C_Form 渲染引擎 Composable — 统一组件注册表 + formItems 生成
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
 */

import {
  computed,
  h,
  type VNode,
  type ComputedRef,
  type Component,
  type Ref,
} from 'vue'

import type { FormOption, FormModel, OptionItem } from '../types'
import type { ResolvedFormConfig } from './useFormConfig'

/* =================== 组件映射类型 =================== */

export type ComponentMap = Record<string, Component>

/* =================== 渲染器类型 =================== */

export type FormRenderer = (
  baseProps: Record<string, any>,
  item: FormOption,
  config: ResolvedFormConfig,
  ctx?: { slots?: Record<string, any>; components?: ComponentMap }
) => VNode | null

/* =================== 渲染器参数 =================== */

export interface UseFormRendererOptions {
  formModel: FormModel
  visibleOptions: ComputedRef<FormOption[]>
  config: ComputedRef<ResolvedFormConfig>
  handleFieldChange: (field: string) => void
  componentMap: ComponentMap
  instanceSlots?: Record<string, any>
  asyncOptionsCache: Ref<Record<string, OptionItem[]>>
  asyncLoadingMap: Ref<Record<string, boolean>>
}

/* =================== 帮助工具 =================== */

/** 解析字段级 disabled/readonly（字段级 > 全局级） */
function resolveFieldFlag(
  flag: boolean | ((model: Record<string, any>) => boolean) | undefined,
  globalFlag: boolean,
  formModel: FormModel
): boolean {
  if (flag === undefined) return globalFlag
  return typeof flag === 'function' ? flag(formModel) : flag
}

/* =================== 渲染器工厂 =================== */

/** 根据组件映射表構建内置渲染器集合 */
function buildRenderers(C: ComponentMap): Record<string, FormRenderer> {
  return {
    input: props => h(C.NInput, { ...props }),
    textarea: props => h(C.NInput, { ...props, type: 'textarea' }),
    inputNumber: props => h(C.NInputNumber, { ...props }),
    switch: props => h(C.NSwitch, { ...props }),
    slider: props => h(C.NSlider, { ...props }),
    rate: props => h(C.NRate, { ...props }),
    datePicker: props => h(C.NDatePicker, { ...props }),
    daterange: props => h(C.NDatePicker, { ...props, type: 'daterange' }),
    timePicker: props => h(C.NTimePicker, { ...props }),
    cascader: props => h(C.NCascader, { ...props }),
    colorPicker: props => h(C.NColorPicker, { ...props }),

    select: (baseProps, item) =>
      h(C.NSelect, {
        ...baseProps,
        options:
          item.children?.map((child: OptionItem) => ({
            value: child.value,
            label: child.label,
            disabled: child.disabled,
          })) || [],
      }),

    checkbox: (baseProps, item) =>
      h(
        C.NCheckboxGroup,
        { ...baseProps },
        {
          default: () =>
            h(
              C.NSpace,
              {},
              {
                default: () =>
                  item.children?.map((child: OptionItem) =>
                    h(C.NCheckbox, {
                      value: child.value,
                      label: child.label,
                      disabled: child.disabled,
                      key: String(child.value),
                    })
                  ) || [],
              }
            ),
        }
      ),

    radio: (baseProps, item) =>
      h(
        C.NRadioGroup,
        { ...baseProps },
        {
          default: () =>
            h(
              C.NSpace,
              {},
              {
                default: () =>
                  item.children?.map((child: OptionItem) =>
                    h(
                      C.NRadio,
                      {
                        value: child.value,
                        disabled: child.disabled,
                        key: String(child.value),
                      },
                      { default: () => child.label }
                    )
                  ) || [],
              }
            ),
        }
      ),

    upload: (baseProps, item, _config, ctx) =>
      h(
        C.NUpload,
        {
          fileList: baseProps.value || [],
          'onUpdate:fileList': (fileList: unknown[]) => {
            baseProps['onUpdate:value']?.(fileList)
          },
          ...item.attrs,
        },
        {
          trigger: () =>
            ctx?.slots?.['uploadClick']?.() ||
            h(C.NButton, { type: 'primary' }, { default: () => '选择文件' }),
          tip: () => ctx?.slots?.['uploadTip']?.() || null,
        }
      ),

    editor: (baseProps, item, config) =>
      h(C.C_Editor, {
        editorId: `editor-${item.prop}`,
        modelValue: baseProps.value || '',
        placeholder: item.placeholder,
        disabled: config.disabled,
        readonly: config.readonly,
        'onUpdate:modelValue': (value: string) => {
          baseProps['onUpdate:value']?.(value)
        },
        ...item.attrs,
      }),
  }
}

/** 自定义渲染器扩展存储 */
const customRenderers: Record<string, FormRenderer> = {}

/**
 * 运行时注册自定义渲染器 — 开闭原则
 */
export function registerRenderer(type: string, renderer: FormRenderer) {
  customRenderers[type] = renderer
}

/* =================== 带选项类型集合 =================== */

const OPTION_TYPES = new Set(['select', 'checkbox', 'radio', 'cascader'])

/* =================== Composable =================== */

/**
 * 渲染引擎 Composable — 生成 formItems VNode 数组
 *
 * v0.8.0 增强：
 * - 字段级 disabled / readonly
 * - help / tooltip label 渲染
 * - asyncOptions 远程选项合并
 * - loading 占位
 */
export function useFormRenderer(opts: UseFormRendererOptions) {
  const {
    formModel,
    visibleOptions,
    config,
    handleFieldChange,
    componentMap,
    instanceSlots,
    asyncOptionsCache,
    asyncLoadingMap,
  } = opts

  const C = componentMap
  const renderers = { ...buildRenderers(C), ...customRenderers }

  /* ===== 基础 Props 生成 ===== */

  const getBaseProps = (item: FormOption): Record<string, unknown> => {
    const baseProps: Record<string, unknown> = {
      value: formModel[item.prop],
      'onUpdate:value': (value: unknown) => {
        formModel[item.prop] = value
        handleFieldChange(item.prop)
      },
      disabled: resolveFieldFlag(
        item.disabled,
        config.value.disabled,
        formModel
      ),
      readonly: resolveFieldFlag(
        item.readonly,
        config.value.readonly,
        formModel
      ),
    }

    if (item.type === 'textarea') {
      baseProps.type = 'textarea'
    }

    if (item.placeholder) {
      baseProps.placeholder = item.placeholder
    }

    return baseProps
  }

  /* ===== 选项合并（静态 children + asyncOptions 缓存） ===== */

  /** 合并静态 children 与 asyncOptions 缓存 */
  function resolveChildren(item: FormOption): OptionItem[] {
    const staticChildren = item.children ?? []
    const asyncChildren = asyncOptionsCache.value[item.prop] ?? []
    return asyncChildren.length > 0 ? asyncChildren : staticChildren
  }

  /* ===== 表单项控件渲染 ===== */

  const renderFormItem = (item: FormOption): VNode | null => {
    try {
      /* 对带选项的控件，合并异步/静态选项 */
      const isOptionType = OPTION_TYPES.has(item.type)
      const isLoading = asyncLoadingMap.value[item.prop]

      const effectiveItem = isOptionType
        ? { ...item, children: resolveChildren(item) }
        : item

      const renderer = renderers[effectiveItem.type]
      if (!renderer) {
        console.warn(`[C_Form] 未支持的组件类型: ${effectiveItem.type}`)
        return null
      }

      const baseProps = getBaseProps(effectiveItem)

      /* 异步加载中：select 显示 loading */
      if (isLoading && effectiveItem.type === 'select') {
        baseProps.loading = true
      }

      return renderer(
        { ...baseProps, ...effectiveItem.attrs },
        effectiveItem,
        config.value,
        { slots: instanceSlots, components: C }
      )
    } catch (error) {
      console.error(`[C_Form] 渲染表单项失败:`, error, item)
      return null
    }
  }

  /* ===== Label 渲染（支持 help tooltip） ===== */

  /** 渲染带 help tooltip 的 label，若无 help 则返回纯文本 */
  function renderLabel(item: FormOption): VNode | string | undefined {
    if (!item.label) return undefined

    if (!item.help) return item.label

    return h(
      'span',
      { style: 'display:inline-flex;align-items:center;gap:4px' },
      [
        item.label,
        h(
          C.NTooltip,
          { trigger: 'hover' },
          {
            trigger: () =>
              h('span', {
                style: 'cursor:help;opacity:0.5;font-size:14px',
                innerHTML: '&#9432;', // ℹ
              }),
            default: () => item.help,
          }
        ),
      ]
    )
  }

  /* ===== formItems VNode[] ===== */

  const formItems = computed(() =>
    visibleOptions.value.map(item => {
      const hasRules = !!(
        item.rules?.length ||
        item.rulesWhen ||
        item.crossFieldValidator
      )
      const label = renderLabel(item)

      return h(
        C.NFormItem,
        {
          label: typeof label === 'string' ? label : undefined,
          path: item.prop,
          key: item.prop,
          required: hasRules,
        },
        {
          ...(typeof label !== 'string' && label ? { label: () => label } : {}),
          default: () => renderFormItem(item),
        }
      )
    })
  )

  return { renderFormItem, formItems, getBaseProps }
}
