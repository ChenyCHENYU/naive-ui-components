/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-19
 * @Description: 递归节点插槽、内嵌预览和上传队列状态的真实组件回归
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */
import { test, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { h } from 'vue'
import OrgChart from '../../src/components/C_OrgChart/index.vue'
import FilePreview from '../../src/components/C_FilePreview/index.vue'
import Upload from '../../src/components/C_Upload/index.vue'
import type { UploadRequestOptions } from '../../src/components/C_Upload/types'

test('custom node slots reach every recursive level and survive collapse', async () => {
  const wrapper = mount(OrgChart, {
    props: {
      data: {
        id: 'root',
        label: 'Root',
        children: [
          {
            id: 'team',
            label: 'Team',
            children: [{ id: 'member', label: 'Member' }],
          },
        ],
      },
    },
    slots: {
      node: ({ node }) => h('span', { 'data-person': node.id }, node.label),
    },
  })
  expect(wrapper.findAll('[data-person]')).toHaveLength(3)
  await wrapper.get('button[aria-label="折叠 Team"]').trigger('click')
  expect(wrapper.findAll('[data-person]')).toHaveLength(2)
  await wrapper.get('button[aria-label="展开 Team"]').trigger('click')
  expect(wrapper.findAll('[data-person]')).toHaveLength(3)
})
test('inline PDF renders inside its host and releases its owned URL', async () => {
  const create = vi
    .spyOn(URL, 'createObjectURL')
    .mockReturnValue('blob:preview-test')
  const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  const wrapper = mount(FilePreview, {
    props: {
      inline: true,
      file: new File(['%PDF-1.4\n'], 'guide.pdf', { type: 'application/pdf' }),
    },
  })
  await flushPromises()
  expect(wrapper.find('.c-file-preview-inline iframe').exists()).toBe(true)
  expect(document.querySelector('.n-modal')).toBeNull()
  expect(wrapper.find('.c-file-preview-inline').text()).toContain(
    '翻页、缩放与打印由浏览器提供'
  )
  expect(create).toHaveBeenCalledTimes(1)
  wrapper.unmount()
  expect(revoke).toHaveBeenCalledWith('blob:preview-test')
})
test('upload change publishes independent snapshots for progress and pause', async () => {
  let request: UploadRequestOptions | undefined
  const abort = vi.fn()
  const wrapper = mount(Upload, {
    props: {
      customRequest: options => {
        request = options
        return { abort }
      },
      showFileList: false,
    },
  })
  const input = wrapper.get('input[type=file]')
  Object.defineProperty(input.element, 'files', {
    value: [new File(['hello'], 'hello.txt', { type: 'text/plain' })],
    configurable: true,
  })
  await input.trigger('change')
  await flushPromises()
  const initial = wrapper.emitted('change')![0][0] as Array<{
    status: string
    percent: number
  }>
  request!.onProgress!(50)
  await flushPromises()
  const progress = wrapper.emitted('change')!.at(-1)![0] as Array<{
    status: string
    percent: number
  }>
  expect(progress[0].status).toBe('uploading')
  expect(progress[0].percent).toBe(50)
  expect(initial[0].percent).toBe(0)
  wrapper.vm.pauseAll()
  await flushPromises()
  expect(
    (wrapper.emitted('change')!.at(-1)![0] as Array<{ status: string }>)[0]
      .status
  ).toBe('paused')
  expect(abort).toHaveBeenCalledTimes(1)
})
