import { afterEach, expect, test, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import C_ImageCropper from '../../src/components/C_ImageCropper/index.vue'

const readers: FakeReader[] = []
class FakeReader {
  static LOADING = 1
  readyState = 0
  onload: ((event: { target: { result: string } }) => void) | null = null
  onerror: (() => void) | null = null
  abort = vi.fn(() => {
    this.readyState = 2
  })
  constructor() {
    readers.push(this)
  }
  readAsDataURL() {
    this.readyState = 1
  }
  finish(result: string) {
    this.readyState = 2
    this.onload?.({ target: { result } })
  }
}
vi.mock('vue-cropper', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    VueCropper: defineComponent({
      name: 'VueCropper',
      props: ['img'],
      setup(props) {
        return () => h('div', { 'data-image': props.img })
      },
    }),
  }
})

afterEach(() => {
  readers.length = 0
  vi.unstubAllGlobals()
})

const prepare = () => {
  vi.stubGlobal('FileReader', FakeReader)
  return mount(C_ImageCropper, {
    props: { src: 'seed', showPreview: false, showToolbar: false },
  })
}

test('a newer crop file aborts the previous reader and ignores its late result', async () => {
  const wrapper = prepare()
  wrapper.vm.loadFile(new File(['old'], 'old.png', { type: 'image/png' }))
  const old = readers[0]
  const lateLoad = old.onload!
  wrapper.vm.loadFile(new File(['new'], 'new.png', { type: 'image/png' }))
  expect(old.abort).toHaveBeenCalledTimes(1)
  readers[1].finish('new-file')
  lateLoad({ target: { result: 'old-file' } })
  await nextTick()
  expect(wrapper.get('[data-image]').attributes('data-image')).toBe('new-file')
})

test.each(['props', 'open', 'unmount'] as const)(
  'a pending crop file is cancelled after %s replaces its owner',
  async reason => {
    const wrapper = prepare()
    wrapper.vm.loadFile(new File(['old'], 'old.png', { type: 'image/png' }))
    const reader = readers[0]
    const lateLoad = reader.onload!
    const lateError = reader.onerror!
    if (reason === 'props') await wrapper.setProps({ src: 'from-props' })
    if (reason === 'open') wrapper.vm.open('from-open')
    if (reason === 'unmount') wrapper.unmount()
    expect(reader.abort).toHaveBeenCalledTimes(1)
    lateLoad({ target: { result: 'late-file' } })
    lateError()
    await nextTick()
    expect(wrapper.emitted('error')).toBeUndefined()
    if (reason !== 'unmount')
      expect(wrapper.get('[data-image]').attributes('data-image')).toBe(
        `from-${reason}`
      )
  }
)
