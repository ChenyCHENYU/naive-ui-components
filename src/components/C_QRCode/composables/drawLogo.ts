import type { LogoOptions } from '../types'

/** 取消必须 settle 等待者，且不保留已移除组件的 Image 事件和网络来源。 */
export function createQRCodeAbortError(): DOMException {
  return new DOMException('二维码任务已取消', 'AbortError')
}

function paintLogo(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  logo: LogoOptions,
  qrSize: number
) {
  const ratio = Math.min(0.3, Math.max(0.05, logo.size ?? 0.2))
  const logoSize = Math.floor(qrSize * ratio)
  const padding = Math.max(0, logo.padding ?? 4)
  const borderRadius = Math.min(
    logoSize / 2,
    Math.max(0, logo.borderRadius ?? 4)
  )
  const x = (canvas.width - logoSize) / 2
  const y = (canvas.height - logoSize) / 2
  const bgX = x - padding
  const bgY = y - padding
  const bgSize = logoSize + padding * 2
  const radius = borderRadius + padding

  ctx.save()
  try {
    ctx.beginPath()
    ctx.moveTo(bgX + radius, bgY)
    ctx.arcTo(bgX + bgSize, bgY, bgX + bgSize, bgY + bgSize, radius)
    ctx.arcTo(bgX + bgSize, bgY + bgSize, bgX, bgY + bgSize, radius)
    ctx.arcTo(bgX, bgY + bgSize, bgX, bgY, radius)
    ctx.arcTo(bgX, bgY, bgX + bgSize, bgY, radius)
    ctx.closePath()
    ctx.fillStyle = logo.bgColor ?? '#ffffff'
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(x + borderRadius, y)
    ctx.arcTo(x + logoSize, y, x + logoSize, y + logoSize, borderRadius)
    ctx.arcTo(x + logoSize, y + logoSize, x, y + logoSize, borderRadius)
    ctx.arcTo(x, y + logoSize, x, y, borderRadius)
    ctx.arcTo(x, y, x + logoSize, y, borderRadius)
    ctx.closePath()
    ctx.clip()
    ctx.drawImage(image, x, y, logoSize, logoSize)
  } finally {
    ctx.restore()
  }
}

/** 仅当前任务能将 Logo 绘到离屏画布；成功、失败和取消都释放事件及来源。 */
export function drawLogo(
  canvas: HTMLCanvasElement,
  logo: LogoOptions,
  qrSize: number,
  signal: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(createQRCodeAbortError())
    const ctx = canvas.getContext('2d')
    if (!ctx) return reject(new Error('Canvas context 不可用'))
    const image = new Image()
    image.crossOrigin = 'anonymous'
    let settled = false

    const cleanup = () => {
      image.onload = null
      image.onerror = null
      signal.removeEventListener('abort', abort)
      image.src = ''
    }
    const settle = (error?: unknown) => {
      if (settled) return
      settled = true
      cleanup()
      if (error === undefined) resolve()
      else reject(error)
    }
    const abort = () => settle(createQRCodeAbortError())
    image.onload = () => {
      if (settled) return
      if (signal.aborted) return abort()
      try {
        paintLogo(canvas, ctx, image, logo, qrSize)
        settle()
      } catch (error) {
        settle(error)
      }
    }
    image.onerror = () => settle(new Error(`Logo 加载失败: ${logo.src}`))
    signal.addEventListener('abort', abort, { once: true })
    if (signal.aborted) abort()
    else {
      try {
        image.src = logo.src
      } catch (error) {
        settle(error)
      }
    }
  })
}
