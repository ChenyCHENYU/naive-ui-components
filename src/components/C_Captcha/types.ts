import type { ComponentFeedback, ComponentLocale } from '../../config'

export interface CaptchaProof {
  /** Client correlation value only; servers must never trust it as proof. */
  token: string
  /** Client clock value only; servers must never use it as freshness proof. */
  timestamp: number
  type: 'puzzle-captcha'
}

export interface CaptchaVerificationRequest extends CaptchaProof {
  /** Cancels superseded, reset, unmounted, or timed-out verification. */
  signal: AbortSignal
}

export interface CaptchaVerificationResult {
  valid: boolean
  /** Prefer a short-lived, single-use token issued by the application server. */
  token?: string
  message?: string
}

export type CaptchaVerifier = (
  request: CaptchaVerificationRequest
) =>
  | boolean
  | CaptchaVerificationResult
  | Promise<boolean | CaptchaVerificationResult>

export interface CaptchaSuccessPayload extends CaptchaProof {
  verifiedBy: 'local' | 'server'
}

export interface CaptchaProps {
  triggerText?: string
  images?: string[]
  disabled?: boolean
  theme?: 'light' | 'dark'
  /**
   * Application-owned verification adapter. It must validate an independent,
   * server/provider-issued challenge; client token/timestamp are telemetry only.
   */
  verifier?: CaptchaVerifier
  /** Maximum time for `verifier`, in milliseconds. */
  verificationTimeout?: number
  /** Fail closed when no server verifier is configured. */
  requireServerVerification?: boolean
  feedback?: ComponentFeedback
  locale?: ComponentLocale
}

export interface CaptchaEmits {
  (event: 'success', data: CaptchaSuccessPayload): void
  (event: 'fail', error: string): void
  (event: 'verify-error', error: unknown): void
  (event: 'load-error', error: unknown): void
  (event: 'change', valid: boolean): void
  (event: 'reset'): void
}

export interface CaptchaInstance {
  validate: () => boolean
  getToken: () => string
  getVerificationData: () => CaptchaSuccessPayload | null
  reset: () => void
  show: () => void
}
