import { flushPromises, mount } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'
import { expect, test } from 'vitest'
import Upload from '../../src/components/C_Upload/index.vue'
import { STATUS_TEXT } from '../../src/components/C_Upload/constants'
import type {
  UploadFileItem,
  UploadFileStatus,
} from '../../src/components/C_Upload/types'
import type { ComponentLocale } from '../../src/core/contracts'
import { COMPONENT_LOCALE_KEY } from '../../src/context'

const statuses: UploadFileStatus[] = [
  'pending',
  'validating',
  'hashing',
  'uploading',
  'success',
  'error',
  'paused',
  'instant',
]
const file = (status: UploadFileStatus): UploadFileItem => ({
  uid: status,
  name: `业务文件-${status}.pdf`,
  type: 'application/pdf',
  status,
  size: 32,
  percent: 20,
})

test('upload status and total progress follow application language while legacy status labels stay Chinese', async () => {
  const locale = reactive<ComponentLocale>({ locale: 'en-US' })
  const files = statuses.map(file)
  const wrapper = mount(Upload, {
    props: { defaultFileList: files },
    global: { provide: { [COMPONENT_LOCALE_KEY as symbol]: locale } },
  })
  expect(
    wrapper.findAll('.file-list__meta .n-tag').map(tag => tag.text())
  ).toEqual([
    'Waiting to upload',
    'Validating file…',
    'Calculating checksum…',
    'Uploading…',
    'Uploaded',
    'Upload failed',
    'Paused',
    'Instant upload complete',
  ])
  expect(wrapper.get('.c-upload__total-label').text()).toContain(
    'Total progress'
  )
  locale.locale = 'zh-CN'
  await nextTick()
  expect(
    wrapper.findAll('.file-list__meta .n-tag').map(tag => tag.text())
  ).toEqual(statuses.map(status => STATUS_TEXT[status]))
  expect(wrapper.get('.c-upload__total-label').text()).toContain('总进度')
  expect(STATUS_TEXT.error).toBe('上传失败')
  expect(wrapper.vm.getFileList()).toEqual(files)
})

test('upload preserves business filenames, errors and slots while messages and translators remain application-scoped', async () => {
  const locale = reactive<ComponentLocale>({
    locale: 'en-US',
    messages: {
      'upload.status.error': 'Could not upload',
      'upload.retry': 'Try again',
      'upload.chunkProgress': 'Part {uploaded} of {total}',
    },
  })
  const files: UploadFileItem[] = [
    { ...file('error'), error: '业务接口原始错误' },
    {
      ...file('uploading'),
      chunkProgress: {
        uploadedChunks: 1,
        totalChunks: 3,
        uploadedBytes: 1,
        totalBytes: 3,
      },
    },
  ]
  const first = mount(Upload, {
    props: { defaultFileList: files },
    slots: { area: '<span>业务自定义上传区</span>' },
    global: { provide: { [COMPONENT_LOCALE_KEY as symbol]: locale } },
  })
  const second = mount(Upload, { props: { defaultFileList: files } })
  expect(first.text()).toContain('Could not upload')
  expect(first.text()).toContain('Part 1 of 3')
  expect(first.find('[aria-label="Try again"]').exists()).toBe(true)
  expect(first.text()).toContain('业务自定义上传区')
  expect(first.text()).toContain('业务接口原始错误')
  expect(first.text()).toContain(files[0].name)
  locale.t = key => `translated:${key}`
  await nextTick()
  expect(first.text()).toContain('translated:upload.status.error')
  expect(first.find('[aria-label="translated:upload.retry"]').exists()).toBe(
    true
  )
  expect(first.text()).toContain('业务接口原始错误')
  expect(first.text()).toContain('业务自定义上传区')
  expect(second.text()).toContain('上传失败')
  expect(second.find('[aria-label="重试上传"]').exists()).toBe(true)
  expect(first.vm.getFileList()).toEqual(files)
})

test.each(['text', 'image'] as const)(
  'upload %s retry and remove accessible names follow the language',
  async listType => {
    const locale = reactive<ComponentLocale>({ locale: 'en-US' })
    const wrapper = mount(Upload, {
      props: {
        listType,
        defaultFileList: [{ ...file('error'), type: 'image/png' }],
      },
      global: { provide: { [COMPONENT_LOCALE_KEY as symbol]: locale } },
    })
    expect(wrapper.find('button[aria-label="Retry upload"]').exists()).toBe(
      true
    )
    expect(wrapper.find('button[aria-label="Remove file"]').exists()).toBe(true)
    locale.locale = 'zh-CN'
    await nextTick()
    expect(wrapper.find('button[aria-label="重试上传"]').exists()).toBe(true)
    expect(wrapper.find('button[aria-label="移除文件"]').exists()).toBe(true)
    await wrapper.get('button[aria-label="移除文件"]').trigger('click')
    await flushPromises()
    expect(wrapper.emitted('remove')?.[0][0]).toEqual(
      expect.objectContaining({ uid: 'error' })
    )
  }
)

test('upload area translates drop and paste hints without changing explicit business tips', async () => {
  const locale = reactive<ComponentLocale>({ locale: 'en-US' })
  const wrapper = mount(Upload, {
    props: { pasteable: true, tip: '业务类型限制' },
    global: { provide: { [COMPONENT_LOCALE_KEY as symbol]: locale } },
  })
  expect(wrapper.get('.upload-area__text').text()).toBe(
    'Click or drag files here to upload; paste with Ctrl+V'
  )
  expect(wrapper.get('kbd').text()).toBe('Ctrl+V')
  await wrapper.get('.upload-area').trigger('dragenter')
  expect(wrapper.get('.upload-area__text').text()).toBe('Drop files here')
  locale.locale = 'zh-CN'
  await nextTick()
  expect(wrapper.get('.upload-area__text').text()).toBe('释放文件到此处')
  await wrapper.get('.upload-area').trigger('dragleave')
  expect(wrapper.get('.upload-area__text').text()).toContain(
    '点击或拖拽文件到此区域上传'
  )
  expect(wrapper.get('.upload-area__tip').text()).toBe('业务类型限制')
})

test('upload message additions, deletions and translator removal restore the current language defaults', async () => {
  const messages = reactive<Record<string, string>>({})
  const locale = reactive<ComponentLocale>({ locale: 'en-US', messages })
  const wrapper = mount(Upload, {
    props: { defaultFileList: [file('error')] },
    global: { provide: { [COMPONENT_LOCALE_KEY as symbol]: locale } },
  })
  const status = () => wrapper.get('.file-list__meta .n-tag').text()
  expect(status()).toBe('Upload failed')
  messages['upload.status.error'] = 'Custom failure'
  messages['upload.retry'] = 'Retry this file'
  await nextTick()
  expect(status()).toBe('Custom failure')
  expect(wrapper.find('button[aria-label="Retry this file"]').exists()).toBe(
    true
  )
  locale.t = key => `translator:${key}`
  await nextTick()
  expect(status()).toBe('translator:upload.status.error')
  locale.t = undefined
  await nextTick()
  expect(status()).toBe('Custom failure')
  delete messages['upload.status.error']
  delete messages['upload.retry']
  await nextTick()
  expect(status()).toBe('Upload failed')
  expect(wrapper.find('button[aria-label="Retry upload"]').exists()).toBe(true)
  locale.locale = 'zh-CN'
  await nextTick()
  expect(status()).toBe('上传失败')
  messages['upload.status.error'] = ''
  await nextTick()
  expect(status()).toBe('')
  delete messages['upload.status.error']
  await nextTick()
  expect(status()).toBe('上传失败')
})
