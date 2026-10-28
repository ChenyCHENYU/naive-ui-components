import { afterEach, expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import {
  defineComponent,
  h,
  KeepAlive,
  nextTick,
  ref,
  type Component,
} from 'vue'
import {
  NAlert,
  NBadge,
  NButton,
  NCard,
  NEmpty,
  NGrid,
  NGridItem,
  NProgress,
  NSlider,
  NSpace,
  NStep,
  NSteps,
  NSwitch,
  NTabPane,
  NTabs,
} from 'naive-ui'
import C_Form from '../../src/components/C_Form/index.vue'
import GridLayout from '../../src/components/C_Form/layouts/Grid/index.vue'
import type {
  FormInstance,
  FormOption,
  FormRecord,
} from '../../src/components/C_Form/types'

const components = {
  NAlert,
  NBadge,
  NButton,
  NCard,
  NEmpty,
  NGrid,
  NGridItem,
  NProgress,
  NSlider,
  NSpace,
  NStep,
  NSteps,
  NSwitch,
  NTabPane,
  NTabs,
}
const Form = C_Form<FormRecord>
const field = (prop: string, extra: Partial<FormOption> = {}): FormOption => ({
  type: 'input',
  prop,
  attrs: { inputProps: { 'data-field': prop } },
  ...extra,
})
const mountForm = (
  options: FormOption[],
  config: Record<string, unknown> = {}
) =>
  mount(Form, {
    attachTo: document.body,
    props: { options, config },
    global: { components },
  })
const api = (wrapper: ReturnType<typeof mountForm>) =>
  wrapper.vm as unknown as FormInstance
const input = (wrapper: ReturnType<typeof mountForm>, name: string) =>
  wrapper.get<HTMLInputElement>(`input[data-field="${name}"]`).element
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => {
    resolve = done
  })
  return { promise, resolve }
}

afterEach(() => vi.unstubAllGlobals())

/** 驱动真实组件订阅的 observer，而不是用断言替换浏览器宽度回执。 */
function resizing() {
  const observers: ControlledObserver[] = []
  class ControlledObserver implements ResizeObserver {
    target?: Element
    disconnect = vi.fn()
    constructor(readonly callback: ResizeObserverCallback) {
      observers.push(this)
    }
    observe(target: Element) {
      this.target = target
    }
    unobserve() {}
    emit(width: number) {
      this.callback(
        [
          {
            target: this.target!,
            contentRect: new DOMRect(0, 0, width, 0),
          } as ResizeObserverEntry,
        ],
        this
      )
    }
  }
  vi.stubGlobal('ResizeObserver', ControlledObserver)
  return {
    current: () =>
      [...observers]
        .reverse()
        .find(observer =>
          observer.target?.classList.contains('c-grid-layout')
        )!,
  }
}

const gridProps = (grid: Record<string, unknown>) => ({
  formItems: [h('div', { key: 'one' }), h('div', { key: 'two' })],
  options: [field('one'), field('two')],
  layoutConfig: { grid },
})

test('opt-in minimum field width follows the pane width and preserves explicit offsets and suffixes', async () => {
  const resize = resizing()
  const props = gridProps({ cols: 24, minItemWidth: 300, xGap: 16, yGap: 8 })
  props.options[0].layout = { span: 6, offset: 2, suffix: true }
  const wrapper = mount(GridLayout, { props, global: { components } })
  resize.current().emit(1600)
  await nextTick()
  expect(
    wrapper.findAllComponents(NGridItem).map(item => item.props('span'))
  ).toEqual([6, 5])
  resize.current().emit(1000)
  await nextTick()
  expect(
    wrapper.findAllComponents(NGridItem).map(item => item.props('span'))
  ).toEqual([8, 8])
  expect(wrapper.findComponent(NGridItem).props()).toMatchObject({
    offset: 2,
    suffix: true,
  })
  expect(wrapper.findComponent(NGrid).props()).toMatchObject({
    cols: 24,
    xGap: 16,
    yGap: 8,
  })
  resize.current().emit(400)
  await nextTick()
  expect(
    wrapper.findAllComponents(NGridItem).map(item => item.props('span'))
  ).toEqual([19, 24])
  resize.current().emit(200)
  await nextTick()
  expect(
    wrapper.findAllComponents(NGridItem).map(item => item.props('span'))
  ).toEqual([24, 24])
})

test('omitted minimum width and responsive=false keep the existing explicit numeric layout', async () => {
  const resize = resizing()
  const props = gridProps({ cols: 24, xGap: 16 })
  props.options[0].layout = { span: 6, offset: 2 }
  const wrapper = mount(GridLayout, { props, global: { components } })
  resize.current().emit(200)
  await nextTick()
  expect(
    wrapper.findAllComponents(NGridItem).map(item => item.props('span'))
  ).toEqual([6, 12])
  await wrapper.setProps({
    layoutConfig: {
      grid: { cols: 24, minItemWidth: 300, responsive: false, xGap: 16 },
    },
  })
  expect(
    wrapper.findAllComponents(NGridItem).map(item => item.props('span'))
  ).toEqual([6, 12])
  expect(wrapper.findComponent(NGrid).props('xGap')).toBe(16)
})

test('minimum width observes only active KeepAlive containers and ignores stale observer callbacks', async () => {
  const resize = resizing()
  const shown = ref(true)
  const Host = defineComponent(
    () => () =>
      h(KeepAlive, null, {
        default: () =>
          shown.value
            ? h(GridLayout, {
                ...gridProps({ minItemWidth: 300 }),
                key: 'grid',
              })
            : h('div'),
      })
  )
  const wrapper = mount(Host, { global: { components } })
  const first = resize.current()
  first.emit(1000)
  await nextTick()
  expect(wrapper.findComponent(NGridItem).props('span')).toBe(8)
  shown.value = false
  await nextTick()
  expect(first.disconnect).toHaveBeenCalled()
  first.emit(200)
  shown.value = true
  await nextTick()
  const resumed = resize.current()
  expect(resumed).not.toBe(first)
  expect(wrapper.findComponent(NGridItem).props('span')).toBe(8)
  resumed.emit(640)
  await nextTick()
  expect(wrapper.findComponent(NGridItem).props('span')).toBe(12)
  wrapper.unmount()
  expect(resumed.disconnect).toHaveBeenCalled()
})

test('reveal focuses a real local field and rejects hidden, disabled, readonly and missing targets', async () => {
  const wrapper = mountForm([
    field('enabled'),
    field('disabled', { disabled: true }),
    field('readonly', { readonly: true }),
    field('hidden', { show: false }),
  ])
  await flushPromises()
  expect(await api(wrapper).revealField('enabled')).toBe(true)
  expect(document.activeElement).toBe(input(wrapper, 'enabled'))
  expect(
    await Promise.all(
      ['disabled', 'readonly', 'hidden', 'missing'].map(name =>
        api(wrapper).revealField(name)
      )
    )
  ).toEqual([false, false, false, false])
  expect(document.activeElement).toBe(input(wrapper, 'enabled'))
})

test('reveal changes the configured tab and respects disabled tabs and before-change guards', async () => {
  const guard = vi.fn(
    (_current: string, target: string) => target !== 'blocked'
  )
  const wrapper = mountForm(
    [
      field('a', { layout: { tab: 'a' } }),
      field('b', { layout: { tab: 'b' } }),
      field('blocked', { layout: { tab: 'blocked' } }),
      field('disabled', { layout: { tab: 'disabled' } }),
    ],
    {
      layout: 'tabs',
      tabs: {
        tabs: ['a', 'b', 'blocked']
          .map(key => ({ key, title: key }))
          .concat([
            { key: 'disabled', title: 'disabled', disabled: true },
          ] as any),
      },
      onTabBeforeChange: guard,
    }
  )
  await vi.waitFor(() =>
    expect(wrapper.findComponent(NTabs).exists()).toBe(true)
  )
  await flushPromises()
  expect(await api(wrapper).revealField('b')).toBe(true)
  expect(document.activeElement).toBe(input(wrapper, 'b'))
  expect(wrapper.findComponent(NTabs).props('value')).toBe('b')
  expect(await api(wrapper).revealField('blocked')).toBe(false)
  expect(await api(wrapper).revealField('disabled')).toBe(false)
  expect(wrapper.findComponent(NTabs).props('value')).toBe('b')
})

test('reveal expands only the target card group and leaves field data and validation unchanged', async () => {
  const wrapper = mountForm(
    [
      field('a', { layout: { group: 'a' } }),
      field('b', { layout: { group: 'b' } }),
    ],
    {
      layout: 'card',
      card: {
        groups: [
          { key: 'a', title: 'a', collapsed: true },
          { key: 'b', title: 'b', collapsed: true },
        ],
        showLayoutConfig: false,
        showActionPanel: false,
      },
    }
  )
  await vi.waitFor(() =>
    expect(wrapper.findAll('.card-content')).toHaveLength(2)
  )
  expect(wrapper.findAll('.card-content')[0].isVisible()).toBe(false)
  expect(await api(wrapper).revealField('b')).toBe(true)
  expect(wrapper.findAll('.card-content')[0].isVisible()).toBe(false)
  expect(wrapper.findAll('.card-content')[1].isVisible()).toBe(true)
  expect(document.activeElement).toBe(input(wrapper, 'b'))
  expect(api(wrapper).getFieldValue('b')).toBe('')
})

test('reveal uses the visible step mapping and does not bypass configured validation', async () => {
  const wrapper = mountForm(
    [
      field('a', { layout: { step: 'a' }, required: true }),
      field('b', { layout: { step: 'b' } }),
    ],
    {
      layout: 'steps',
      steps: {
        steps: [
          { key: 'empty', title: 'empty' },
          { key: 'a', title: 'a' },
          { key: 'b', title: 'b' },
        ],
        validateBeforeNext: true,
      },
    }
  )
  await vi.waitFor(() =>
    expect(wrapper.findComponent(NSteps).exists()).toBe(true)
  )
  await flushPromises()
  expect(await api(wrapper).revealField('b')).toBe(false)
  expect(wrapper.findComponent(NSteps).props('current')).toBe(1)
  await api(wrapper).setFieldValue('a', 'valid')
  expect(await api(wrapper).revealField('b')).toBe(true)
  expect(wrapper.findComponent(NSteps).props('current')).toBe(2)
  expect(document.activeElement).toBe(input(wrapper, 'b'))
})

test('latest reveal wins when an old custom focus adapter ignores cancellation', async () => {
  const waiting = deferred<HTMLElement | null>()
  let signal: AbortSignal | undefined
  const wrapper = mountForm([
    field('slow', {
      focusTarget: context => {
        ;({ signal } = context)
        return waiting.promise
      },
    }),
    field('current'),
  ])
  await flushPromises()
  const old = api(wrapper).revealField('slow')
  await flushPromises()
  expect(await api(wrapper).revealField('current')).toBe(true)
  expect(signal?.aborted).toBe(true)
  waiting.resolve(input(wrapper, 'slow'))
  expect(await old).toBe(false)
  expect(document.activeElement).toBe(input(wrapper, 'current'))
})

test('an abort listener can request a newer reveal without an older call reclaiming focus', async () => {
  const oldTarget = deferred<HTMLElement | null>()
  const blockedTarget = deferred<HTMLElement | null>()
  let latest: Promise<boolean> | undefined
  const wrapper = mountForm([
    field('old', {
      focusTarget: ({ signal }) => {
        signal.addEventListener(
          'abort',
          () => {
            latest = api(wrapper).revealField('current')
          },
          { once: true }
        )
        return oldTarget.promise
      },
    }),
    field('blocked', { focusTarget: () => blockedTarget.promise }),
    field('current'),
  ])
  await flushPromises()
  const old = api(wrapper).revealField('old')
  await flushPromises()
  const superseded = api(wrapper).revealField('blocked')
  await flushPromises()
  expect(latest).toBeDefined()
  expect(await latest).toBe(true)
  expect(document.activeElement).toBe(input(wrapper, 'current'))
  blockedTarget.resolve(input(wrapper, 'blocked'))
  expect(await superseded).toBe(false)
  expect(document.activeElement).toBe(input(wrapper, 'current'))
  oldTarget.resolve(input(wrapper, 'old'))
  expect(await old).toBe(false)
})

test('queued reveal cancels an old guarded tab transition without old focus or stale tab events', async () => {
  const waiting = deferred<boolean>()
  const wrapper = mountForm(
    ['a', 'b', 'c'].map(name => field(name, { layout: { tab: name } })),
    {
      layout: 'tabs',
      tabs: { tabs: ['a', 'b', 'c'].map(key => ({ key, title: key })) },
      onTabBeforeChange: (_current: string, target: string) =>
        target === 'b' ? waiting.promise : true,
    }
  )
  await vi.waitFor(() =>
    expect(wrapper.findComponent(NTabs).exists()).toBe(true)
  )
  await flushPromises()
  const old = api(wrapper).revealField('b')
  await flushPromises()
  const latest = api(wrapper).revealField('c')
  waiting.resolve(true)
  expect(await old).toBe(false)
  expect(await latest).toBe(true)
  expect(wrapper.findComponent(NTabs).props('value')).toBe('c')
  expect(document.activeElement).toBe(input(wrapper, 'c'))
})

test('unmount cancels a prepared custom target instead of focusing a detached element', async () => {
  const waiting = deferred<HTMLElement | null>()
  const wrapper = mountForm([
    field('slow', { focusTarget: () => waiting.promise }),
  ])
  await flushPromises()
  const target = input(wrapper, 'slow')
  const pending = api(wrapper).revealField('slow')
  await flushPromises()
  wrapper.unmount()
  waiting.resolve(target)
  expect(await pending).toBe(false)
})

test('KeepAlive deactivation cancels focus work and reactivation can reveal again', async () => {
  const waiting = deferred<HTMLElement | null>()
  const shown = ref(true)
  const form = ref<FormInstance | null>(null)
  let slow = true
  const Host = defineComponent(
    () => () =>
      h(KeepAlive, null, {
        default: () =>
          shown.value
            ? h(Form as Component, {
                ref: form,
                options: [
                  field('target', {
                    focusTarget: context =>
                      slow
                        ? waiting.promise
                        : context.element!.querySelector('input'),
                  }),
                ],
                key: 'form',
              })
            : h('div'),
      })
  )
  const wrapper = mount(Host, {
    attachTo: document.body,
    global: { components },
  })
  await flushPromises()
  const target = wrapper.get<HTMLInputElement>(
    'input[data-field="target"]'
  ).element
  const old = form.value!.revealField('target')
  await flushPromises()
  shown.value = false
  await nextTick()
  waiting.resolve(target)
  expect(await old).toBe(false)
  slow = false
  shown.value = true
  await nextTick()
  expect(await form.value!.revealField('target')).toBe(true)
  expect(document.activeElement).toBe(target)
})

test('field access overrides stay aligned with actual controls under a protected global form', async () => {
  const wrapper = mountForm(
    [
      field('inherited'),
      field('allowed', { disabled: false, readonly: false }),
    ],
    { disabled: true, readonly: true }
  )
  await flushPromises()
  expect(await api(wrapper).revealField('inherited')).toBe(false)
  expect(await api(wrapper).revealField('allowed')).toBe(true)
  expect(input(wrapper, 'allowed').disabled).toBe(false)
  expect(document.activeElement).toBe(input(wrapper, 'allowed'))
})

test('an access rule changing while custom preparation waits prevents focus', async () => {
  const waiting = deferred<HTMLElement | null>()
  const wrapper = mountForm([
    field('target', {
      readonly: model => Boolean(model.locked),
      focusTarget: () => waiting.promise,
    }),
  ])
  await flushPromises()
  const target = input(wrapper, 'target')
  const pending = api(wrapper).revealField('target')
  await flushPromises()
  await api(wrapper).setFieldValue('locked', true)
  waiting.resolve(target)
  expect(await pending).toBe(false)
  expect(document.activeElement).not.toBe(target)
})

test('custom focus only succeeds for a real usable target', async () => {
  const detached = document.createElement('input')
  const wrapper = mountForm([
    field('empty', { focusTarget: () => null }),
    field('detached', { focusTarget: () => detached }),
    field('broken', {
      focusTarget: () => {
        throw new Error('not ready')
      },
    }),
  ])
  await flushPromises()
  expect(await api(wrapper).revealField('empty')).toBe(false)
  expect(await api(wrapper).revealField('detached')).toBe(false)
  expect(await api(wrapper).revealField('broken')).toBe(false)
})
