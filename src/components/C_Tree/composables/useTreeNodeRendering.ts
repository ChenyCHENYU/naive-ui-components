import { h, nextTick, toRaw, type Ref } from 'vue'
import { NButton, NPopconfirm, NTag } from 'naive-ui'
import C_Icon from '../../C_Icon/index.vue'
import type {
  ActionConfig,
  IconConfig,
  TreeNativeProps,
  TreeNodeIcon,
  TreeNodeRenderContext,
  TreeProps,
  TreeRenderContext,
  TreeSlots,
} from '../types'

interface RenderingOptions<T extends object> {
  props: TreeProps<T>
  native: Ref<TreeNativeProps<T>>
  config: Ref<{ iconConfig: IconConfig<T>; actions: ActionConfig<T>[] }>
  labelField: Ref<string>
  actionRevision: Ref<number>
  slots: TreeSlots<T>
  context: (info: TreeRenderContext<T>) => TreeNodeRenderContext<T>
  currentNode: (node: T) => T | undefined
  onAction: (action: string, node: T) => void
  loadingLabel: () => string
}

/** 节点展示不接管选择、展开或业务请求；所有状态由现有树协议提供。 */
export function useTreeNodeRendering<T extends object>(
  options: RenderingOptions<T>
) {
  const { props, native, config, slots } = options
  const defaultIcon = (node: T): TreeNodeIcon => {
    const { iconConfig } = config.value
    const nodeType: unknown = Reflect.get(node, props.typeField ?? 'type')
    const type = typeof nodeType === 'string' ? nodeType : ''
    const icon: unknown = Reflect.get(node, props.iconField ?? 'icon')
    return {
      name:
        typeof icon === 'string'
          ? icon
          : (iconConfig.typeMap?.[type] ??
            iconConfig.default ??
            'mdi:circle-outline'),
      size: 16,
      color: iconConfig.colorMap?.[type] ?? 'currentColor',
    }
  }
  const resolveIcon = (context: TreeNodeRenderContext<T>) => {
    const resolved = config.value.iconConfig.resolve?.(context)
    if (resolved === null) return null
    const fallback = defaultIcon(context.option)
    const descriptor =
      typeof resolved === 'string' ? { name: resolved } : resolved
    return {
      name: descriptor?.name ?? fallback.name,
      size: descriptor?.size ?? fallback.size,
      color: descriptor?.color ?? fallback.color,
    }
  }
  const renderPrefix = (info: TreeRenderContext<T>) => {
    const context = options.context(info)
    if (slots.prefix) return slots.prefix(context)
    if (native.value.renderPrefix) return native.value.renderPrefix(context)
    const prefix: unknown = Reflect.get(info.option, 'prefix')
    if (typeof prefix === 'function') return prefix()
    const icon = resolveIcon(context)
    if (!icon) return null
    return h(C_Icon, {
      ...icon,
      class: 'c-tree-node-icon',
    })
  }
  const renderLabel = (info: TreeRenderContext<T>) => {
    const context = options.context(info)
    if (slots.label) return slots.label(context)
    if (native.value.renderLabel) return native.value.renderLabel(context)
    const text = String(
      Reflect.get(info.option, options.labelField.value) ?? ''
    )
    return h('span', { class: 'c-tree-node-label' }, [
      h('span', { class: 'c-tree-node-title', title: text }, text),
      ...(props.statusConfigs ?? []).flatMap(statusConfig => {
        const value: unknown = Reflect.get(info.option, statusConfig.field)
        const status =
          typeof value === 'number' || typeof value === 'string'
            ? statusConfig.values[value]
            : undefined
        return status?.text
          ? [
              h(
                NTag,
                {
                  type: status.type,
                  size: 'small',
                  class: 'c-tree-node-status',
                },
                { default: () => status.text }
              ),
            ]
          : []
      }),
    ])
  }
  const stateValue = (value: ActionConfig<T>['disabled'], node: T) =>
    typeof value === 'function' ? value(node) : Boolean(value)
  const actionState = (action: ActionConfig<T>, node: T) => {
    const loading = stateValue(action.loading, node)
    const disabled = Boolean(
      native.value.disabled ||
      Reflect.get(node, native.value.disabledField ?? 'disabled') ||
      stateValue(action.disabled, node) ||
      loading
    )
    return { loading, disabled }
  }
  const dispatched = new WeakMap<T, Set<string>>()
  const invokeAction = (key: string, node: T, revision: number) => {
    if (options.actionRevision.value !== revision) return false
    const current = options.currentNode(node)
    if (!current || toRaw(current) !== toRaw(node)) return false
    const action = config.value.actions.find(item => item.key === key)
    if (!action || actionState(action, current).disabled) return false
    if (action.show && !action.show(current)) return false
    const rawNode = toRaw(current)
    const keys = dispatched.get(rawNode) ?? new Set<string>()
    if (keys.has(key)) return false
    keys.add(key)
    dispatched.set(rawNode, keys)
    // 同一次渲染提交前只发出一次；异步操作的完整周期仍由 loading 控制。
    void nextTick(() => keys.delete(key))
    options.onAction(key, current)
    return true
  }
  const renderAction = (action: ActionConfig<T>, node: T) => {
    const revision = options.actionRevision.value
    // 原生本地过滤会复制祖先节点；渲染时绑定当前业务身份，确认时再验证未被替换。
    const target = options.currentNode(node) ?? node
    const state = actionState(action, target)
    const button = () =>
      h(
        NButton,
        {
          size: 'tiny',
          type: action.type ?? 'default',
          quaternary: true,
          ...state,
          'aria-label': action.text || action.key,
          title: action.text,
          onClick: (event: Event) => {
            event.stopPropagation()
            if (!action.confirm) invokeAction(action.key, target, revision)
          },
        },
        { icon: () => h(C_Icon, { name: action.icon, size: 14 }) }
      )
    return action.confirm
      ? h(
          NPopconfirm,
          {
            disabled: state.disabled,
            // 弹层打开后权限和 busy 仍可能改变，确认时读取最新节点与操作配置。
            onPositiveClick: () => {
              invokeAction(action.key, target, revision)
            },
          },
          { trigger: button, default: () => action.confirm }
        )
      : button()
  }
  const renderNodeSuffix = (context: TreeNodeRenderContext<T>) => {
    if (slots.suffix) return slots.suffix(context)
    if (native.value.renderSuffix) return native.value.renderSuffix(context)
    const suffix: unknown = Reflect.get(context.option, 'suffix')
    if (typeof suffix === 'function') return suffix()
    const actions = config.value.actions.filter(
      action => !action.show || action.show(context.option)
    )
    return actions.length
      ? h(
          'span',
          {
            class: 'tree-actions',
            onClick: (event: Event) => event.stopPropagation(),
          },
          actions.map(action => renderAction(action, context.option))
        )
      : null
  }
  const renderSuffix = (info: TreeRenderContext<T>) => {
    const context = options.context(info)
    const content = renderNodeSuffix(context)
    if (!context.loading) return content
    return h('span', { class: 'c-tree-suffix' }, [
      h('span', {
        class: 'c-tree-node-loading',
        role: 'status',
        'aria-label': options.loadingLabel(),
      }),
      content,
    ])
  }
  return { renderPrefix, renderLabel, renderSuffix }
}
