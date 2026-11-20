import type { ComponentLocale } from '../../core/contracts'
import type { ComponentDensity } from '../../core/density'

/** 相对原图左上角的比例，横纵轴均为 0 到 1。 */
export interface ImageAnnotationBox {
  x: number
  y: number
  width: number
  height: number
}

export interface ImageAnnotation {
  id: string
  box: ImageAnnotationBox
  note: string
}

export interface ImageAnnotatorProps {
  src: string | File
  alt: string
  readonly?: boolean
  title?: string
  locale?: ComponentLocale
  density?: ComponentDensity
}
