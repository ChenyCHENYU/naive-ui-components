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
import type { FormModalEditor } from '../../src/components/C_FormModal/types'
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

const mountModal = (editor: FormModalEditor<Draft>) =>
  mount(C_FormModal<Draft>, {
    attachTo: document.body,
    props: { editor, options: [{ type: 'input', prop: 'name' }] },
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
