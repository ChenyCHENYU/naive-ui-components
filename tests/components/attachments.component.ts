import { flushPromises, mount } from '@vue/test-utils'
import { NSelect } from 'naive-ui'
import { describe, expect, test, vi } from 'vitest'
import { defineComponent, h, KeepAlive, ref } from 'vue'
import C_Attachments from '../../src/components/C_Attachments/index.vue'
import type { AttachmentItem } from '../../src/components/C_Attachments'

const { documentImports } = vi.hoisted(() => ({ documentImports: vi.fn() }))
vi.mock('../../src/components/C_FilePreview/index.vue', async () => {
  documentImports()
  const { defineComponent, h } = await import('vue')
  return {
    default: defineComponent({
      props: { fileName: String, inline: Boolean, url: String },
      setup: props => () =>
        h(
          'div',
          { 'data-preview-url': props.url, 'data-inline': props.inline },
          props.fileName
        ),
    }),
  }
})

const attachments: AttachmentItem[] = [
  {
    id: 0,
    name: '现场.webp',
    category: '质检',
    url: 'https://files.example/photo',
  },
  {
    id: '0',
    name: '报告.pdf',
    category: '质检',
    url: 'https://files.example/report',
  },
  {
    id: 'video',
    name: '操作.mp4',
    category: '生产',
    status: 'uploading',
    size: 0,
    percent: 64.2,
    url: 'https://files.example/video',
  },
]

describe('C_Attachments', () => {
  test('按稳定键切换，预览 PDF 时才加载文档模块，上传进度与分类同屏', async () => {
    const wrapper = mount(C_Attachments, { props: { items: attachments } })
    expect(wrapper.text()).toContain('选择附件后预览')
    expect(wrapper.find('input[aria-label="附件分类"]').exists()).toBe(true)
    await flushPromises()
    expect(documentImports).not.toHaveBeenCalled()

    const items = wrapper.findAll('.c-attachments__item')
    await items[0]!.trigger('click')
    expect(items[0]!.attributes('aria-current')).toBe('true')
    expect(wrapper.get('img').attributes('alt')).toBe('现场.webp')
    expect(wrapper.emitted('update:selectedKey')).toEqual([[0]])
    expect(documentImports).not.toHaveBeenCalled()

    await items[1]!.trigger('click')
    await flushPromises()
    expect(documentImports).toHaveBeenCalledOnce()
    expect(
      wrapper.get('[data-inline="true"]').attributes('data-preview-url')
    ).toBe('https://files.example/report')
    expect(wrapper.emitted('update:selectedKey')).toEqual([[0], ['0']])

    wrapper.getComponent(NSelect).vm.$emit('update:value', '生产')
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.c-attachments__item')).toHaveLength(1)
    expect(wrapper.text()).toContain('上传中64%')
    expect(wrapper.text()).toContain('0 B')
    expect(wrapper.find('[data-inline]').exists()).toBe(false)
    await wrapper.get('.c-attachments__item').trigger('click')
    expect(wrapper.get('video').attributes('controls')).toBeDefined()
    expect(wrapper.get('video').attributes('autoplay')).toBeUndefined()
  })

  test('授权动作交给宿主，非法地址不进入媒体元素，附件移除后旧预览消失', async () => {
    const entry = {
      id: 1,
      name: '危险源.png',
      url: 'javascript:alert(1)',
      orderId: 'ORDER-9',
    }
    const wrapper = mount(C_Attachments<typeof entry>, {
      props: {
        items: [entry],
        selectedKey: 1,
        uploadable: true,
        removable: true,
        downloadable: true,
      },
    })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toContain('此附件暂无预览')
    const button = (name: string) =>
      wrapper.findAll('button').find(item => item.text() === name)!
    await button('下载').trigger('click')
    await button('移除').trigger('click')
    await button('添加附件').trigger('click')
    expect(wrapper.emitted('download')).toEqual([[entry]])
    expect(wrapper.emitted('remove')).toEqual([[entry]])
    expect(wrapper.emitted('upload')).toEqual([[]])
    expect(wrapper.props('items')).toEqual([entry])
    await wrapper.setProps({ disabled: true })
    expect(button('下载').attributes('disabled')).toBeDefined()
    await wrapper.setProps({ items: [] })
    expect(wrapper.text()).toContain('暂无附件')
  })

  test('本地媒体只在展示期间持有 URL，并支持失效后重试', async () => {
    const file = new File(['audio'], '语音.wav', { type: 'audio/wav' })
    const create = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:voice-record')
    const revoke = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => undefined)
    const visible = ref(true)
    const local: AttachmentItem = { id: 1, name: file.name, file }
    const Host = defineComponent(
      () => () =>
        h(KeepAlive, null, {
          default: () =>
            visible.value
              ? h(C_Attachments, { items: [local], selectedKey: 1 })
              : h('p', '另一个页面'),
        })
    )
    const wrapper = mount(Host)
    await flushPromises()
    expect(create).toHaveBeenCalledWith(file)
    expect(wrapper.get('audio').attributes('src')).toBe('blob:voice-record')
    await wrapper.get('audio').trigger('error')
    expect(wrapper.get('[role="alert"]').text()).toContain('附件预览失败')
    await wrapper.get('[role="alert"] button').trigger('click')
    expect(wrapper.get('audio').attributes('src')).toBe('blob:voice-record')

    const audio = wrapper.get<HTMLAudioElement>('audio').element
    const pause = vi.spyOn(audio, 'pause')
    visible.value = false
    await flushPromises()
    expect(pause).toHaveBeenCalled()
    expect(revoke).toHaveBeenCalledWith('blob:voice-record')
    expect(wrapper.find('audio').exists()).toBe(false)
    visible.value = true
    await flushPromises()
    expect(wrapper.find('audio').exists()).toBe(true)
    expect(create).toHaveBeenCalledTimes(2)
  })
})
