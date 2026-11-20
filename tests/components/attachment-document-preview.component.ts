import { mount } from '@vue/test-utils'
import { expect, test, vi } from 'vitest'
import C_Attachments from '../../src/components/C_Attachments/index.vue'

test('附件文档路径复用真实预览器并固定 PDF 嵌入类型，切换时释放地址', async () => {
  const url = 'https://files.example/contract'
  const fetchFile = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response('%PDF-1.4\n', {
      headers: { 'Content-Type': 'text/plain' },
    })
  )
  const create = vi
    .spyOn(URL, 'createObjectURL')
    .mockReturnValue('blob:contract-pdf')
  const revoke = vi
    .spyOn(URL, 'revokeObjectURL')
    .mockImplementation(() => undefined)
  const wrapper = mount(C_Attachments, {
    props: { items: [{ id: 1, name: '合同.pdf', url }] },
  })

  expect(fetchFile).not.toHaveBeenCalled()
  await wrapper.get('.c-attachments__item').trigger('click')
  await vi.waitFor(() =>
    expect(wrapper.find('iframe[title="PDF预览"]').exists()).toBe(true)
  )
  expect(fetchFile).toHaveBeenCalledWith(url, {
    signal: expect.any(AbortSignal),
  })
  expect(create.mock.calls[0]?.[0]).toMatchObject({ type: 'application/pdf' })
  expect(wrapper.get('iframe').attributes('src')).toMatch(/^blob:contract-pdf#/)

  await wrapper.setProps({ items: [] })
  expect(wrapper.find('iframe').exists()).toBe(false)
  expect(revoke).toHaveBeenCalledWith('blob:contract-pdf')
})
