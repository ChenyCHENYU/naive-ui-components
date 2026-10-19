import { beforeEach, expect, test, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import C_Login from '../../src/components/C_Login/index.vue'

type Mode = 'password' | 'captcha' | 'register'
const forms: { validate: ReturnType<typeof vi.fn> }[] = []
const FormStub = defineComponent({
  setup(_props, { slots, expose }) {
    const validate = vi.fn(async () => undefined)
    forms.push({ validate })
    expose({ validate })
    return () => h('form', slots.default?.())
  },
})
const InputStub = defineComponent({
  props: ['value'],
  emits: ['update:value'],
  setup(props, { emit, attrs }) {
    return () =>
      h('input', {
        ...attrs,
        value: props.value,
        onInput: (event: Event) =>
          emit('update:value', (event.target as HTMLInputElement).value),
      })
  },
})
const ButtonStub = defineComponent({
  props: ['disabled', 'loading'],
  setup(props, { slots }) {
    return () =>
      h(
        'button',
        { disabled: props.disabled || props.loading },
        slots.default?.()
      )
  },
})

beforeEach(() => {
  forms.length = 0
})

async function enterMode(wrapper: VueWrapper, mode: Mode) {
  if (mode === 'captcha')
    await wrapper.get('.c-login__mode-btn').trigger('click')
  if (mode === 'register')
    await wrapper.get('.c-login__register-link').trigger('click')
}

async function prepare(mode: Mode) {
  const wrapper = mount(C_Login, {
    props: {
      features: {
        captchaVerify: false,
        qrcodeLogin: false,
        socialLogin: false,
        rememberMe: false,
      },
    },
    global: {
      stubs: {
        NForm: FormStub,
        NFormItem: { template: '<div><slot /></div>' },
        NInput: InputStub,
        NButton: ButtonStub,
        NText: { template: '<span><slot /></span>' },
        C_Captcha: true,
        C_QRCode: true,
      },
    },
  })
  await enterMode(wrapper, mode)
  const formIndex = { password: 0, captcha: 1, register: 2 }[mode]
  const inputs = wrapper.findAll('form')[formIndex].findAll('input')
  await Promise.all(
    inputs.map((input, index) => input.setValue(`field-${index}`))
  )
  return {
    wrapper,
    inputs,
    form: forms[formIndex],
    event: {
      password: 'submit',
      captcha: 'captcha-submit',
      register: 'register-submit',
    }[mode],
  }
}

test.each(['password', 'captcha', 'register'] as const)(
  '%s submission locks validation and allows a clean retry after rejection',
  async mode => {
    const { wrapper, inputs, form, event } = await prepare(mode)
    let reject!: (error: Error) => void
    form.validate.mockImplementationOnce(
      () =>
        new Promise((_resolve, fail) => {
          reject = fail
        })
    )
    await wrapper.get('.c-login__submit-btn').trigger('click')
    await inputs.at(-1)!.trigger('keyup', { key: 'Enter' })
    expect(form.validate).toHaveBeenCalledTimes(1)
    expect(
      wrapper.get('.c-login__submit-btn').attributes('disabled')
    ).toBeDefined()
    reject(new Error('invalid'))
    await flushPromises()
    expect(wrapper.emitted(event)).toBeUndefined()
    expect(
      wrapper.get('.c-login__submit-btn').attributes('disabled')
    ).toBeUndefined()
    await wrapper.get('.c-login__submit-btn').trigger('click')
    await flushPromises()
    expect(wrapper.emitted(event)).toHaveLength(1)
  }
)

test.each(
  (['password', 'captcha', 'register'] as const).flatMap(mode =>
    (['loading', 'disabled', 'unmount', 'edit', 'switch'] as const).map(
      reason => ({ mode, reason })
    )
  )
)('$mode validation cannot publish after $reason', async ({ mode, reason }) => {
  const { wrapper, inputs, form, event } = await prepare(mode)
  let resolve!: () => void
  form.validate.mockImplementationOnce(
    () =>
      new Promise<void>(done => {
        resolve = done
      })
  )
  await wrapper.get('.c-login__submit-btn').trigger('click')
  if (reason === 'loading') await wrapper.setProps({ loading: true })
  if (reason === 'disabled') await wrapper.setProps({ submitDisabled: true })
  if (reason === 'edit') await inputs[0].setValue('changed while validating')
  if (reason === 'switch') {
    if (mode === 'password') {
      await enterMode(wrapper, 'captcha')
      await wrapper.get('.c-login__back-btn').trigger('click')
    } else {
      await wrapper.get('.c-login__back-btn').trigger('click')
      await enterMode(wrapper, mode)
    }
  }
  if (reason === 'unmount') wrapper.unmount()
  resolve()
  await flushPromises()
  expect(wrapper.emitted(event)).toBeUndefined()
})
