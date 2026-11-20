import {
  DOMWrapper,
  flushPromises,
  mount,
  type VueWrapper,
} from '@vue/test-utils'
import { NButton, NModal } from 'naive-ui'
import { expect, test, vi } from 'vitest'
import { defineComponent, h, nextTick, ref, shallowRef } from 'vue'
import C_ActionBar from '../../src/components/C_ActionBar/index.vue'
import C_FormModal from '../../src/components/C_FormModal/index.vue'
import type {
  FormModalEditor,
  FormModalInstance,
  FormModalProps,
} from '../../src/components/C_FormModal/types'
import { FORM_GLOBAL_CONFIG_KEY } from '../../src/context'

interface Draft {
  name: string
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => {
    resolve = done
  })
  return { promise, resolve }
}

function createEditor() {
  const visible = ref(true)
  const model = ref<Draft | null>({ name: '待保存' })
  return {
    visible,
    model,
    mode: ref<'create' | 'edit'>('edit'),
    title: ref('编辑记录'),
    loading: ref(false),
    setModel: value => {
      model.value = value
    },
    close: vi.fn(() => {
      visible.value = false
      model.value = null
    }),
    submit: vi.fn<FormModalEditor<Draft>['submit']>(async () => true),
  } satisfies FormModalEditor<Draft>
}

const mountModal = (
  editor: FormModalEditor<Draft>,
  extra?: Partial<FormModalProps<Draft>>
) =>
  mount(C_FormModal<Draft>, {
    attachTo: document.body,
    props: { editor, options: [{ type: 'input', prop: 'name' }], ...extra },
  })

function button(wrapper: Pick<VueWrapper, 'getComponent'>, text: string) {
  const result = wrapper
    .getComponent(C_ActionBar)
    .findAllComponents(NButton)
    .find(item => item.text() === text)
  if (!result) throw new Error(`缺少按钮 ${text}`)
  return result
}

test('异步校验与保存共用关闭保护，失败时保留草稿并允许重试', async () => {
  const editor = createEditor()
  const validation = deferred<void>()
  const validator = vi.fn(() => validation.promise)
  const preparing = deferred<void>()
  const onSubmit = vi.fn(() => preparing.promise)
  const saving = deferred<boolean>()
  const success = vi.fn()
  editor.submit.mockImplementation(async () => {
    editor.loading.value = true
    try {
      return await saving.promise
    } finally {
      editor.loading.value = false
    }
  })
  const wrapper = mountModal(editor)
  await wrapper.setProps({
    options: [{ type: 'input', prop: 'name', rules: [{ validator }] }],
    config: { onSubmit, submitSuccessText: '已保存', feedback: { success } },
  })
  const modal = wrapper.getComponent(NModal)
  const body = new DOMWrapper(document.body)
  const input = body.get('input')
  const verifyLocked = async () => {
    expect(modal.props()).toMatchObject({
      closable: false,
      closeOnEsc: false,
      maskClosable: false,
    })
    expect(body.find('.n-base-close').exists()).toBe(false)
    expect(button(wrapper, '取消').props('disabled')).toBe(true)
    await body.get('.n-modal-mask').trigger('click')
    await body.trigger('keydown', { key: 'Escape', code: 'Escape' })
    await button(wrapper, '取消').trigger('click')
    // 延迟到达的原生关闭事件也必须经过同一保护。
    modal.vm.$emit('update:show', false)
    expect(editor.close).not.toHaveBeenCalled()
    expect(editor.visible.value).toBe(true)
  }

  await button(wrapper, '保存').trigger('click')
  await vi.waitFor(() => expect(validator).toHaveBeenCalledOnce())
  expect(editor.loading.value).toBe(false)
  expect(input.element.disabled).toBe(false)
  await verifyLocked()
  validation.resolve()
  await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledOnce())
  expect(editor.submit).not.toHaveBeenCalled()
  expect(input.element.disabled).toBe(false)
  expect(body.get('form').attributes('inert')).toBeUndefined()
  preparing.resolve()
  await vi.waitFor(() => expect(editor.submit).toHaveBeenCalledOnce())
  expect(input.element.disabled).toBe(true)
  expect(body.get('form').element.hasAttribute('inert')).toBe(true)
  await verifyLocked()
  saving.resolve(false)
  await flushPromises()

  expect(wrapper.emitted('submit')).toEqual([
    [expect.objectContaining({ model: { name: '待保存' } }), false],
  ])
  expect(success).not.toHaveBeenCalled()
  expect(editor.model.value).toEqual({ name: '待保存' })
  expect(input.element.disabled).toBe(false)
  expect(body.get('form').attributes('inert')).toBeUndefined()
  await input.setValue('失败后重新编辑')
  expect(editor.model.value).toEqual({ name: '失败后重新编辑' })
  expect(modal.props()).toMatchObject({
    closable: true,
    closeOnEsc: true,
    maskClosable: true,
  })
  await body.get('.n-base-close').trigger('click')
  expect(editor.close).toHaveBeenCalledOnce()
  expect(wrapper.emitted('close')).toHaveLength(1)
})

test('提交前钩子等待期间修改草稿时保留新值，重试仍可转换提交值', async () => {
  const editor = createEditor()
  const preparing = deferred<void>()
  const onSubmit = vi.fn(async ({ model }: { model: Draft }) => {
    model.name = model.name.trim()
    await preparing.promise
  })
  editor.submit.mockImplementation(async () => {
    editor.close()
    return true
  })
  const wrapper = mountModal(editor)
  await wrapper.setProps({ config: { onSubmit } })
  const body = new DOMWrapper(document.body)

  await button(wrapper, '保存').trigger('click')
  await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledOnce())
  const input = body.get('input')
  expect(input.element.disabled).toBe(false)
  await input.setValue(' 新草稿 ')
  preparing.resolve()
  await flushPromises()

  expect(editor.submit).not.toHaveBeenCalled()
  expect(editor.visible.value).toBe(true)
  expect(editor.model.value).toEqual({ name: ' 新草稿 ' })
  expect(wrapper.emitted('submit')).toBeUndefined()
  expect(body.get('[role="status"]').text()).toBe('表单已修改，请重新保存。')

  await button(wrapper, '保存').trigger('click')
  await flushPromises()
  expect(editor.submit).toHaveBeenCalledExactlyOnceWith({ name: '新草稿' })
  expect(editor.visible.value).toBe(false)
  expect(wrapper.emitted('submit')).toEqual([
    [expect.objectContaining({ model: { name: '新草稿' } }), true],
  ])
})

test('编辑器保存成功并先自行关闭时，通知结果并使用全局表单反馈', async () => {
  const editor = createEditor()
  const success = vi.fn()
  editor.submit.mockImplementation(async () => {
    editor.close()
    return true
  })
  const wrapper = mount(C_FormModal<Draft>, {
    attachTo: document.body,
    props: { editor, options: [{ type: 'input', prop: 'name' }] },
    global: {
      provide: {
        [FORM_GLOBAL_CONFIG_KEY]: {
          submitSuccessText: '已保存',
          feedback: { success },
        },
      },
    },
  })
  await button(wrapper, '保存').trigger('click')
  await flushPromises()

  expect(editor.visible.value).toBe(false)
  expect(wrapper.emitted('submit')).toEqual([
    [expect.objectContaining({ model: { name: '待保存' } }), true],
  ])
  expect(success).toHaveBeenCalledExactlyOnceWith('已保存', undefined)
  expect(wrapper.emitted('close')).toBeUndefined()
})

test('只保护脏草稿，同一次确认期间统一拦截退出与保存', async () => {
  const editor = createEditor()
  const first = deferred<boolean>()
  const beforeClose = vi
    .fn<NonNullable<FormModalProps<Draft>['beforeClose']>>()
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(true)
  const wrapper = mountModal(editor, { beforeClose })
  const modal = wrapper.getComponent(NModal)
  const body = new DOMWrapper(document.body)
  await flushPromises()
  await body.get('input').setValue('已编辑')
  await body.get('.n-base-close').trigger('click')
  await vi.waitFor(() => expect(beforeClose).toHaveBeenCalledOnce())
  expect(modal.props()).toMatchObject({
    closable: false,
    closeOnEsc: false,
    maskClosable: false,
  })
  expect(body.get('form').element.hasAttribute('inert')).toBe(true)
  expect(button(wrapper, '保存').props('disabled')).toBe(true)
  modal.vm.$emit('update:show', false)
  await button(wrapper, '取消').trigger('click')
  expect(beforeClose).toHaveBeenCalledOnce()
  expect(editor.close).not.toHaveBeenCalled()

  first.resolve(false)
  await flushPromises()
  expect(body.get('input').element.value).toBe('已编辑')
  expect(body.get('form').element.hasAttribute('inert')).toBe(false)
  const mask = body.get('.n-modal-mask')
  await mask.trigger('mousedown')
  await mask.trigger('mouseup')
  await flushPromises()
  expect(beforeClose).toHaveBeenCalledTimes(2)
  expect(editor.close).toHaveBeenCalledOnce()
  expect(wrapper.emitted('close')).toHaveLength(1)

  editor.model.value = { name: '干净草稿' }
  editor.visible.value = true
  await flushPromises()
  await button(wrapper, '取消').trigger('click')
  expect(editor.close).toHaveBeenCalledTimes(2)
  expect(beforeClose).toHaveBeenCalledTimes(2)
})

test('确认失败保留草稿，保存成功自行关闭不进入守卫', async () => {
  const editor = createEditor()
  const beforeClose = vi.fn(async () => {
    throw new Error('确认服务不可用')
  })
  editor.submit.mockImplementation(async () => {
    editor.close()
    return true
  })
  const wrapper = mountModal(editor, { beforeClose })
  await flushPromises()
  await new DOMWrapper(document.body).get('input').setValue('将保存')
  await button(wrapper, '取消').trigger('click')
  await flushPromises()
  expect(editor.visible.value).toBe(true)
  expect(editor.model.value?.name).toBe('将保存')
  expect(wrapper.emitted('close')).toBeUndefined()
  await button(wrapper, '保存').trigger('click')
  await flushPromises()
  expect(editor.close).toHaveBeenCalledOnce()
  expect(beforeClose).toHaveBeenCalledOnce()
  expect(wrapper.emitted('submit')).toEqual([
    [expect.objectContaining({ model: { name: '将保存' } }), true],
  ])
})

test.each([
  '替换草稿',
  '修改草稿',
  '更换会话键',
  '进入加载状态',
  '重新打开',
  '替换编辑器',
  '卸载弹窗',
])('%s 会取消旧的丢弃决定，迟到同意不执行动作', async change => {
  const editor = createEditor()
  const decision = deferred<boolean>()
  const beforeClose = vi
    .fn<NonNullable<FormModalProps<Draft>['beforeClose']>>()
    .mockReturnValue(decision.promise)
  const activeEditor = shallowRef<FormModalEditor<Draft>>(editor)
  const activeModal = shallowRef<FormModalInstance>()
  const sessionKey = ref('one')
  const host = mount(
    defineComponent(
      () => () =>
        h(C_FormModal<Draft>, {
          ref: activeModal,
          editor: activeEditor.value,
          options: [{ type: 'input', prop: 'name' }],
          beforeClose,
          sessionKey: sessionKey.value,
        })
    ),
    { attachTo: document.body }
  )
  await flushPromises()
  await new DOMWrapper(document.body).get('input').setValue('已修改')
  const replacement = vi.fn()
  const waiting = activeModal.value!.requestDiscard(replacement)
  await vi.waitFor(() => expect(beforeClose).toHaveBeenCalledOnce())
  const [{ signal }] = beforeClose.mock.calls[0]

  if (change === '替换草稿') editor.model.value = { name: '新草稿' }
  else if (change === '修改草稿') editor.model.value!.name = '新草稿'
  else if (change === '更换会话键') sessionKey.value = 'two'
  else if (change === '进入加载状态') editor.loading.value = true
  else if (change === '重新打开') {
    editor.visible.value = false
    editor.visible.value = true
  } else if (change === '替换编辑器') {
    activeEditor.value = createEditor()
  } else host.unmount()

  await nextTick()
  expect(signal.aborted).toBe(true)
  await expect(waiting).resolves.toBe(false)
  decision.resolve(true)
  await flushPromises()
  expect(replacement).not.toHaveBeenCalled()
  expect(editor.close).not.toHaveBeenCalled()
})

test('批准切换记录后更新会话键，替换的记录以干净草稿开始', async () => {
  const editor = createEditor()
  const beforeClose = vi.fn(async () => true)
  const wrapper = mountModal(editor, { beforeClose, sessionKey: 'one' })
  const body = new DOMWrapper(document.body)
  await flushPromises()
  await body.get('input').setValue('已修改')

  await expect(
    wrapper.vm.requestDiscard(() => {
      editor.model.value = { name: '新记录' }
      void wrapper.setProps({ sessionKey: 'two' })
    })
  ).resolves.toBe(true)
  await flushPromises()
  expect(body.get('input').element.value).toBe('新记录')
  expect(beforeClose).toHaveBeenCalledOnce()

  await button(wrapper, '取消').trigger('click')
  expect(editor.close).toHaveBeenCalledOnce()
  expect(beforeClose).toHaveBeenCalledOnce()
})

test.each(['重新打开', '替换编辑器', '卸载弹窗'])(
  '%s 后忽略旧保存的迟到结果',
  async change => {
    const editor = createEditor()
    const saving = deferred<boolean>()
    const replacementSaving = deferred<boolean>()
    const success = vi.fn()
    editor.submit.mockReturnValue(saving.promise)
    const activeEditor = shallowRef<FormModalEditor<Draft>>(editor)
    const host = mount(
      defineComponent(
        () => () =>
          h(C_FormModal<Draft>, {
            editor: activeEditor.value,
            options: [{ type: 'input', prop: 'name' }],
            config: { submitSuccessText: '已保存', feedback: { success } },
          })
      ),
      { attachTo: document.body }
    )
    const wrapper = host.getComponent(C_FormModal<Draft>)
    const body = new DOMWrapper(document.body)
    await button(wrapper, '保存').trigger('click')
    await vi.waitFor(() => expect(editor.submit).toHaveBeenCalledOnce())
    expect(editor.loading.value).toBe(false)
    expect(body.get('input').element.disabled).toBe(true)

    if (change === '重新打开') {
      editor.close()
      editor.model.value = { name: '新草稿' }
      editor.visible.value = true
      await flushPromises()
      await vi.waitFor(() =>
        expect(button(wrapper, '保存').props('loading')).toBe(false)
      )
      expect(body.get('input').element.disabled).toBe(false)
    } else if (change === '替换编辑器') {
      const replacement = createEditor()
      replacement.submit.mockReturnValue(replacementSaving.promise)
      activeEditor.value = replacement
      await nextTick()
      await vi.waitFor(() =>
        expect(button(wrapper, '保存').props('loading')).toBe(false)
      )
      expect(body.get('input').element.disabled).toBe(false)
      await button(wrapper, '保存').trigger('click')
      await vi.waitFor(() => expect(replacement.submit).toHaveBeenCalledOnce())
    } else {
      host.unmount()
    }

    saving.resolve(true)
    await flushPromises()
    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(success).not.toHaveBeenCalled()
    if (change === '替换编辑器') {
      expect(body.get('input').element.disabled).toBe(true)
      replacementSaving.resolve(false)
      await flushPromises()
      expect(body.get('input').element.disabled).toBe(false)
    }
  }
)
