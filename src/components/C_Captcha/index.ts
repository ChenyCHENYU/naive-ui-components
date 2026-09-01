export { default as C_Captcha } from './index.vue'
export {
  CaptchaVerificationError,
  createCaptchaProof,
  verifyCaptchaProof,
} from './verification'
export type {
  CaptchaEmits,
  CaptchaInstance,
  CaptchaProof,
  CaptchaProps,
  CaptchaSuccessPayload,
  CaptchaVerificationRequest,
  CaptchaVerificationResult,
  CaptchaVerifier,
} from './types'
