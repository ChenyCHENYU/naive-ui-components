import type {
  CaptchaProof,
  CaptchaSuccessPayload,
  CaptchaVerifier,
} from './types'

export type CaptchaVerificationErrorCode =
  'aborted' | 'missing-verifier' | 'missing-token' | 'rejected' | 'timeout'

/** Error with a stable machine-readable reason for captcha verification. */
export class CaptchaVerificationError extends Error {
  constructor(
    public readonly code: CaptchaVerificationErrorCode,
    message: string,
    public readonly cause?: unknown
  ) {
    super(message)
    this.name = 'CaptchaVerificationError'
  }
}

let fallbackTokenSequence = 0

/** Create a correlation token. It is not an authentication credential. */
export function createCaptchaProof(): CaptchaProof {
  const timestamp = Date.now()
  const randomPart =
    globalThis.crypto?.randomUUID?.() ?? `${++fallbackTokenSequence}`
  return {
    token: `puzzle_${timestamp}_${randomPart}`,
    timestamp,
    type: 'puzzle-captcha',
  }
}

export interface VerifyCaptchaProofOptions {
  verifier?: CaptchaVerifier
  timeout?: number
  requireServerVerification?: boolean
  signal?: AbortSignal
}

/** Normalize local/server verification with cancellation and a hard timeout. */
// The branches encode explicit trust, timeout, cancellation, and result states.
// eslint-disable-next-line complexity
export async function verifyCaptchaProof(
  proof: CaptchaProof,
  options: VerifyCaptchaProofOptions = {}
): Promise<CaptchaSuccessPayload> {
  const { verifier, requireServerVerification = false, signal } = options
  const configuredTimeout = options.timeout ?? 10_000
  const timeout =
    Number.isFinite(configuredTimeout) && configuredTimeout > 0
      ? configuredTimeout
      : 10_000

  if (signal?.aborted) {
    throw new CaptchaVerificationError('aborted', 'Verification was cancelled.')
  }

  if (!verifier) {
    if (requireServerVerification) {
      throw new CaptchaVerificationError(
        'missing-verifier',
        'Server verification is required but no verifier was configured.'
      )
    }
    return { ...proof, verifiedBy: 'local' }
  }

  const controller = new AbortController()
  const abort = () => controller.abort(signal?.reason)
  signal?.addEventListener('abort', abort, { once: true })

  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort('timeout')
      reject(
        new CaptchaVerificationError(
          'timeout',
          `Verification timed out after ${timeout}ms.`
        )
      )
    }, timeout)
  })
  const abortPromise = new Promise<never>((_, reject) => {
    controller.signal.addEventListener(
      'abort',
      () => {
        if (controller.signal.reason === 'timeout') return
        reject(
          new CaptchaVerificationError('aborted', 'Verification was cancelled.')
        )
      },
      { once: true }
    )
  })

  try {
    const rawResult = await Promise.race([
      Promise.resolve(verifier({ ...proof, signal: controller.signal })),
      timeoutPromise,
      abortPromise,
    ])
    const result =
      typeof rawResult === 'boolean' ? { valid: rawResult } : rawResult
    if (!result.valid) {
      throw new CaptchaVerificationError(
        'rejected',
        result.message || 'Server verification rejected the challenge.'
      )
    }
    const serverToken = result.token?.trim()
    if (requireServerVerification && !serverToken) {
      throw new CaptchaVerificationError(
        'missing-token',
        'Server verification did not return a trusted token.'
      )
    }
    return {
      ...proof,
      token: serverToken || proof.token,
      verifiedBy: 'server',
    }
  } catch (error) {
    if (error instanceof CaptchaVerificationError) throw error
    throw new CaptchaVerificationError(
      'rejected',
      'Server verification failed.',
      error
    )
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
    signal?.removeEventListener('abort', abort)
  }
}
