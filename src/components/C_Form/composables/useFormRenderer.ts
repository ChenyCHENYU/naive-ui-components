/*
 * @Description: C_Form 渲染引擎 Composable — 统一组件注册表 + formItems 生成
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
 */

import {
  computed,
  getCurrentInstance,
  h,
  inject,
  mergeProps,
  shallowReactive,
  type VNode,
  type ComputedRef,
  type Component,
  type Ref,
  type Slots,
  type InjectionKey,
} from 'vue'
import type { FormItemInst } from 'naive-ui'

import type { FormOption, FormModel, OptionItem } from '../types'
import type { ResolvedFormConfig } from './useFormConfig'
import { getDataPath, setDataPath } from '../../../utils/data'
import { resolveNumberInputProps } from '../numberInput'
import {
  decodeDictionaryControlValue,
  encodeDictionaryControlValue,
  toDictionaryControlOptions,
  type DictionaryOption,
} from '../../../core/dictionary'

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

/** A renderer collection owned by one application or explicitly shared scope. */
export interface FormRendererRegistry {
  get(type: string): FormRenderer | undefined
  register(type: string, renderer: FormRenderer): () => boolean
  unregister(type: string, renderer?: FormRenderer): boolean
}

export const FORM_RENDERER_REGISTRY_KEY: InjectionKey<FormRendererRegistry> =
  Symbol('c-form-renderer-registry')

/** Create an isolated, reactive registry without copying legacy registrations. */
export function createFormRendererRegistry(
  initial: Readonly<Record<string, FormRenderer>> = {}
): FormRendererRegistry {
  const entries = shallowReactive(new Map<string, { renderer: FormRenderer }>())
  const registry: FormRendererRegistry = {
    get: type => entries.get(type)?.renderer,
    register: (type, renderer) => {
      if (!type.trim()) throw new TypeError('[C_Form] renderer type 不能为空')
      if (typeof renderer !== 'function') {
        throw new TypeError(`[C_Form] renderer ${type} 必须是函数`)
      }
      const entry = { renderer }
      entries.set(type, entry)
      // A disposer owns this registration, even if the same function is registered again.
      return () => entries.get(type) === entry && entries.delete(type)
    },
    unregister: (type, renderer) => {
      const entry = entries.get(type)
      if (!entry || (renderer && entry.renderer !== renderer)) return false
      return entries.delete(type)
    },
  }
  Object.entries(initial).forEach(([type, renderer]) => {
    registry.register(type, renderer)
  })
  return registry
}

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
  getDictionaryOptions?: (field: string) => readonly DictionaryOption[]
  isDictionaryLoading?: (field: string) => boolean
  renderers?: ComputedRef<Record<string, FormRenderer> | undefined>
  /** Overrides application injection. An isolated registry never reads legacy globals. */
  registry?: FormRendererRegistry
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
    inputNumber: (props, item, config) =>
      h(C.NInputNumber, resolveNumberInputProps(props, item, config.density)),
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

    upload: (baseProps, item, config, context) => {
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
          default: () =>
            context.slots?.uploadClick?.() ||
            h(
              C.NButton,
              {
                type: 'primary',
                size: item.attrs?.size ?? config.size,
                disabled: uploadProps.disabled === true,
              },
              { default: () => '选择文件' }
            ),
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

/** Compatibility scope for consumers that have not installed/provided an app registry. */
const legacyRendererRegistry = createFormRendererRegistry()

/**
 * Register a legacy process-wide renderer, used only without an isolated registry.
 * @deprecated Prefer createFormRendererRegistry and application injection.
 */
export function registerRenderer(
  type: string,
  renderer: FormRenderer
): () => boolean {
  return legacyRendererRegistry.register(type, renderer)
}

/**
 * Remove a legacy process-wide renderer, optionally checking its function identity.
 * @deprecated Prefer an application-owned FormRendererRegistry.
 */
export function unregisterRenderer(
  type: string,
  renderer?: FormRenderer
): boolean {
  return legacyRendererRegistry.unregister(type, renderer)
}

/* =================== 带选项类型集合 =================== */

const OPTION_TYPES = new Set(['select', 'checkbox', 'radio', 'cascader'])
/** Rate 的 size 是数字、Upload 无 size；只向接受标准尺寸的控件补默认值。 */
const SIZED_FIELD_TYPES = new Set([
  'input',
  'textarea',
  'inputNumber',
  'select',
  'checkbox',
  'radio',
  'switch',
  'datePicker',
  'daterange',
  'timePicker',
  'cascader',
  'colorPicker',
])
const NATIVE_READONLY_TYPES = new Set([
  'input',
  'textarea',
  'inputNumber',
  'rate',
  'editor',
])

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
  const injectedRegistry = getCurrentInstance()
    ? inject(FORM_RENDERER_REGISTRY_KEY, undefined)
    : undefined
  const registry = opts.registry ?? injectedRegistry ?? legacyRendererRegistry

  const getRenderer = (type: string): FormRenderer | undefined =>
    instanceRenderers?.value?.[type] ??
    registry.get(type) ??
    builtInRenderers[type]

  /* ===== 基础 Props 生成 ===== */

  const getBaseProps = (item: FormOption): RendererProps => {
    const disabled = resolveFieldFlag(
      item.disabled,
      config.value.disabled,
      formModel
    )
    const readonly = resolveFieldFlag(
      item.readonly,
      config.value.readonly,
      formModel
    )
    const supportsReadonly = NATIVE_READONLY_TYPES.has(item.type)
    const baseProps: RendererProps = {
      ...(SIZED_FIELD_TYPES.has(item.type)
        ? { size: item.attrs?.size ?? config.value.size }
        : {}),
      value: getDataPath(formModel, item.prop),
      'onUpdate:value': (value: unknown) => {
        if (
          resolveFieldFlag(item.disabled, config.value.disabled, formModel) ||
          resolveFieldFlag(item.readonly, config.value.readonly, formModel)
        )
          return
        setDataPath(formModel, item.prop, value)
        handleFieldChange(item.prop)
      },
      disabled: disabled || (readonly && !supportsReadonly),
      readonly: readonly || (item.type === 'rate' && disabled),
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
    if (item.children !== undefined || item.asyncOptions) return staticChildren
    return (
      opts.getDictionaryOptions?.(item.prop).map(option => ({ ...option })) ??
      []
    )
  }

  function resolveEffectiveItem(item: FormOption): FormOption {
    if (!OPTION_TYPES.has(item.type)) return item
    return { ...item, children: resolveChildren(item) }
  }

  function applyLoadingState(
    item: FormOption,
    props: RendererProps
  ): RendererProps {
    if (
      item.type === 'select' &&
      (asyncLoadingMap.value[item.prop] ||
        opts.isDictionaryLoading?.(item.prop))
    ) {
      props.loading = true
    }
    return props
  }

  /* ===== 表单项控件渲染 ===== */

  function usesDictionaryControl(
    item: FormOption,
    renderer: FormRenderer
  ): boolean {
    return (
      item.dictionary !== undefined &&
      item.children === undefined &&
      !item.asyncOptions &&
      OPTION_TYPES.has(item.type) &&
      renderer === builtInRenderers[item.type]
    )
  }

  function applyDictionaryControl(
    baseProps: RendererProps,
    item: FormOption
  ): void {
    const update = baseProps['onUpdate:value']
    baseProps.value = encodeDictionaryControlValue(baseProps.value)
    baseProps['onUpdate:value'] = value => {
      const decoded = decodeDictionaryControlValue(value)
      if (Array.isArray(update)) update.forEach(handler => handler(decoded))
      else update?.(decoded)
    }
    item.children = toDictionaryControlOptions(item.children ?? [])
    baseProps.options = item.children
    baseProps.fallbackOption = (value: unknown) => ({
      value,
      label: String(decodeDictionaryControlValue(value) ?? ''),
    })
  }

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

      // 字典的布尔编码必须在原生控件边界转换，模型与提交值保持原始类型。
      if (usesDictionaryControl(item, renderer))
        applyDictionaryControl(baseProps, effectiveItem)

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
          class: 'c-form-field',
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
