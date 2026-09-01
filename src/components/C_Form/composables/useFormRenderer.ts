/*
 * @Description: C_Form 渲染引擎 Composable — 统一组件注册表 + formItems 生成
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
 */

import {
  computed,
  h,
  mergeProps,
  type VNode,
  type ComputedRef,
  type Component,
  type Ref,
  type Slots,
} from 'vue'
import type { FormItemInst } from 'naive-ui'

import type { FormOption, FormModel, OptionItem } from '../types'
import type { ResolvedFormConfig } from './useFormConfig'
import { getDataPath, setDataPath } from '../../../utils/data'

/* =================== 组件映射类型 =================== */

export type ComponentMap = Record<string, Component>

export type RendererProps = Record<string, unknown> & {
  'onUpdate:value'?: (value: unknown) => void
}

export interface FormRendererContext {
  slots?: Readonly<Slots>
  components: ComponentMap
}

/* =================== 渲染器类型 =================== */

export type FormRenderer = (
  baseProps: RendererProps,
  item: FormOption,
  config: ResolvedFormConfig,
  context: FormRendererContext
) => VNode | null

/* =================== 渲染器参数 =================== */

export interface UseFormRendererOptions {
  formModel: FormModel
  visibleOptions: ComputedRef<FormOption[]>
  config: ComputedRef<ResolvedFormConfig>
  handleFieldChange: (field: string) => void
  componentMap: ComponentMap
  instanceSlots?: Readonly<Slots>
  asyncOptionsCache: Ref<Record<string, OptionItem[]>>
  asyncLoadingMap: Ref<Record<string, boolean>>
  renderers?: ComputedRef<Record<string, FormRenderer> | undefined>
  setFormItemRef?: (field: string, instance: FormItemInst | null) => void
  onError?: (error: unknown, field: string) => void
}

/* =================== 帮助工具 =================== */

/** 解析字段级 disabled/readonly（字段级 > 全局级） */
function resolveFieldFlag(
  flag: boolean | ((model: FormModel) => boolean) | undefined,
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
          item.children?.map((child: OptionItem) => ({ ...child })) || [],
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

    upload: (baseProps, _item, _config, context) => {
      const uploadProps = { ...baseProps }
      const { value } = uploadProps
      const updateValue = uploadProps['onUpdate:value']
      delete uploadProps.value
      delete uploadProps['onUpdate:value']
      return h(
        C.NUpload,
        {
          ...uploadProps,
          fileList: Array.isArray(value) ? value : [],
          'onUpdate:fileList': (fileList: unknown[]) => updateValue?.(fileList),
        },
        {
          trigger: () =>
            context.slots?.uploadClick?.() ||
            h(C.NButton, { type: 'primary' }, { default: () => '选择文件' }),
          tip: () => context.slots?.uploadTip?.() || null,
        }
      )
    },

    editor: (baseProps, item) => {
      const editorProps = { ...baseProps }
      const { value } = editorProps
      const updateValue = editorProps['onUpdate:value']
      delete editorProps.value
      delete editorProps['onUpdate:value']
      return h(C.C_Editor, {
        ...editorProps,
        editorId: `editor-${item.prop}`,
        modelValue: typeof value === 'string' ? value : '',
        'onUpdate:modelValue': (nextValue: string) => updateValue?.(nextValue),
      })
    },
  }
}

/** 自定义渲染器扩展存储 */
const customRenderers: Record<string, FormRenderer> = {}

/**
 * 运行时注册自定义渲染器 — 开闭原则
 */
export function registerRenderer(
  type: string,
  renderer: FormRenderer
): () => boolean {
  if (!type.trim()) throw new TypeError('[C_Form] renderer type 不能为空')
  if (typeof renderer !== 'function') {
    throw new TypeError(`[C_Form] renderer ${type} 必须是函数`)
  }
  customRenderers[type] = renderer
  return () => unregisterRenderer(type, renderer)
}

/** Remove a global renderer. Passing the renderer prevents deleting a newer registration. */
export function unregisterRenderer(
  type: string,
  renderer?: FormRenderer
): boolean {
  if (!customRenderers[type]) return false
  if (renderer && customRenderers[type] !== renderer) return false
  return delete customRenderers[type]
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
    renderers: instanceRenderers,
    setFormItemRef,
    onError,
  } = opts

  const C = componentMap
  const builtInRenderers = buildRenderers(C)

  const getRenderer = (type: string): FormRenderer | undefined =>
    instanceRenderers?.value?.[type] ??
    customRenderers[type] ??
    builtInRenderers[type]

  /* ===== 基础 Props 生成 ===== */

  const getBaseProps = (item: FormOption): RendererProps => {
    const baseProps: RendererProps = {
      value: getDataPath(formModel, item.prop),
      'onUpdate:value': (value: unknown) => {
        setDataPath(formModel, item.prop, value)
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
    if (
      Object.prototype.hasOwnProperty.call(asyncOptionsCache.value, item.prop)
    ) {
      return asyncOptionsCache.value[item.prop] ?? []
    }
    return staticChildren
  }

  function resolveEffectiveItem(item: FormOption): FormOption {
    if (!OPTION_TYPES.has(item.type)) return item
    return { ...item, children: resolveChildren(item) }
  }

  function applyLoadingState(
    item: FormOption,
    props: RendererProps
  ): RendererProps {
    if (item.type === 'select' && asyncLoadingMap.value[item.prop]) {
      props.loading = true
    }
    return props
  }

  /* ===== 表单项控件渲染 ===== */

  const renderFormItem = (item: FormOption): VNode | null => {
    try {
      /* 对带选项的控件，合并异步/静态选项 */
      const effectiveItem = resolveEffectiveItem(item)
      const renderer = getRenderer(effectiveItem.type)
      if (!renderer) {
        onError?.(
          new TypeError(`[C_Form] 未支持的组件类型: ${effectiveItem.type}`),
          effectiveItem.prop
        )
        return null
      }

      const baseProps = applyLoadingState(
        effectiveItem,
        mergeProps(
          effectiveItem.attrs ?? {},
          getBaseProps(effectiveItem)
        ) as RendererProps
      )

      return renderer(baseProps, effectiveItem, config.value, {
        slots: instanceSlots,
        components: C,
      })
    } catch (error) {
      onError?.(error, item.prop)
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
                textContent: 'ⓘ',
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
      const isRequired = Boolean(
        item.required || item.rules?.some(rule => rule.required)
      )
      const label = renderLabel(item)

      return h(
        C.NFormItem,
        {
          label: typeof label === 'string' ? label : undefined,
          path: item.prop,
          key: item.prop,
          required: isRequired,
          ref: (instance: FormItemInst | null) =>
            setFormItemRef?.(item.prop, instance),
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
