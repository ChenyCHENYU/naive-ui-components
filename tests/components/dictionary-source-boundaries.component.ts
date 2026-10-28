import { expect, test } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { useDictionaryOptions } from '../../src/composables/useDictionary'
import type {
  DictionaryOption,
  DictionarySource,
} from '../../src/core/dictionary'

test('invalid provider snapshots fail visibly and async diagnostic failures stay isolated', async () => {
  const options = ref<readonly DictionaryOption[]>([
    { value: 1, label: 'A' },
    { value: 1, label: 'duplicate' },
  ])
  const source: DictionarySource = { getOptions: () => options.value }
  let state!: ReturnType<typeof useDictionaryOptions>
  const Host = defineComponent({
    setup() {
      state = useDictionaryOptions(() => new Map([['status', source]]), {
        onError: async () => {
          throw new Error('observer')
        },
      })
      return () => h('span', state.getOptions('status').length)
    },
  })
  const wrapper = mount(Host)
  await flushPromises()
  expect(state.getError('status')).toBeInstanceOf(TypeError)
  expect(state.getOptions('status')).toEqual([])
  options.value = [
    { value: 0, label: 'zero' },
    { value: '0', label: 'text' },
    { value: false, label: 'false' },
  ]
  await state.reload('status')
  expect(state.getError('status')).toBeUndefined()
  expect(state.getLabel('status', false)).toBe('false')
  expect(state.getLabel('status', '0')).toBe('text')
  options.value = [{ value: NaN, label: 'invalid' }]
  await state.reload('status')
  expect(state.getError('status')).toBeInstanceOf(TypeError)
  wrapper.unmount()
  await flushPromises()
})
