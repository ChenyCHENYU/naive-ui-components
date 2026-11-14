import { cloneVNode, h, isVNode, type VNode, type VNodeChild } from 'vue'
import { NTooltip, type TooltipInst } from 'naive-ui'

/**
 * 原生文本按钮自行裁剪时，NEllipsis 只能测到裁剪后的外框。
 * 保留原交互节点，由同主题 Tooltip 在该节点 hover/focus 时检查真实溢出。
 */
export function nativeCellEllipsis(cell: VNodeChild): VNodeChild {
  if (
    !isVNode(cell) ||
    (cell.type !== 'button' && cell.type !== 'a') ||
    typeof cell.children !== 'string' ||
    !cell.children
  )
    return cell
  const text = cell.children
  let element: HTMLElement | undefined
  let tooltip: TooltipInst | null = null
  let hovered = false
  let focused = false
  const capture = (vnode: VNode) => {
    element = vnode.el?.nodeType === 1 ? (vnode.el as HTMLElement) : undefined
  }
  // 初始渲染和非活动行不测量；无 observer、watch 或数据扫描。
  const syncShow = () =>
    tooltip?.setShow(
      Boolean(
        (hovered || focused) &&
        element &&
        element.scrollWidth > element.clientWidth
      )
    )
  const trigger = cloneVNode(
    cell,
    {
      onVnodeMounted: capture,
      onVnodeUpdated: capture,
      onMouseenterCapture: () => {
        hovered = true
        syncShow()
      },
      onMouseleaveCapture: () => {
        hovered = false
        syncShow()
      },
      onFocusCapture: () => {
        focused = true
        syncShow()
      },
      onBlurCapture: () => {
        focused = false
        syncShow()
      },
    },
    true
  )
  return h(
    NTooltip,
    {
      trigger: 'manual',
      ref: instance => {
        tooltip = instance as TooltipInst | null
      },
    },
    { trigger: () => trigger, default: () => text }
  )
}
