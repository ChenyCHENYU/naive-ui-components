import {
  DOMWrapper,
  flushPromises,
  mount,
  type VueWrapper,
} from '@vue/test-utils'
import { NButton } from 'naive-ui'
import { expect, test, vi } from 'vitest'
import { nextTick, reactive, ref } from 'vue'
import C_ActionBar from '../../src/components/C_ActionBar/index.vue'
import {
  ACTION_PRESETS,
  resolveActionPreset,
} from '../../src/components/C_ActionBar/presets'
import C_FormModal from '../../src/components/C_FormModal/index.vue'
import type { FormModalEditor } from '../../src/components/C_FormModal/types'
import type { ComponentLocale } from '../../src/core/contracts'
import { COMPONENT_LOCALE_KEY } from '../../src/context'

const actionLabels = (wrapper: Pick<VueWrapper, 'findAllComponents'>) =>
  wrapper.findAllComponents(NButton).map(button => button.text())

function createEditor(): FormModalEditor<{ name: string }> {
  const model = ref<{ name: string } | null>({ name: '保留草稿' })
  return {
    visible: ref(true),
    mode: ref('create'),
    model,
    title: ref('Business title'),
    loading: ref(false),
    setModel: value => {
      model.value = value
    },
    close: () => {},
    submit: async () => false,
  }
}

test('操作栏默认语义文案随应用语言切换，公开预设保持原中文契约', async () => {
  const locale = reactive<ComponentLocale>({ locale: 'en-US' })
  const actions = Object.keys(ACTION_PRESETS).map(key => ({ key }))
  const wrapper = mount(C_ActionBar, {
    props: { actions },
    global: { provide: { [COMPONENT_LOCALE_KEY as symbol]: locale } },
  })
  expect(actionLabels(wrapper)).toEqual([
    'Add',
    'Add',
    'Save',
    'Confirm',
    'Cancel',
    'Close',
    'View',
    'Edit',
    'Delete',
    'Delete',
    'Refresh',
    'Import',
    'Export',
    'Print',
    'Reset',
    'Column settings',
    'Fullscreen',
    'Settings',
    'More',
  ])
  locale.locale = 'zh-CN'
  await nextTick()
  expect(actionLabels(wrapper)).toEqual(
    actions.map(action => resolveActionPreset(action).label)
  )
  expect(ACTION_PRESETS.confirm.label).toBe('确认')
  expect(resolveActionPreset({ key: 'save' }).label).toBe('保存')
  expect(actions).toEqual(Object.keys(ACTION_PRESETS).map(key => ({ key })))
})

test('操作栏复用应用消息与翻译器，业务文案及另一应用不受影响', async () => {
  const locale = reactive<ComponentLocale>({
    locale: 'en-US',
    messages: { 'common.save': 'Store draft' },
  })
  const actions = [
    { key: 'save' },
    { key: 'save-order', label: '提交订单' },
    { key: 'business-action' },
    {},
  ]
  const first = mount(C_ActionBar, {
    props: { actions },
    global: { provide: { [COMPONENT_LOCALE_KEY as symbol]: locale } },
  })
  const second = mount(C_ActionBar, { props: { actions } })
  expect(actionLabels(first)).toEqual([
    'Store draft',
    '提交订单',
    'business-action',
    'Action',
  ])
  expect(actionLabels(second)).toEqual([
    '保存',
    '提交订单',
    'business-action',
    '操作',
  ])
  locale.messages = { 'common.save': 'Persist draft' }
  await nextTick()
  expect(actionLabels(first)[0]).toBe('Persist draft')
  locale.t = key => `translated:${key}`
  await nextTick()
  expect(actionLabels(first)).toEqual([
    'translated:common.save',
    '提交订单',
    'business-action',
    'translated:common.action',
  ])
  expect(actionLabels(second)[0]).toBe('保存')
})

test('表单弹窗默认页脚复用应用及表单语言，业务文案保持优先', async () => {
  const locale = reactive<ComponentLocale>({ locale: 'en-US' })
  const editor = createEditor()
  const wrapper = mount(C_FormModal<{ name: string }>, {
    attachTo: document.body,
    props: { editor, options: [] },
    global: { provide: { [COMPONENT_LOCALE_KEY as symbol]: locale } },
  })
  await flushPromises()
  const footer = () => wrapper.getComponent(C_ActionBar)
  expect(actionLabels(footer())).toEqual(['Cancel', 'Create'])
  editor.mode.value = 'edit'
  await nextTick()
  expect(actionLabels(footer())).toEqual(['Cancel', 'Save'])
  locale.messages = { 'common.save': 'Store changes' }
  await nextTick()
  expect(actionLabels(footer())).toEqual(['Cancel', 'Store changes'])
  await wrapper.setProps({ config: { locale: { locale: 'zh-CN' } } })
  expect(actionLabels(footer())).toEqual(['取消', 'Store changes'])
  await wrapper.setProps({
    config: {
      locale: { messages: { 'common.save': '局部保存' } },
    },
  })
  expect(actionLabels(footer())).toEqual(['Cancel', '局部保存'])
  await wrapper.setProps({
    saveText: 'Approve order',
    cancelText: 'Keep draft',
  })
  locale.locale = 'zh-CN'
  await nextTick()
  expect(actionLabels(footer())).toEqual(['Keep draft', 'Approve order'])
  editor.mode.value = 'create'
  await wrapper.setProps({ createText: 'Create order' })
  expect(actionLabels(footer())).toEqual(['Keep draft', 'Create order'])
  expect(editor.model.value).toEqual({ name: '保留草稿' })
})

test('弹窗中文默认和显式空文案沿用既有回退，两个应用的页脚互不影响', async () => {
  const locale = reactive<ComponentLocale>({ locale: 'en-US' })
  const first = mount(C_FormModal<{ name: string }>, {
    attachTo: document.body,
    props: { editor: createEditor(), options: [] },
    global: { provide: { [COMPONENT_LOCALE_KEY as symbol]: locale } },
  })
  const second = mount(C_FormModal<{ name: string }>, {
    attachTo: document.body,
    props: { editor: createEditor(), options: [] },
  })
  await flushPromises()
  expect(actionLabels(first.getComponent(C_ActionBar))).toEqual([
    'Cancel',
    'Create',
  ])
  expect(actionLabels(second.getComponent(C_ActionBar))).toEqual([
    '取消',
    '创建',
  ])
  locale.locale = 'zh-CN'
  await nextTick()
  await first.setProps({ createText: '' })
  expect(actionLabels(first.getComponent(C_ActionBar))).toEqual([
    '取消',
    '新增',
  ])
  expect(actionLabels(second.getComponent(C_ActionBar))).toEqual([
    '取消',
    '创建',
  ])
})

test('弹窗显式空文案在局部语言中回退，不借用操作栏的应用语言', async () => {
  const editor = createEditor()
  const wrapper = mount(C_FormModal<{ name: string }>, {
    attachTo: document.body,
    props: {
      editor,
      options: [],
      config: { locale: { locale: 'zh-CN' } },
      createText: '',
      saveText: '',
      cancelText: '',
    },
    global: {
      provide: { [COMPONENT_LOCALE_KEY as symbol]: { locale: 'en-US' } },
    },
  })
  await flushPromises()
  const footer = () => wrapper.getComponent(C_ActionBar)
  expect(actionLabels(footer())).toEqual(['取消', '新增'])
  editor.mode.value = 'edit'
  await nextTick()
  expect(actionLabels(footer())).toEqual(['取消', '保存'])
  editor.mode.value = 'create'
  await wrapper.setProps({ createText: undefined })
  expect(actionLabels(footer())).toEqual(['取消', '创建'])
  await wrapper.setProps({
    createText: '',
    config: { locale: { messages: { 'common.add': '局部新增' } } },
  })
  expect(actionLabels(footer())).toEqual(['Cancel', '局部新增'])
})

test('弹窗草稿变化提示使用同一语言上下文', async () => {
  let release!: () => void
  const preparing = new Promise<void>(resolve => {
    release = resolve
  })
  const onSubmit = vi.fn(() => preparing)
  const editor = createEditor()
  const submit = vi.spyOn(editor, 'submit')
  editor.mode.value = 'edit'
  const locale = reactive<ComponentLocale>({ locale: 'en-US' })
  const wrapper = mount(C_FormModal<{ name: string }>, {
    attachTo: document.body,
    props: {
      editor,
      options: [{ type: 'input', prop: 'name' }],
      config: { onSubmit },
    },
    global: { provide: { [COMPONENT_LOCALE_KEY as symbol]: locale } },
  })
  await flushPromises()
  const body = new DOMWrapper(document.body)
  const save = wrapper.getComponent(C_ActionBar).findAllComponents(NButton)[1]
  await save.trigger('click')
  await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledOnce())
  await body.get('input').setValue('修改后的草稿')
  release()
  await flushPromises()
  expect(submit).not.toHaveBeenCalled()
  expect(body.get('[role="status"]').text()).toBe('Form changed. Save again.')
  locale.locale = 'zh-CN'
  await nextTick()
  expect(body.get('[role="status"]').text()).toBe('表单已修改，请重新保存。')
})
