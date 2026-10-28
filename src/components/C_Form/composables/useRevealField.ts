/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-28
 * @Description: 表单字段的局部布局展开与可取消焦点定位，不改变校验和访问规则
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */
import {
  nextTick,
  onMounted,
  onActivated,
  onDeactivated,
  onScopeDispose,
  watch,
  type Ref,
} from 'vue'
import type { FormModel, FormOption } from '../types'

export interface FormRevealLayout {
  revealField?: (
    field: string,
    isCurrent: () => boolean
  ) => boolean | Promise<boolean>
}

interface RevealOptions {
  layout: Ref<FormRevealLayout | null>
  layoutType: () => string
  fields: () => readonly FormOption[]
  model: FormModel
  getElement: (field: string) => HTMLElement | null
  access: (option: FormOption) => Record<string, unknown>
  onError?: (error: unknown, field: string) => void
}

/** 原生控件与 aria 的访问约束也适用于自定义焦点适配。 */
function unavailableControl(target: HTMLElement, explicit: boolean): boolean {
  return (
    target.matches(':disabled') ||
    ('disabled' in target && target.disabled === true) ||
    ('readOnly' in target && target.readOnly === true) ||
    (!explicit && target.getAttribute('tabindex') === '-1')
  )
}

function hiddenAncestor(element: HTMLElement): boolean {
  if (
    element.hidden ||
    element.getAttribute('aria-hidden') === 'true' ||
    element.hasAttribute('inert') ||
    element.getAttribute('aria-disabled') === 'true' ||
    element.getAttribute('aria-readonly') === 'true'
  )
    return true
  const style = element.ownerDocument.defaultView?.getComputedStyle(element)
  if (!style) return false
  return (
    style.display === 'none' ||
    style.visibility === 'hidden' ||
    style.visibility === 'collapse'
  )
}

/** 真实可用性采用所属文档和局部祖先链，不依赖测试环境的布局像素。 */
function available(target: HTMLElement, explicit = false): boolean {
  if (!target.isConnected || typeof target.focus !== 'function') return false
  if (unavailableControl(target, explicit)) return false
  for (
    let element: HTMLElement | null = target;
    element;
    element = element.parentElement
  ) {
    if (hiddenAncestor(element)) return false
  }
  return true
}

function focusAvailable(
  target: HTMLElement | null | undefined,
  element: HTMLElement | null,
  explicit: boolean
): boolean {
  if (!target || !available(target, explicit)) return false
  const scrollTarget = element ?? target
  scrollTarget.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
  target.focus({ preventScroll: true })
  const focused = target.ownerDocument.activeElement
  return !!focused && (focused === target || target.contains(focused))
}

async function resolveTarget(
  option: FormOption,
  element: HTMLElement | null,
  model: FormModel,
  signal: AbortSignal
): Promise<HTMLElement | null | undefined> {
  if (option.focusTarget)
    return option.focusTarget({ field: option.prop, element, model, signal })
  return [
    ...(element?.querySelectorAll<HTMLElement>(
      'input:not([type="hidden"]),textarea,select,button,[tabindex],[contenteditable="true"]'
    ) ?? []),
  ].find(node => available(node))
}

/** 布局切换串行、焦点适配独立等待；旧适配即使忽略 signal 也不会抢回焦点。 */
export function useRevealField(options: RevealOptions) {
  let version = 0
  let active = false
  let disposed = false
  let controller: AbortController | undefined
  let navigation: Promise<unknown> = Promise.resolve()
  const cancel = (): number => {
    const ticket = ++version
    const previous = controller
    controller = undefined
    // abort 监听器可同步发起新定位；旧请求不能清除它的控制器或复用版本。
    previous?.abort()
    return ticket
  }
  const fieldOption = (field: string): FormOption | undefined => {
    const option = options.fields().find(item => item.prop === field)
    if (!option || option.layout?.hidden) return undefined
    const access = options.access(option)
    return access.disabled || access.readonly ? undefined : option
  }
  const isActive = (ticket: number): boolean =>
    active && !disposed && ticket === version
  const reportError = (error: unknown, field: string): void => {
    try {
      options.onError?.(error, field)
    } catch {
      /* 观察回调不改变定位结果。 */
    }
  }
  onMounted(() => {
    active = true
  })
  onActivated(() => {
    active = true
  })
  onDeactivated(() => {
    active = false
    cancel()
  })
  onScopeDispose(() => {
    disposed = true
    active = false
    cancel()
  })
  watch(options.layoutType, cancel)

  return async (field: string): Promise<boolean> => {
    const ticket = cancel()
    if (!isActive(ticket)) return false
    const request = new AbortController()
    controller = request
    const current = (): boolean => isActive(ticket) && !request.signal.aborted
    const prepare = async (): Promise<boolean> => {
      await nextTick()
      if (!current() || !fieldOption(field)) return false
      const reveal = options.layout.value?.revealField
      if (reveal && !(await reveal(field, current))) return false
      await nextTick()
      return current() && !!fieldOption(field)
    }
    const ready = navigation.then(prepare)
    navigation = ready.catch(() => false)
    try {
      if (!(await ready)) return false
      const option = fieldOption(field)
      if (!option) return false
      const element = options.getElement(field)
      const target = await resolveTarget(
        option,
        element,
        options.model,
        request.signal
      )
      if (!current() || fieldOption(field) !== option) return false
      const focused = focusAvailable(target, element, !!option.focusTarget)
      return current() && focused
    } catch (error) {
      if (current()) reportError(error, field)
      return false
    }
  }
}
