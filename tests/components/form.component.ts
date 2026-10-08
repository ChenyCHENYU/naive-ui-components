/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-08
 * @FilePath: \naive-ui-components\tests\components\form.component.ts
 * @Description: 表单验证、重复提交、失败重试和卸载取消
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */
import { expect, test, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import C_Form from '../../src/components/C_Form/index.vue'
import type {
  FormRecord,
  SubmitEventPayload,
  FormSubmitContext,
} from '../../src/components/C_Form/types'

const fields = [
  { type: 'input' as const, prop: 'name', label: '姓名', required: true },
]
const button = (wrapper: ReturnType<typeof mount>, text: string) =>
  wrapper.findAll('button').find(item => item.text() === text)!

test('空值阻止提交，填写后重复点击只保存一次，结束后通知提交', async () => {
  let finish!: () => void
  const pending = new Promise<void>(resolve => {
    finish = resolve
  })
  const save = vi.fn(() => pending)
  const wrapper = mount(C_Form<FormRecord>, {
    props: {
      options: fields,
      modelValue: { name: '' },
      config: { submitText: '保存', onSubmit: save },
    },
  })
  await button(wrapper, '保存').trigger('click')
  await flushPromises()
  expect(save).not.toHaveBeenCalled()
  await wrapper.get('input').setValue('Alice')
  await button(wrapper, '保存').trigger('click')
  await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(1))
  await button(wrapper, '保存').trigger('click')
  await flushPromises()
  expect(save).toHaveBeenCalledTimes(1)
  expect(wrapper.emitted('submit')).toBeUndefined()
  finish()
  await flushPromises()
  expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
    model: { name: 'Alice' },
  })
})

test('保存失败不发成功事件，修复后可重试', async () => {
  const save = vi
    .fn()
    .mockRejectedValueOnce(new Error('保存失败'))
    .mockResolvedValueOnce(undefined)
  const wrapper = mount(C_Form<FormRecord>, {
    props: {
      options: fields,
      modelValue: { name: 'Alice' },
      config: { submitText: '保存', onSubmit: save },
    },
  })
  await button(wrapper, '保存').trigger('click')
  await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(1))
  await flushPromises()
  expect(wrapper.emitted('submit')).toBeUndefined()
  await button(wrapper, '保存').trigger('click')
  await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(2))
  await flushPromises()
  expect(wrapper.emitted('submit')).toHaveLength(1)
})

test('卸载终止保存上下文，迟到保存不能发提交通知', async () => {
  let finish!: () => void
  let signal: AbortSignal | undefined
  const save = vi.fn(
    (_data: SubmitEventPayload<FormRecord>, context?: FormSubmitContext) => {
      signal = context?.signal
      return new Promise<void>(resolve => {
        finish = resolve
      })
    }
  )
  const wrapper = mount(C_Form<FormRecord>, {
    props: {
      options: fields,
      modelValue: { name: 'Alice' },
      config: { submitText: '保存', onSubmit: save },
    },
  })
  await button(wrapper, '保存').trigger('click')
  await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(1))
  expect(signal?.aborted).toBe(false)
  wrapper.unmount()
  expect(signal?.aborted).toBe(true)
  finish()
  await flushPromises()
  expect(wrapper.emitted('submit')).toBeUndefined()
})
