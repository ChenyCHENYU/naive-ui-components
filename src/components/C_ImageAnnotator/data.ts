import type { ImageAnnotation, ImageAnnotationBox } from './types'

type Point = Pick<ImageAnnotationBox, 'x' | 'y'>
export type PercentBox = Record<keyof ImageAnnotationBox, number | null>
const minimumSide = 0.001

/** 指针在图外移动时，仍把区域限制在原图内。 */
export function imagePoint(event: PointerEvent): Point | undefined {
  const canvas = event.currentTarget as HTMLElement
  const bounds = canvas.getBoundingClientRect()
  if (bounds.width <= 0 || bounds.height <= 0) return undefined
  const clamp = (value: number) => Math.min(1, Math.max(0, value))
  return {
    x: clamp((event.clientX - bounds.left) / bounds.width),
    y: clamp((event.clientY - bounds.top) / bounds.height),
  }
}

/** 由任意拖动方向计算图片区域。 */
export function boxFromPoints(first: Point, second: Point): ImageAnnotationBox {
  return {
    x: Math.min(first.x, second.x),
    y: Math.min(first.y, second.y),
    width: Math.abs(first.x - second.x),
    height: Math.abs(first.y - second.y),
  }
}

/** 允许浮点舍入误差，超出图片或无法显示的区域交给调用方处理。 */
export function isValidBox(box: ImageAnnotationBox): boolean {
  const { x, y, width, height } = box
  const edge = 1 + Number.EPSILON
  return (
    x >= 0 &&
    y >= 0 &&
    width >= minimumSide &&
    height >= minimumSide &&
    x + width <= edge &&
    y + height <= edge
  )
}

/** 坐标编辑使用百分数，存储始终使用原图的归一化比例。 */
export function toPercentBox(box: ImageAnnotationBox): PercentBox {
  return {
    x: box.x * 100,
    y: box.y * 100,
    width: box.width * 100,
    height: box.height * 100,
  }
}

/** 空的键盘输入保留为无效状态，由编辑器展示错误。 */
export function toNormalizedBox(box: PercentBox): ImageAnnotationBox {
  return {
    x: (box.x ?? NaN) / 100,
    y: (box.y ?? NaN) / 100,
    width: (box.width ?? NaN) / 100,
    height: (box.height ?? NaN) / 100,
  }
}

/** 比较编辑起始快照与现有记录，防止覆盖并行更新。 */
export function isSameAnnotation(
  left: ImageAnnotation,
  right: ImageAnnotation
) {
  const { x, y, width, height } = left.box
  return (
    left.note === right.note &&
    x === right.box.x &&
    y === right.box.y &&
    width === right.box.width &&
    height === right.box.height
  )
}
