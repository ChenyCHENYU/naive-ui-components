import { useScopedComponentLocale } from '../_shared/useScopedComponentLocale'

const CHINESE = Object.freeze({
  cl_register: '注册账号',
  cl_username_ph: '请输入用户名',
  cl_password_ph: '请输入密码',
  cl_remember: '记住我',
  cl_forgot: '忘记密码？',
  cl_phone_ph: '请输入手机号',
  cl_code_ph: '请输入验证码',
  cl_resend: '后重发',
  cl_get_code: '获取验证码',
  cl_verify_first: '请先完成人机验证',
  cl_login_btn: '登 录',
  cl_back: '返回',
  cl_qr_missing: '请配置二维码地址',
  cl_qr_hint: '打开手机扫码后点击「确认」即可登录',
  cl_qr_refresh: '二维码已失效？点击刷新',
  cl_confirm_pw_ph: '请再次输入密码',
  cl_confirm: '确认',
  cl_captcha_login: '验证码登录',
  cl_qr_login: '扫码登录',
  cl_social_login: '其他账号登录',
  cl_no_account: '还没有账号？',
  cl_username_rule: '请输入用户名',
  cl_password_rule: '请输入密码',
  cl_code_rule: '请输入验证码',
  cl_confirm_pw_rule: '请再次输入密码',
  cl_pw_mismatch: '两次密码输入不一致',
  cl_password_login: '密码登录',
  cl_welcome: '欢迎回来',
  cl_required: '{field}不能为空',
  cl_phone: '手机号',
  cl_password: '密码',
  cl_phone_format: '手机号格式错误',
  cl_password_format: '密码必须包含大小写字母和数字，长度6-20位',
})
const ENGLISH = Object.freeze({
  cl_register: 'Create an account',
  cl_username_ph: 'Enter username',
  cl_password_ph: 'Enter password',
  cl_remember: 'Remember me',
  cl_forgot: 'Forgot password?',
  cl_phone_ph: 'Enter phone number',
  cl_code_ph: 'Enter verification code',
  cl_resend: 'until resend',
  cl_get_code: 'Get code',
  cl_verify_first: 'Complete verification first',
  cl_login_btn: 'Sign in',
  cl_back: 'Back',
  cl_qr_missing: 'Configure a QR code URL',
  cl_qr_hint: 'Scan with your phone and confirm to sign in',
  cl_qr_refresh: 'QR code expired? Refresh',
  cl_confirm_pw_ph: 'Confirm your password',
  cl_confirm: 'Confirm',
  cl_captcha_login: 'Code sign-in',
  cl_qr_login: 'QR sign-in',
  cl_social_login: 'Other sign-in methods',
  cl_no_account: 'Need an account?',
  cl_username_rule: 'Enter username',
  cl_password_rule: 'Enter password',
  cl_code_rule: 'Enter verification code',
  cl_confirm_pw_rule: 'Confirm your password',
  cl_pw_mismatch: 'Passwords do not match',
  cl_password_login: 'Password sign-in',
  cl_welcome: 'Welcome back',
  cl_required: '{field} is required',
  cl_phone: 'Phone number',
  cl_password: 'Password',
  cl_phone_format: 'Invalid phone number',
  cl_password_format:
    'Use 6–20 characters with uppercase, lowercase letters and numbers',
})

type LegacyTranslator = (
  key: string,
  fallback: string,
  namespace: string
) => string

/** 新应用上下文优先；未配置时保留旧项目的翻译器与 key。 */
export function useLoginLocale() {
  const scoped = useScopedComponentLocale(CHINESE, ENGLISH)
  return {
    t: (
      key: string,
      fallback: string,
      params?: Record<string, string | number>
    ) => {
      const legacy = (globalThis as { $t?: LegacyTranslator }).$t
      return !scoped.configured.value && legacy
        ? legacy(key, fallback, 'robot_admin')
        : scoped.t(key, params)
    },
  }
}
