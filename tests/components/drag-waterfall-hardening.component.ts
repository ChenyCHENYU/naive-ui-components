import { test, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, defineComponent, h, nextTick } from 'vue'
import Sortable from 'sortablejs'
import Draggable from '../../src/components/C_Draggable/index.vue'
import { useInfiniteScroll } from '../../src/components/C_WaterFall/composables/useInfiniteScroll'
test('unconfigured draggable lists are isolated; an explicit shared group enables transfer', () => {
  const a = mount(Draggable, { props: { modelValue: [{ id: 'a' }] } })
  const b = mount(Draggable, { props: { modelValue: [{ id: 'b' }] } })
  const sa = new Sortable(document.createElement('div'), {
    group:
      typeof a.props('group') === 'string'
        ? String(a.props('group'))
        : undefined,
  })
  const sb = new Sortable(document.createElement('div'), {
    group:
      typeof b.props('group') === 'string'
        ? String(b.props('group'))
        : undefined,
  })
  const target: any = sb.option('group')
  expect(a.props('group')).toBeUndefined()
  expect(b.props('group')).toBeUndefined()
  expect(target.checkPut(sb, sa)).toBe(false)
  sa.option('group', 'shared')
  sb.option('group', 'shared')
  expect((sb.option('group') as any).checkPut(sb, sa)).toBe(true)
  sa.destroy()
  sb.destroy()
  a.unmount()
  b.unmount()
})
test('short pages bound automatic refill, then support viewport reentry and explicit resume', async () => {
  let callback: IntersectionObserverCallback | undefined
  const observe = vi.fn()
  const disconnect = vi.fn()
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(cb: IntersectionObserverCallback) {
        callback = cb
      }
      observe = observe
      disconnect = disconnect
    }
  )
  let scrolling!: ReturnType<typeof useInfiniteScroll>
  const loading = ref(false)
  const loadMore = vi.fn()
  const wrapper = mount(
    defineComponent({
      setup() {
        scrolling = useInfiniteScroll(
          ref(document.createElement('div')),
          ref(true),
          loading,
          ref(false),
          loadMore
        )
        return () => h('div')
      },
    })
  )
  callback!([{ isIntersecting: true }] as any, {} as any)
  expect(loadMore).toHaveBeenCalledTimes(1)
  for (let i = 0; i < 8; i++) {
    loading.value = true
    // eslint-disable-next-line no-await-in-loop -- 分页必须按加载开始、完成和布局提交顺序推进。
    await nextTick()
    loading.value = false
    // eslint-disable-next-line no-await-in-loop -- 分页必须按加载开始、完成和布局提交顺序推进。
    await nextTick()
    // eslint-disable-next-line no-await-in-loop -- 分页必须按加载开始、完成和布局提交顺序推进。
    await nextTick()
  }
  expect(loadMore).toHaveBeenCalledTimes(5)
  expect(observe).toHaveBeenCalledTimes(1)
  callback!([{ isIntersecting: false }] as any, {} as any)
  callback!([{ isIntersecting: true }] as any, {} as any)
  expect(loadMore).toHaveBeenCalledTimes(6)
  loading.value = true
  await nextTick()
  scrolling.resume()
  expect(loadMore).toHaveBeenCalledTimes(6)
  loading.value = false
  await nextTick()
  await nextTick()
  expect(loadMore).toHaveBeenCalledTimes(7)
  for (let i = 0; i < 3; i++) {
    loading.value = true
    // eslint-disable-next-line no-await-in-loop -- 完成第二组分页请求直到触达预算。
    await nextTick()
    loading.value = false
    // eslint-disable-next-line no-await-in-loop -- 分页完成后等待组件布局提交。
    await nextTick()
    // eslint-disable-next-line no-await-in-loop -- 分页完成后等待下一次请求调度。
    await nextTick()
  }
  expect(loadMore).toHaveBeenCalledTimes(10)
  expect(scrolling.paused.value).toBe(true)
  scrolling.resume()
  expect(loadMore).toHaveBeenCalledTimes(11)
  expect(scrolling.paused.value).toBe(false)
  wrapper.unmount()
  scrolling.resume()
  expect(loadMore).toHaveBeenCalledTimes(11)
  vi.unstubAllGlobals()
})
