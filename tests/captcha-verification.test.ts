import { describe, expect, test } from 'bun:test'
import {
  CaptchaVerificationError,
  createCaptchaProof,
  verifyCaptchaProof,
} from '../src/components/C_Captcha/verification'

describe('captcha verification contract', () => {
  test('keeps local mode backward compatible and labels the trust boundary', async () => {
    const proof = createCaptchaProof()
    const result = await verifyCaptchaProof(proof)

    expect(result).toEqual({ ...proof, verifiedBy: 'local' })
    expect(result.token).toStartWith('puzzle_')
  })

  test('uses a server-issued token after successful verification', async () => {
    const proof = createCaptchaProof()
    const result = await verifyCaptchaProof(proof, {
      verifier: request => {
        expect(request.signal).toBeInstanceOf(AbortSignal)
        return { valid: true, token: 'server-token' }
      },
    })

    expect(result.token).toBe('server-token')
    expect(result.verifiedBy).toBe('server')
  })

  test('fails closed when server verification is required', async () => {
    try {
      await verifyCaptchaProof(createCaptchaProof(), {
        requireServerVerification: true,
      })
      throw new Error('expected verification to fail')
    } catch (error) {
      expect(error).toBeInstanceOf(CaptchaVerificationError)
      expect((error as CaptchaVerificationError).code).toBe('missing-verifier')
    }
  })

  test('requires a server-issued token in fail-closed mode', async () => {
    try {
      await verifyCaptchaProof(createCaptchaProof(), {
        verifier: () => true,
        requireServerVerification: true,
      })
      throw new Error('expected verification to require a server token')
    } catch (error) {
      expect(error).toBeInstanceOf(CaptchaVerificationError)
      expect((error as CaptchaVerificationError).code).toBe('missing-token')
    }
  })

  test('rejects invalid server results', async () => {
    try {
      await verifyCaptchaProof(createCaptchaProof(), {
        verifier: () => ({ valid: false, message: 'invalid challenge' }),
      })
      throw new Error('expected verification to fail')
    } catch (error) {
      expect(error).toBeInstanceOf(CaptchaVerificationError)
      expect((error as CaptchaVerificationError).code).toBe('rejected')
      expect((error as Error).message).toBe('invalid challenge')
    }
  })

  test('cancels an in-flight verifier', async () => {
    const controller = new AbortController()
    const pending = verifyCaptchaProof(createCaptchaProof(), {
      verifier: () => new Promise(() => undefined),
      signal: controller.signal,
    })
    controller.abort()

    try {
      await pending
      throw new Error('expected verification to be aborted')
    } catch (error) {
      expect(error).toBeInstanceOf(CaptchaVerificationError)
      expect((error as CaptchaVerificationError).code).toBe('aborted')
    }
  })

  test('times out a verifier that never settles', async () => {
    try {
      await verifyCaptchaProof(createCaptchaProof(), {
        verifier: () => new Promise(() => undefined),
        timeout: 5,
      })
      throw new Error('expected verification to time out')
    } catch (error) {
      expect(error).toBeInstanceOf(CaptchaVerificationError)
      expect((error as CaptchaVerificationError).code).toBe('timeout')
    }
  })
})
