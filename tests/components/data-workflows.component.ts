import { afterEach, expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, KeepAlive, ref } from 'vue'
import C_ErrorSummary from '../../src/components/C_ErrorSummary/index.vue'
import { useDataResource } from '../../src/composables/useDataResource'
import type { ValidationIssue } from '../../src/core/validation'

afterEach(() => vi.restoreAllMocks())

test('large error collections mount a bounded page and navigate by stable row identity', async () => {
  const issues: ValidationIssue[] = Array.from(
    { length: 10_000 },
    (_, index) => ({
      key: `row-${index}:qty`,
      source: 'items',
      message: `数量错误 ${index}`,
      target: { rowKey: `row-${index}`, field: 'qty', tab: 'items' },
    })
  )
  const wrapper = mount(C_ErrorSummary, { props: { issues } })
  expect(wrapper.findAll('.c-error-summary__target')).toHaveLength(8)
  await wrapper.find('.c-error-summary__target').trigger('click')
  expect(wrapper.emitted('navigate')?.[0]?.[0]).toStrictEqual(issues[0])
  const next = wrapper
    .findAll('button')
    .find(button => button.text() === '下一组')!
  await next.trigger('click')
  expect(wrapper.findAll('.c-error-summary__target')).toHaveLength(8)
  expect(wrapper.find('.c-error-summary__target').text()).toBe('数量错误 8')
  await wrapper.setProps({ issues: issues.slice(0, 2) })
  expect(wrapper.findAll('.c-error-summary__target')).toHaveLength(2)
  expect(wrapper.text()).not.toContain('下一组')
  wrapper.unmount()
})

test('KeepAlive pauses requests and restores the latest resource without stale writes', async () => {
  const shown = ref(true),
    key = ref('A')
  const requests: Array<{
    key: string
    signal: AbortSignal
    resolve: (value: string[]) => void
  }> = []
  let resource!: ReturnType<typeof useDataResource<string, string[]>>
  const Child = defineComponent({
    setup() {
      resource = useDataResource({
        key,
        load: ({ key, signal }) =>
          new Promise(resolve => requests.push({ key, signal, resolve })),
      })
      return () => h('div', resource.data.value?.join(','))
    },
  })
  const Parent = defineComponent({
    setup: () => () =>
      h(KeepAlive, null, { default: () => (shown.value ? h(Child) : null) }),
  })
  const wrapper = mount(Parent)
  expect(requests).toHaveLength(1)
  shown.value = false
  await flushPromises()
  expect(requests[0].signal.aborted).toBe(true)
  key.value = 'B'
  await flushPromises()
  expect(requests).toHaveLength(1)
  requests[0].resolve(['old'])
  await flushPromises()
  expect(resource.data.value).toBeUndefined()
  shown.value = true
  await flushPromises()
  expect(requests).toHaveLength(2)
  expect(requests[1].key).toBe('B')
  requests[1].resolve(['B'])
  await flushPromises()
  expect(wrapper.text()).toBe('B')
  wrapper.unmount()
  expect(await resource.reload()).toBe(false)
})
