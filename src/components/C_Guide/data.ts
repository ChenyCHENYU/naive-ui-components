/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-04
 * @Description: 引导目标解析与通用 SVG 示意图，不依赖宿主路由或业务 Store
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
 */
import type { GuideIllustration, GuideStep, GuideTarget } from './types'

const FIGURES: Record<GuideIllustration, string> = {
  navigation:
    '<rect x="34" y="12" width="56" height="72" rx="6" fill="currentColor" opacity=".12"/><path d="M46 30h30M46 48h30M46 66h20"/><rect x="108" y="12" width="118" height="72" rx="6" fill="currentColor" opacity=".07"/><path d="M122 32h64M122 48h90M122 64h74"/>',
  search:
    '<rect x="28" y="26" width="204" height="44" rx="10" fill="currentColor" opacity=".09"/><circle cx="56" cy="46" r="8"/><path d="m62 52 6 6M86 44h104M86 55h70"/>',
  tabs: '<rect x="28" y="24" width="204" height="56" rx="6" fill="currentColor" opacity=".07"/><rect x="40" y="16" width="58" height="26" rx="6" fill="currentColor" opacity=".2"/><path d="M50 29h25m10-3 6 6m0-6-6 6M112 29h38M166 29h38M44 56h100M44 67h144"/>',
  account:
    '<circle cx="60" cy="48" r="22" fill="currentColor" opacity=".12"/><circle cx="60" cy="41" r="6"/><path d="M49 60c0-13 22-13 22 0M94 40h40m-8-6 8 6-8 6M94 58h40m-32-6-8 6 8 6"/><rect x="154" y="20" width="62" height="56" rx="6" fill="currentColor" opacity=".09"/><path d="M168 36h34M168 48h34M168 60h22"/>',
}

/** 判断目标矩形是否与当前视口相交。 */
function isInViewport(rect: DOMRect): boolean {
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.right > 0 &&
    rect.bottom > 0 &&
    rect.left < window.innerWidth &&
    rect.top < window.innerHeight
  )
}

/** 返回当前可见的目标，多个匹配项中选择第一个可见元素。 */
export function resolveGuideTarget(
  target: GuideTarget | undefined
): Element | undefined {
  if (!target || typeof document === 'undefined') return undefined
  const elements =
    typeof target === 'string'
      ? Array.from(document.querySelectorAll(target))
      : [typeof target === 'function' ? target() : target]
  return elements.find((element): element is Element => {
    if (!element?.isConnected) return false
    const rect = element.getBoundingClientRect()
    const style = element.ownerDocument.defaultView?.getComputedStyle(element)
    return isInViewport(rect) && style?.visibility !== 'hidden'
  })
}

/** 在原有 HTML 描述前添加可选示意图，保持原有 description 用法兼容。 */
export function renderGuideDescription(step: GuideStep): string {
  const { illustration } = step.popover
  const figure = illustration && FIGURES[illustration]
  if (!figure) return step.popover.description
  return `<div class="c-guide-figure"><svg viewBox="0 0 260 96" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">${figure}</svg></div><div class="c-guide-copy">${step.popover.description}</div>`
}
