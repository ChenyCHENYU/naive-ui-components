/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-31
 * @Description: 小窗播放开关、观察器复用与迟到通知的生命周期回归
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */
import { afterEach, expect, test, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, onMounted, ref, toRef } from 'vue'
import { useMiniPlayer } from '../../src/components/C_VideoPlayer/composables/useMiniPlayer'

afterEach(() => vi.unstubAllGlobals())

function setupObserver() {
  const observers: Array<{
    callback: IntersectionObserverCallback
    observe: ReturnType<typeof vi.fn>
    disconnect: ReturnType<typeof vi.fn>
  }> = []
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe = vi.fn()
      disconnect = vi.fn()
      constructor(public callback: IntersectionObserverCallback) {
        observers.push(this)
      }
    }
  )
  const notify = (index: number, isIntersecting: boolean) => {
    const observer = observers[index]
    observer.callback(
      [{ isIntersecting }] as IntersectionObserverEntry[],
      observer as unknown as IntersectionObserver
    )
  }
  return { observers, notify }
}

function mountMiniPlayer(enabled = false) {
  let controller!: ReturnType<typeof useMiniPlayer>
  const wrapper = mount(
    defineComponent({
      props: { enabled: Boolean },
      setup(props) {
        const element = ref<HTMLElement | null>(null)
        controller = useMiniPlayer(element, toRef(props, 'enabled'))
        onMounted(controller.initObserver)
        return () => h('div', { ref: element })
      },
    }),
    { props: { enabled } }
  )
  return { controller, wrapper }
}

test('runtime miniPlayer toggles enable and detach observation without accepting stale visibility', async () => {
  const { observers, notify } = setupObserver()
  const { controller, wrapper } = mountMiniPlayer()
  expect(observers).toHaveLength(0)
  await wrapper.setProps({ enabled: true })
  expect(observers).toHaveLength(1)
  expect(observers[0].observe).toHaveBeenCalledWith(wrapper.element)
  notify(0, false)
  expect(controller.isMiniMode.value).toBe(true)
  await wrapper.setProps({ enabled: false })
  expect(observers[0].disconnect).toHaveBeenCalledTimes(1)
  expect(controller.isMiniMode.value).toBe(false)
  notify(0, false)
  expect(controller.isMiniMode.value).toBe(false)
  await wrapper.setProps({ enabled: true })
  expect(observers).toHaveLength(2)
  notify(0, false)
  expect(controller.isMiniMode.value).toBe(false)
  notify(1, false)
  expect(controller.isMiniMode.value).toBe(true)
  wrapper.unmount()
  expect(observers[1].disconnect).toHaveBeenCalledTimes(1)
  notify(1, false)
  expect(controller.isMiniMode.value).toBe(false)
})

test('repeated initialization reuses one observer and explicit close invalidates queued callbacks', () => {
  const { observers, notify } = setupObserver()
  const { controller, wrapper } = mountMiniPlayer(true)
  controller.initObserver()
  controller.initObserver()
  expect(observers).toHaveLength(1)
  notify(0, false)
  expect(controller.isMiniMode.value).toBe(true)
  controller.closeMiniPlayer()
  notify(0, false)
  expect(controller.isMiniMode.value).toBe(false)
  controller.initObserver()
  expect(observers).toHaveLength(2)
  wrapper.unmount()
  expect(
    observers.every(observer => observer.disconnect.mock.calls.length === 1)
  ).toBe(true)
})

test('missing IntersectionObserver leaves the normal player usable', () => {
  vi.stubGlobal('IntersectionObserver', undefined)
  const { controller, wrapper } = mountMiniPlayer(true)
  expect(controller.isMiniMode.value).toBe(false)
  expect(() => controller.initObserver()).not.toThrow()
  wrapper.unmount()
})
