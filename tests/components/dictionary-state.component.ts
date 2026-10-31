import { expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { NButton, NSelect, NTag } from 'naive-ui'
import { COMPONENT_FEEDBACK_KEY } from '../../src/context'
import type {
  DictionaryOption,
  DictionarySource,
  DictionaryState,
} from '../../src/core/dictionary'
import C_Form from '../../src/components/C_Form/index.vue'
import C_FormSearch from '../../src/components/C_FormSearch/index.vue'
import C_Table from '../../src/components/C_Table/index.vue'
import type { FormInstance } from '../../src/components/C_Form/types'

/** 模拟全状态订阅源：只保留一份数据，多个控件共享变化通知。 */
function stateSource() {
  let options: readonly DictionaryOption[] = [{ value: 0, label: '已有标签' }]
  let state: DictionaryState = { status: 'ready' }
  const listeners = new Set<() => void>()
  let complete!: (value: readonly DictionaryOption[]) => void
  const pending = new Promise<readonly DictionaryOption[]>(resolve => {
    complete = resolve
  })
  const publish = (next: DictionaryState, nextOptions = options) => {
    state = next
    options = nextOptions
    listeners.forEach(listener => listener())
  }
  const load = vi.fn(({ force }: { signal: AbortSignal; force?: boolean }) => {
    if (!force) return Promise.resolve(options)
    publish({ status: 'loading' })
    return pending
  })
  const source: DictionarySource = {
    getOptions: () => options,
    getState: () => ({ ...state, options }),
    load,
    subscribe: listener => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
  return { source, load, publish, listeners, complete }
}

test('表单/搜索/多列表格共享状态，就地失败与强制重试不弹提示、不清空原值', async () => {
  const fixture = stateSource()
  const errorFeedback = vi.fn()
  const form = mount(C_Form, {
    global: {
      provide: { [COMPONENT_FEEDBACK_KEY as symbol]: { error: errorFeedback } },
    },
    props: {
      options: [
        { type: 'select', prop: 'a', dictionary: fixture.source },
        { type: 'select', prop: 'b', dictionary: fixture.source },
        { type: 'input', prop: 'name', label: '名称', required: true },
      ],
      modelValue: { a: 0, b: 0, name: '' },
      config: { showActions: false },
    },
  })
  const search = mount(C_FormSearch<{ state: number | null }>, {
    attachTo: document.body,
    props: {
      modelValue: { state: 0 },
      formItemList: [
        {
          type: 'select',
          prop: 'state',
          dictionary: fixture.source,
          attrs: { show: true },
        },
      ],
    },
  })
  const table = mount(C_Table, {
    props: {
      columns: [
        { key: 'a', title: '甲', dictionary: fixture.source },
        { key: 'b', title: '乙', dictionary: fixture.source },
      ],
      data: [{ id: 1, a: 0, b: 0 }],
      config: { toolbar: { show: false }, pagination: false },
    },
  })
  await flushPromises()
  const originalSelect = form.findAllComponents(NSelect)[0]!.element
  const error = new Error('offline')
  fixture.publish({ status: 'error', error })
  fixture.publish({ status: 'error', error })
  await flushPromises()
  expect(form.findAll('.c-form-option-error')).toHaveLength(2)
  expect(form.findAllComponents(NSelect)[0]!.element).toBe(originalSelect)
  expect((form.vm as unknown as FormInstance).getDictionaryError('a')).toBe(
    error
  )
  expect(search.getComponent(NSelect).props('status')).toBe('error')
  expect(document.body.textContent).toContain('选项加载失败，保留已有选项')
  expect(table.findAll('.table-dictionary-state')).toHaveLength(1)
  expect(table.get('.table-dictionary-state').text()).toContain(
    '1 项字典加载失败'
  )
  expect(table.text()).toContain('已有标签')
  expect(table.findAllComponents(NTag)).toHaveLength(0)
  expect(errorFeedback).not.toHaveBeenCalled()
  await (form.vm as unknown as FormInstance).validate().catch(() => undefined)
  expect(form.text()).toContain('名称')
  expect(form.findAll('.c-form-option-error')).toHaveLength(2)

  const retry = form
    .findAllComponents(NButton)
    .find(button => button.text() === '重试')!
  await retry.trigger('click')
  await flushPromises()
  expect(fixture.load.mock.calls.at(-1)?.[0].force).toBe(true)
  expect(search.getComponent(NSelect).props('loading')).toBe(true)
  expect(table.get('.table-dictionary-state').text()).toContain(
    '正在加载字典（1 项）'
  )
  const updated = [{ value: 0, label: '更新标签' }]
  fixture.publish({ status: 'ready' }, updated)
  fixture.complete(updated)
  await flushPromises()
  expect(form.find('.c-form-option-error').exists()).toBe(false)
  expect(form.findAllComponents(NSelect)[0]!.element).toBe(originalSelect)
  expect(search.getComponent(NSelect).props('status')).toBeUndefined()
  expect(table.find('.table-dictionary-state').exists()).toBe(false)
  expect(table.text()).toContain('更新标签')
  expect((form.vm as unknown as FormInstance).getModel()).toMatchObject({
    a: 0,
    b: 0,
  })
  form.unmount()
  search.unmount()
  table.unmount()
  expect(fixture.listeners.size).toBe(0)
})

test('字典数组列逐项显示，普通枚举不附加状态标签', async () => {
  const row = { id: 1, values: [0, false, 'unknown'] }
  const wrapper = mount(C_Table, {
    props: {
      columns: [
        {
          key: 'values',
          title: '枚举',
          dictionary: {
            getOptions: () => [
              { value: 0, label: '零' },
              { value: false, label: '否' },
            ],
          },
        },
      ],
      data: [row],
      config: { toolbar: { show: false }, pagination: false },
    },
  })
  await flushPromises()
  expect(wrapper.text()).toContain('零、否、unknown')
  expect(wrapper.findAllComponents(NTag)).toHaveLength(0)
  expect(row.values).toEqual([0, false, 'unknown'])
  wrapper.unmount()
})

test('空字典复用不可变快照时，失败与恢复仍更新菜单并保留原生空态', async () => {
  const fixture = stateSource()
  fixture.publish({ status: 'empty' }, [])
  const wrapper = mount(C_FormSearch<{ state: number | null }>, {
    attachTo: document.body,
    props: {
      modelValue: { state: null },
      formItemList: [
        {
          type: 'select',
          prop: 'state',
          dictionary: fixture.source,
          attrs: { show: true },
        },
      ],
    },
  })
  await flushPromises()
  expect(
    document.body.querySelector('.n-base-select-menu__empty .n-empty')
  ).not.toBeNull()
  fixture.publish({ status: 'error', error: new Error('offline') })
  await flushPromises()
  expect(document.body.textContent).toContain('选项加载失败')
  expect(document.body.querySelector('.n-base-select-menu__action')).toBeNull()
  fixture.publish({ status: 'empty' })
  await flushPromises()
  expect(document.body.querySelector('.form-search-option-error')).toBeNull()
  expect(
    document.body.querySelector('.n-base-select-menu__empty .n-empty')
  ).not.toBeNull()
  wrapper.unmount()
})
