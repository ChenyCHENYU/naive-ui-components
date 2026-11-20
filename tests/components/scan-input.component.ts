import { flushPromises, mount } from '@vue/test-utils'
import { expect, test, vi } from 'vitest'
import C_ScanInput from '../../src/components/C_ScanInput/index.vue'
import type {
  ScanDecoder,
  ScanResult,
} from '../../src/components/C_ScanInput/types'

test('manual and keyboard scanners preserve identifiers and ignore composing Enter', async () => {
  const wrapper = mount(C_ScanInput, { props: { modelValue: '00098' } })
  const input = wrapper.get('input')
  await input.trigger('keydown', { key: 'Enter', isComposing: true })
  expect(wrapper.emitted('submit')).toBeUndefined()
  await input.trigger('keydown', { key: 'Enter' })
  expect(wrapper.emitted('submit')).toEqual([['00098']])
  await input.setValue('00099')
  expect(wrapper.emitted('update:modelValue')).toEqual([['00099']])
})

test('photo decoding releases the bitmap and discards a result if the active scope changed', async () => {
  const close = vi.fn()
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(async () => ({ close }))
  )
  let finish: ((value: ScanResult) => void) | undefined
  const decode: ScanDecoder = vi.fn(
    () =>
      new Promise<ScanResult>(resolve => {
        finish = resolve
      })
  )
  const wrapper = mount(C_ScanInput, {
    props: { photo: true, decode, scope: 'order-a' },
  })
  try {
    const photo = wrapper.get('input[type="file"]')
    Object.defineProperty(photo.element, 'files', {
      value: [new File(['image'], 'code.png', { type: 'image/png' })],
    })
    await photo.trigger('change')
    await flushPromises()
    expect(decode).toHaveBeenCalledTimes(1)
    await wrapper.setProps({ scope: 'order-b' })
    expect(close).toHaveBeenCalledTimes(1)
    finish?.({ value: '0001' })
    await flushPromises()
    expect(wrapper.emitted('scan')).toBeUndefined()
    expect(close).toHaveBeenCalledTimes(1)
  } finally {
    wrapper.unmount()
    vi.unstubAllGlobals()
  }
})

test('a camera that resolves after cancellation is stopped without passing frames to the decoder', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices')
  const stop = vi.fn()
  let grantCamera:
    | ((media: { getTracks: () => Array<{ stop: () => void }> }) => void)
    | undefined
  const getUserMedia = vi.fn(
    () =>
      new Promise(resolve => {
        grantCamera = resolve
      })
  )
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia },
  })
  const decode = vi.fn(() => null)
  const wrapper = mount(C_ScanInput, {
    props: { camera: true, decode, locale: { locale: 'en-US' } },
  })
  try {
    await wrapper.get('button').trigger('click')
    expect(getUserMedia).toHaveBeenCalledWith({
      audio: false,
      video: { facingMode: { ideal: 'environment' } },
    })
    await wrapper
      .findAll('button')
      .find(button => button.text() === 'Stop scanning')
      ?.trigger('click')
    grantCamera?.({ getTracks: () => [{ stop }] })
    await flushPromises()
    expect(stop).toHaveBeenCalledTimes(1)
    expect(decode).not.toHaveBeenCalled()
    expect(wrapper.find('video').exists()).toBe(false)
  } finally {
    wrapper.unmount()
    if (descriptor) Object.defineProperty(navigator, 'mediaDevices', descriptor)
    else Reflect.deleteProperty(navigator, 'mediaDevices')
  }
})
