import type { PrintConfig } from './usePrintWatermark'

const length = '(?:0|\\d+(?:\\.\\d+)?(?:mm|cm|in|pt|px|pc|em|rem|%))'
const marginPattern = new RegExp(`^${length}(?:\\s+${length}){0,3}$`, 'i')
const paperPattern =
  /^(?:[a-z][\w-]*|\d+(?:\.\d+)?(?:mm|cm|in|pt|px)\s+\d+(?:\.\d+)?(?:mm|cm|in|pt|px))$/i

function escapeText(value: string): string {
  return value.replace(/[&<>"']/g, character => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }
    return entities[character]
  })
}

function paperStyle(config: PrintConfig): string {
  if (config.paperSize === undefined && config.orientation === undefined)
    return ''
  const paper = (config.paperSize ?? 'A4').trim()
  const direction = config.orientation ?? 'portrait'
  if (
    !paperPattern.test(paper) ||
    !['portrait', 'landscape'].includes(direction)
  )
    throw new TypeError('打印纸张或方向无效')
  // CSS 的显式宽高不接受 portrait/landscape 后缀，方向由这两个尺寸本身表达。
  const namedPaper = !/\s/.test(paper) && paper.toLowerCase() !== 'auto'
  return `size: ${paper}${namedPaper ? ` ${direction}` : ''};`
}

function marginStyle(value: string | undefined): string {
  if (value === undefined) return ''
  const margin = value.trim()
  if (!marginPattern.test(margin))
    throw new TypeError('打印边距必须是 1 至 4 个有效长度')
  return `margin: ${margin};`
}

/** 纸张配置转为浏览器分页 CSS；显式 style 最后应用，保留旧自定义样式优先级。 */
export function createPrintDocument(
  image: string,
  config: PrintConfig,
  defaultStyle: string
) {
  const page = [paperStyle(config), marginStyle(config.margin)]
    .filter(Boolean)
    .join(' ')
  const style = [
    defaultStyle,
    page ? `@page { ${page} }` : '',
    config.style ?? '',
  ]
    .filter(Boolean)
    .join('\n')
  // 锁定的 print-js 1.6.0 图片模式没有 footer；有页眉/页尾时用同引擎 raw-html，内容按纯文本处理。
  if (!config.header && !config.footer)
    return { type: 'image' as const, printable: image, style }
  const text = (tag: 'header' | 'footer', value: string | undefined) =>
    value
      ? `<${tag} style="white-space:pre-wrap">${escapeText(value)}</${tag}>`
      : ''
  return {
    type: 'raw-html' as const,
    printable: `<div>${text('header', config.header)}<img src="${escapeText(image)}" style="max-width:100%;height:auto" />${text('footer', config.footer)}</div>`,
    style,
  }
}
