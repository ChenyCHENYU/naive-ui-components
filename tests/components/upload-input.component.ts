import { test, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Upload from '../../src/components/C_Upload/index.vue'
import type {
  CustomUploadRequest,
  UploadFileItem,
} from '../../src/components/C_Upload/types'

function dispatchDrop(element: Element, items: unknown[], files: File[] = []) {
  const event = new Event('drop', { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'dataTransfer', { value: { items, files } })
  element.dispatchEvent(event)
}

/** 在测试掌控的时机返回第一批目录项，后续读取返回空批次。 */
function delayedFolder(file: File) {
  let complete: (() => void) | undefined
  const readEntries = vi.fn((done: (entries: unknown[]) => void) => {
    if (complete) return done([])
    complete = () =>
      done([
        { isFile: true, file: (accept: (file: File) => void) => accept(file) },
      ])
  })
  return {
    item: {
      webkitGetAsEntry: () => ({
        isDirectory: true,
        createReader: () => ({ readEntries }),
      }),
    },
    readEntries,
    release: () => complete?.(),
  }
}

test.each(['replace', 'clear'] as const)(
  'upload %s invalidates pending directory input before changing records',
  async operation => {
    const request = vi.fn<CustomUploadRequest>(() => ({ abort: vi.fn() }))
    const wrapper = mount(Upload, {
      props: { directory: true, data: { record: 'A' }, customRequest: request },
    })
    const oldFolder = delayedFolder(new File(['old'], 'record-A.txt'))
    dispatchDrop(wrapper.get('.upload-area').element, [oldFolder.item])
    expect(oldFolder.readEntries).toHaveBeenCalledTimes(1)

    await wrapper.setProps({ data: { record: 'B' } })
    if (operation === 'replace') wrapper.vm.replaceFileList([])
    else wrapper.vm.clearAll()
    oldFolder.release()
    await flushPromises()
    expect(oldFolder.readEntries).toHaveBeenCalledTimes(1)
    expect(request).not.toHaveBeenCalled()

    const nextFolder = delayedFolder(new File(['new'], 'record-B.txt'))
    dispatchDrop(wrapper.get('.upload-area').element, [nextFolder.item])
    nextFolder.release()
    await flushPromises()
    expect(
      request.mock.calls.map(([options]) => [
        options.filename,
        options.data?.record,
      ])
    ).toEqual([['record-B.txt', 'B']])
    wrapper.unmount()
  }
)

test.each(['replace', 'clear'] as const)(
  'upload %s ignores a late native chooser result and can reopen for the new record',
  async operation => {
    const request = vi.fn<CustomUploadRequest>(() => ({ abort: vi.fn() }))
    const open = vi.spyOn(HTMLInputElement.prototype, 'click')
    const wrapper = mount(Upload, {
      props: { data: { record: 'A' }, customRequest: request },
    })
    const oldInput = wrapper.get('input[type=file]')
    wrapper.vm.selectFiles()
    expect(open.mock.contexts).toEqual([oldInput.element])

    await wrapper.setProps({ data: { record: 'B' } })
    if (operation === 'replace') wrapper.vm.replaceFileList([])
    else wrapper.vm.clearAll()
    wrapper.vm.selectFiles()
    // 换单和旧选择回调可能发生在同一轮更新内。
    Object.defineProperty(oldInput.element, 'files', {
      value: [new File(['old'], 'record-A.txt')],
      configurable: true,
    })
    await oldInput.trigger('change')
    await flushPromises()
    expect(request).not.toHaveBeenCalled()

    const nextInput = wrapper.get('input[type=file]')
    expect(nextInput.element).not.toBe(oldInput.element)
    expect(open.mock.contexts).toEqual([oldInput.element, nextInput.element])
    Object.defineProperty(nextInput.element, 'files', {
      value: [new File(['new'], 'record-B.txt')],
      configurable: true,
    })
    await nextInput.trigger('change')
    await flushPromises()
    expect(request).toHaveBeenCalledOnce()
    expect(request.mock.calls[0]?.[0]).toMatchObject({
      filename: 'record-B.txt',
      data: { record: 'B' },
    })
  }
)

test('a remove observer switching records preserves the new attachment with the same uid', async () => {
  const previous: UploadFileItem = {
    uid: '1',
    name: 'record-A.txt',
    size: 1,
    type: 'text/plain',
    status: 'success',
    percent: 100,
  }
  const next = { ...previous, name: 'record-B.txt' }
  const wrapper = mount(Upload, {
    props: {
      defaultFileList: [previous],
      onRemove: () => wrapper.vm.replaceFileList([next]),
    },
  })

  wrapper.vm.removeFile(previous.uid)
  await flushPromises()
  expect(wrapper.emitted('remove')).toEqual([[previous]])
  expect(wrapper.vm.getFileList()).toEqual([next])
})

test.each(['drop', 'paste'] as const)(
  'single upload accepts one matching file per %s',
  async source => {
    const request = vi.fn<CustomUploadRequest>(() => ({ abort: vi.fn() }))
    const wrapper = mount(Upload, {
      props: { accept: '.txt', pasteable: true, customRequest: request },
    })
    const area = wrapper.get('.upload-area').element
    const files = ['ignore.png', 'first.txt', 'second.txt'].map(
      name => new File(['file'], name)
    )
    if (source === 'drop') dispatchDrop(area, [], files)
    else {
      const event = new Event('paste', { bubbles: true, cancelable: true })
      Object.defineProperty(event, 'clipboardData', {
        value: {
          items: files.map(file => ({ kind: 'file', getAsFile: () => file })),
        },
      })
      area.dispatchEvent(event)
    }
    await flushPromises()
    expect(request.mock.calls.map(([options]) => options.filename)).toEqual([
      'first.txt',
    ])
    wrapper.unmount()
  }
)

test('a mixed drop retains ordinary files without traversing disabled directories', async () => {
  const request = vi.fn<CustomUploadRequest>(() => ({ abort: vi.fn() }))
  const wrapper = mount(Upload, {
    props: { multiple: true, customRequest: request },
  })
  const folder = delayedFolder(new File(['child'], 'child.txt'))
  const plain = { getAsFile: () => new File(['plain'], 'plain.txt') }
  dispatchDrop(wrapper.get('.upload-area').element, [folder.item, plain])
  await flushPromises()
  expect(folder.readEntries).not.toHaveBeenCalled()
  expect(request.mock.calls.map(([options]) => options.filename)).toEqual([
    'plain.txt',
  ])
  wrapper.unmount()
})
