import { expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { NButton, NDropdown, NSelect } from 'naive-ui'
import FormSearchComponent from '../../src/components/C_FormSearch/index.vue'
import C_ActionBar from '../../src/components/C_ActionBar/index.vue'
import type {
  SearchFormParams,
  FormSearchExpose,
} from '../../src/components/C_FormSearch/types'
import type { ActionItem } from '../../src/components/C_ActionBar/types'

// Vue Test Utils 的 mount/h 使用显式动态模型；业务推导由 consumer SFC 夹具覆盖。
const C_FormSearch = FormSearchComponent<SearchFormParams>

const deferred = () => {
  let resolve!: () => void
  let reject!: (error: unknown) => void
  const promise = new Promise<void>((accept, decline) => {
    resolve = accept
    reject = decline
  })
  return { promise, resolve, reject }
}

test('search locks validation and request as one task and honors external loading', async () => {
  let release!: () => void
  const onSearch = vi.fn(
    () =>
      new Promise<void>(resolve => {
        release = resolve
      })
  )
  const wrapper = mount(C_FormSearch, {
    props: {
      formItemList: [{ type: 'input', prop: 'name' }],
      modelValue: { name: 'first' },
      config: { onSearch },
    },
  })
  const first = wrapper.vm.searchFn()
  const duplicate = wrapper.vm.searchFn()
  await flushPromises()
  expect(await duplicate).toBe(false)
  expect(onSearch).toHaveBeenCalledTimes(1)
  expect(wrapper.findAllComponents(NButton)[0].props('loading')).toBe(true)
  release()
  expect(await first).toBe(true)
  await wrapper.setProps({ loading: true })
  expect(await wrapper.vm.searchFn()).toBe(false)
  expect(onSearch).toHaveBeenCalledTimes(1)
})

test('search validates configured rules before emitting or executing a request', async () => {
  const onSearch = vi.fn()
  const wrapper = mount(C_FormSearch, {
    props: {
      formItemList: [
        {
          type: 'input',
          prop: 'name',
          rules: [{ min: 3, message: 'too short' }],
        },
      ],
      modelValue: { name: 'x' },
      config: { onSearch },
    },
  })
  expect(await wrapper.vm.searchFn()).toBe(false)
  expect(wrapper.emitted('search')).toBeUndefined()
  expect(onSearch).not.toHaveBeenCalled()
  await wrapper.setProps({ modelValue: { name: 'valid' } })
  expect(await wrapper.vm.searchFn()).toBe(true)
  expect(onSearch).toHaveBeenCalledWith({ name: 'valid' })
})

test('search never dispatches after unmount while async field validation is pending', async () => {
  const validation = deferred()
  const validate = vi.fn(() => validation.promise)
  const onSearch = vi.fn()
  const wrapper = mount(C_FormSearch, {
    props: {
      formItemList: [
        { type: 'input', prop: 'name', rules: [{ asyncValidator: validate }] },
      ],
      modelValue: { name: 'validated' },
      config: { onSearch },
    },
  })
  const pending = wrapper.vm.searchFn()
  expect(validate).toHaveBeenCalledTimes(1)
  wrapper.unmount()
  validation.resolve()
  expect(await pending).toBe(false)
  expect(wrapper.emitted('search')).toBeUndefined()
  expect(onSearch).not.toHaveBeenCalled()
})

test('search rejects values edited during async validation and accepts equal v-model echoes', async () => {
  let validation = deferred()
  const validate = vi.fn(() => validation.promise)
  const onSearch = vi.fn()
  const wrapper = mount(C_FormSearch, {
    props: {
      formItemList: [
        { type: 'input', prop: 'name', rules: [{ asyncValidator: validate }] },
      ],
      modelValue: { name: 'validated' },
      config: { onSearch },
    },
  })
  const stale = wrapper.vm.searchFn()
  await wrapper.setProps({ modelValue: { name: 'unvalidated edit' } })
  validation.resolve()
  expect(await stale).toBe(false)
  expect(wrapper.emitted('search')).toBeUndefined()
  expect(onSearch).not.toHaveBeenCalled()

  validation = deferred()
  const current = wrapper.vm.searchFn()
  await wrapper.setProps({ modelValue: { name: 'unvalidated edit' } })
  validation.resolve()
  expect(await current).toBe(true)
  expect(onSearch).toHaveBeenCalledExactlyOnceWith({ name: 'unvalidated edit' })
})

test('search rechecks external loading after async validation', async () => {
  const validation = deferred()
  const onSearch = vi.fn()
  const wrapper = mount(C_FormSearch, {
    props: {
      formItemList: [
        {
          type: 'input',
          prop: 'name',
          rules: [{ asyncValidator: () => validation.promise }],
        },
      ],
      modelValue: { name: 'validated' },
      config: { onSearch },
    },
  })
  const pending = wrapper.vm.searchFn()
  await wrapper.setProps({ loading: true })
  validation.resolve()
  expect(await pending).toBe(false)
  expect(wrapper.emitted('search')).toBeUndefined()
  expect(onSearch).not.toHaveBeenCalled()
})

test('search request failures produce no component feedback after unmount', async () => {
  const request = deferred()
  const error = vi.fn()
  const onSearch = vi.fn(() => request.promise)
  const wrapper = mount(C_FormSearch, {
    props: {
      formItemList: [{ type: 'input', prop: 'name' }],
      modelValue: { name: 'validated' },
      config: { onSearch, feedback: { error } },
    },
  })
  const pending = wrapper.vm.searchFn()
  await flushPromises()
  expect(onSearch).toHaveBeenCalledTimes(1)
  wrapper.unmount()
  request.reject(new Error('late request failure'))
  expect(await pending).toBe(false)
  expect(error).not.toHaveBeenCalled()
})

test('native form submissions used by Enter prevent navigation and share the search lock', async () => {
  const request = deferred()
  const onSearch = vi.fn(() => request.promise)
  const wrapper = mount(C_FormSearch, {
    props: {
      formItemList: [{ type: 'input', prop: 'name' }],
      modelValue: { name: 'validated' },
      config: { onSearch },
    },
  })
  await wrapper.get('input').trigger('keydown', { key: 'Enter' })
  // Happy DOM does not synthesize Enter's implicit form submission.
  const submit = new Event('submit', { bubbles: true, cancelable: true })
  wrapper.get('form').element.dispatchEvent(submit)
  wrapper
    .get('form')
    .element.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    )
  await flushPromises()
  expect(submit.defaultPrevented).toBe(true)
  expect(onSearch).toHaveBeenCalledExactlyOnceWith({ name: 'validated' })
  expect(wrapper.emitted('search')).toHaveLength(1)
  request.resolve()
  await flushPromises()
})

test('reset publishes one final model before its compatible reset notification', async () => {
  const search = ref<FormSearchExpose<SearchFormParams> | null>(null)
  const model = ref<SearchFormParams>({
    name: 'old',
    status: 'active',
    pageNum: 8,
    pageSize: 10,
  })
  const snapshots: SearchFormParams[] = []
  const onSearch = vi.fn()
  const updates: SearchFormParams[] = []
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(C_FormSearch, {
          ref: search,
          formItemList: [
            { type: 'input', prop: 'name', defaultValue: 'default' },
          ],
          modelValue: model.value,
          'onUpdate:modelValue': value => {
            updates.push(value)
            model.value = value
          },
          config: { onSearch },
          onReset: params => {
            snapshots.push({ ...model.value })
            expect(params).toEqual(model.value)
          },
        }),
    })
  )
  search.value?.cleanFn()
  const expected = {
    name: 'default',
    status: 'active',
    pageNum: 8,
    pageSize: 10,
  }
  expect(model.value).toEqual(expected)
  expect(snapshots).toEqual([expected])
  await nextTick()
  await nextTick()
  expect(updates).toEqual([expected])
  expect(onSearch).not.toHaveBeenCalled()
  wrapper.unmount()
})

test('ActionBar retains the same task lock when same-key action objects are replaced', async () => {
  let release!: () => void
  const onClick = vi.fn(
    () =>
      new Promise<void>(resolve => {
        release = resolve
      })
  )
  const createAction = (): ActionItem => ({
    key: 'save',
    onClick,
    buttonProps: { loading: false, disabled: false },
  })
  const wrapper = mount(C_ActionBar, { props: { actions: [createAction()] } })
  await wrapper.get('button').trigger('click')
  expect(onClick).toHaveBeenCalledTimes(1)
  await wrapper.setProps({ actions: [{ ...createAction(), group: 'right' }] })
  expect(wrapper.getComponent(NButton).props('loading')).toBe(true)
  expect(wrapper.getComponent(NButton).props('disabled')).toBe(true)
  await wrapper.get('button').trigger('click')
  expect(onClick).toHaveBeenCalledTimes(1)
  release()
  await flushPromises()
  expect(wrapper.getComponent(NButton).props('loading')).toBe(false)
})

test('duplicate action keys share a lock and native button click observers preserve the executor', async () => {
  let release!: () => void
  const nativeClick = vi.fn()
  const onClick = vi.fn(
    () =>
      new Promise<void>(resolve => {
        release = resolve
      })
  )
  const wrapper = mount(C_ActionBar, {
    props: {
      actions: [
        {
          key: 'save',
          onClick,
          autoLoading: false,
          buttonProps: { onClick: nativeClick },
        },
        { key: 'save', onClick },
      ],
    },
  })
  await wrapper.findAll('button')[0].trigger('click')
  await wrapper.findAll('button')[1].trigger('click')
  expect(onClick).toHaveBeenCalledTimes(1)
  expect(nativeClick).toHaveBeenCalledTimes(1)
  expect(wrapper.emitted('action-click')).toHaveLength(1)
  expect(wrapper.findAllComponents(NButton)[0].props('loading')).toBe(false)
  expect(wrapper.findAllComponents(NButton)[0].props('disabled')).toBe(true)
  release()
  await flushPromises()
})

test('dropdown actions share locking, visibility and disabled guards with regular actions', async () => {
  let release!: () => void
  const onClick = vi.fn(
    () =>
      new Promise<void>(resolve => {
        release = resolve
      })
  )
  const wrapper = mount(C_ActionBar, {
    props: {
      actions: [
        {
          key: 'more',
          dropdown: [
            { key: 'export', label: 'Export', onClick },
            { key: 'blocked', label: 'Blocked', disabled: true, onClick },
            { key: 'hidden', label: 'Hidden', show: false, onClick },
          ],
        },
      ],
    },
  })
  const dropdown = wrapper.getComponent(NDropdown)
  dropdown.vm.$emit('select', 'blocked')
  dropdown.vm.$emit('select', 'hidden')
  dropdown.vm.$emit('select', 'export')
  dropdown.vm.$emit('select', 'export')
  await nextTick()
  expect(onClick).toHaveBeenCalledTimes(1)
  expect(wrapper.emitted('dropdown-click')).toHaveLength(1)
  expect(wrapper.getComponent(NButton).props('loading')).toBe(true)
  release()
  await flushPromises()
  await wrapper.setProps({
    actions: [
      {
        key: 'more',
        disabled: true,
        dropdown: [{ key: 'export', label: 'Export', onClick }],
      },
    ],
  })
  dropdown.vm.$emit('select', 'export')
  expect(onClick).toHaveBeenCalledTimes(1)
})

test('action failures notify consumers and remain visible to Vue error handling', async () => {
  const cause = new Error('request failed')
  const errors = vi.fn()
  const wrapper = mount(C_ActionBar, {
    props: {
      actions: [
        {
          key: 'save',
          onClick: async () => {
            throw cause
          },
        },
      ],
    },
    global: { config: { errorHandler: errors } },
  })
  await wrapper.get('button').trigger('click')
  await flushPromises()
  expect(wrapper.emitted('action-error')?.[0][0]).toBe(cause)
  expect(errors).toHaveBeenCalledWith(
    cause,
    expect.anything(),
    expect.any(String)
  )
  expect(wrapper.getComponent(NButton).props('disabled')).toBe(false)
})

test('ActionBar updates compact spacing in inline mode and preserves explicit gaps', async () => {
  const wrapper = mount(C_ActionBar, {
    props: { actions: [{ key: 'add' }, { key: 'export' }] },
  })
  expect(wrapper.get('.actions-group').attributes('style')).toContain(
    'gap: 6px'
  )
  await wrapper.setProps({ config: { compact: false } })
  expect(wrapper.get('.actions-group').attributes('style')).toContain(
    'gap: 12px'
  )
  await wrapper.setProps({ config: { compact: true, gap: 9 } })
  expect(wrapper.get('.actions-group').attributes('style')).toContain(
    'gap: 9px'
  )
  await wrapper.setProps({ config: { compact: false, gap: 0 } })
  expect(wrapper.get('.actions-group').attributes('style')).toContain(
    'gap: 0px'
  )
  wrapper.unmount()
})

test('ActionBar keeps normal and primary button sizes consistent and follows runtime size changes', async () => {
  const wrapper = mount(C_ActionBar, {
    props: {
      actions: [{ key: 'refresh' }, { key: 'export', type: 'primary' }],
      config: { size: 'tiny' },
    },
  })
  expect(
    wrapper.findAllComponents(NButton).map(button => button.props('size'))
  ).toEqual(['tiny', 'tiny'])
  await wrapper.setProps({ config: { size: 'small' } })
  expect(
    wrapper.findAllComponents(NButton).map(button => button.props('size'))
  ).toEqual(['small', 'small'])
  await wrapper.setProps({
    actions: [
      { key: 'export', size: 'medium', buttonProps: { size: 'large' } },
    ],
  })
  expect(wrapper.getComponent(NButton).props('size')).toBe('large')
  expect(wrapper.get('.c-icon').attributes('style')).toContain('18px')
  wrapper.unmount()
})

test('search selects retain arrays and round-trip boolean values without changing business types', async () => {
  const onSearch = vi.fn()
  const wrapper = mount(C_FormSearch, {
    props: {
      modelValue: { roles: ['admin', 0], enabled: false },
      formItemList: [
        {
          type: 'select',
          prop: 'roles',
          attrs: { multiple: true },
          list: [
            { label: '管理员', value: 'admin' },
            { label: '访客', value: 0 },
          ],
        },
        {
          type: 'select',
          prop: 'enabled',
          list: [
            { label: '启用', value: true },
            { label: '停用', value: false },
          ],
        },
      ],
      config: { onSearch },
    },
  })
  const [roles, enabled] = wrapper.findAllComponents(NSelect)
  expect(roles.props('value')).toEqual(['admin', 0])
  expect(enabled.text()).toContain('停用')
  expect(typeof enabled.props('value')).toBe('string')
  expect(await wrapper.vm.searchFn()).toBe(true)
  expect(onSearch).toHaveBeenLastCalledWith({
    roles: ['admin', 0],
    enabled: false,
  })

  const options = enabled.props('options')!
  enabled.vm.$emit('update:value', options[0].value, options[0])
  roles.vm.$emit('update:value', [0], [])
  await nextTick()
  expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toEqual({
    roles: [0],
    enabled: true,
  })
  expect(await wrapper.vm.searchFn()).toBe(true)
  expect(onSearch).toHaveBeenLastCalledWith({ roles: [0], enabled: true })

  await wrapper.setProps({ modelValue: { roles: ['admin'], enabled: false } })
  expect(roles.props('value')).toEqual(['admin'])
  expect(enabled.text()).toContain('停用')
  roles.vm.$emit('update:value', [], [])
  enabled.vm.$emit('update:value', null, null)
  await nextTick()
  expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toEqual({
    roles: [],
    enabled: null,
  })
})

test('search boolean encoding keeps false, zero and conflicting string options distinct in multiple mode', async () => {
  const collision = '__c_form_search_boolean_false__'
  const wrapper = mount(C_FormSearch, {
    props: {
      modelValue: { flags: [false, 0, collision, true] },
      formItemList: [
        {
          type: 'select',
          prop: 'flags',
          attrs: { multiple: true },
          defaultValue: [false],
          list: [
            { label: '否', value: false },
            { label: '零', value: 0 },
            { label: '字符串', value: collision },
            { label: '是', value: true },
          ],
        },
      ],
    },
  })
  const select = wrapper.getComponent(NSelect)
  const options = select.props('options')!
  expect(new Set(options.map(option => option.value)).size).toBe(4)
  expect(select.props('value')).toEqual(options.map(option => option.value))
  select.vm.$emit(
    'update:value',
    options.map(option => option.value),
    options
  )
  await nextTick()
  expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toEqual({
    flags: [false, 0, collision, true],
  })
  wrapper.vm.cleanFn()
  await nextTick()
  expect(select.props('value')).toEqual([options[0].value])
  expect(wrapper.emitted('reset')?.at(-1)?.[0]).toEqual({ flags: [false] })
})

test('folded search fields remain validated and failures reveal the field', async () => {
  const onSearch = vi.fn()
  const wrapper = mount(C_FormSearch, {
    props: {
      formItemList: [
        { type: 'input', prop: 'name' },
        {
          type: 'input',
          prop: 'required',
          rules: [{ required: true, message: 'required' }],
        },
        {
          type: 'input',
          prop: 'hidden',
          show: false,
          rules: [{ required: true, message: 'hidden' }],
        },
      ],
      modelValue: { name: 'Ada', required: '', hidden: '' },
      config: { foldThreshold: 1, onSearch },
    },
  })
  const container = wrapper.findAll('.form-search-item-box')[1]
  const field = container.get('input')
  expect(container.attributes('style')).toContain('display: none')
  expect(await wrapper.vm.searchFn()).toBe(false)
  await flushPromises()
  expect(container.attributes('style') ?? '').not.toContain('display: none')
  expect(onSearch).not.toHaveBeenCalled()
  expect(wrapper.emitted('search')).toBeUndefined()
  await field.setValue('valid')
  wrapper.vm.changeFoldState()
  await flushPromises()
  expect(container.attributes('style')).toContain('display: none')
  expect(await wrapper.vm.searchFn()).toBe(true)
  expect(onSearch).toHaveBeenCalledExactlyOnceWith({
    name: 'Ada',
    required: 'valid',
    hidden: '',
  })
})
