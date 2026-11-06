import { afterEach, expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import FilePreview from '../../src/components/C_FilePreview/index.vue'

vi.mock('../../src/components/C_FilePreview/data', async original => ({
  ...(await original<object>()),
  loadWord: vi
    .fn()
    .mockResolvedValue({ content: '<p>Document</p>', headings: [] }),
}))

afterEach(() => vi.unstubAllGlobals())

test('closed remote cards discard the previous source size without fetching the next source', async () => {
  const fetch = vi
    .fn()
    .mockImplementationOnce(() =>
      Promise.resolve(new Response('a'.repeat(128)))
    )
    .mockImplementationOnce(() => Promise.resolve(new Response('b'.repeat(64))))
  vi.stubGlobal('fetch', fetch)
  const wrapper = mount(FilePreview, {
    props: { url: '/first.docx' },
    global: { stubs: { teleport: true, C_Icon: true } },
  })
  const size = () => wrapper.get('.file-info-card .file-size').text()
  const open = () => wrapper.get('.file-actions button').trigger('click')
  expect(size()).toBe('0 B')
  expect(fetch).not.toHaveBeenCalled()
  await open()
  await flushPromises()
  expect(size()).toBe('128 B')
  await wrapper.get('button[aria-label="关闭预览"]').trigger('click')
  expect(size()).toBe('128 B')
  await wrapper.setProps({ url: '/second.docx' })
  await flushPromises()
  expect(size()).toBe('0 B')
  expect(fetch).toHaveBeenCalledTimes(1)
  await open()
  await flushPromises()
  expect(size()).toBe('64 B')
  expect(fetch).toHaveBeenCalledTimes(2)
})

test('hidden file cards retain local sizes and do not fetch a remote fallback', async () => {
  const fetch = vi.fn()
  vi.stubGlobal('fetch', fetch)
  const wrapper = mount(FilePreview, {
    props: { file: new File(['a'.repeat(32)], 'first.docx') },
    global: { stubs: { teleport: true, C_Icon: true } },
  })
  const size = () => wrapper.get('.file-info-card .file-size').text()
  expect(size()).toBe('32 B')
  await wrapper.setProps({ file: new File(['b'.repeat(16)], 'second.docx') })
  expect(size()).toBe('16 B')
  await wrapper.setProps({ url: '/unused-fallback.docx' })
  expect(size()).toBe('16 B')
  await wrapper.setProps({ file: undefined })
  expect(size()).toBe('0 B')
  expect(fetch).not.toHaveBeenCalled()
})
