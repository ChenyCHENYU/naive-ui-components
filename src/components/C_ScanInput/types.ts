import type { ComponentLocale } from '../../core/contracts'

export interface ScanResult {
  value: string
  format?: string
}

/** Adapters receive a ready camera frame or decoded image, and should respect cancellation. */
export type ScanDecoder = (
  source: HTMLVideoElement | ImageBitmap,
  signal: AbortSignal
) => ScanResult | null | Promise<ScanResult | null>

export interface ScanInputProps {
  modelValue?: string
  camera?: boolean
  photo?: boolean
  decode?: ScanDecoder
  scope?: string | number
  disabled?: boolean
  placeholder?: string
  locale?: ComponentLocale
}

export interface ScanInputEmits {
  'update:modelValue': [value: string]
  scan: [result: ScanResult, input: 'camera' | 'photo']
  submit: [value: string]
  error: [error: unknown, input: 'camera' | 'photo']
}
