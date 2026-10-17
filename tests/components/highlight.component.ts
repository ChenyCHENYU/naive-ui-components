import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { createApp, h, type App } from 'vue'
import {
  setupHighlight,
  useHighlight,
  type HighlightAPI,
  type HighlightPluginOptions,
} from '../../src/plugins/highlight'

const mountedApps = new Set<App>()
let originalDescriptor: PropertyDescriptor | undefined

beforeEach(() => {
  originalDescriptor = Object.getOwnPropertyDescriptor(window, 'hljs')
})

function unmount(app: App) {
  mountedApps.delete(app)
  app.unmount()
}

afterEach(() => {
  for (const app of mountedApps) unmount(app)
  if (originalDescriptor)
    Reflect.defineProperty(window, 'hljs', originalDescriptor)
  else Reflect.deleteProperty(window, 'hljs')
})

function mountHighlighter(options: HighlightPluginOptions = {}) {
  let injected: HighlightAPI | undefined
  const app = createApp({
    setup() {
      injected = useHighlight()
      return () => h('pre')
    },
  })
  const api = setupHighlight(app, options)
  const container = document.createElement('div')
  document.body.appendChild(container)
  app.mount(container)
  mountedApps.add(app)
  return { app, api, injected }
}

test('mounted apps resolve their own highlighter and leave window unchanged by default', async () => {
  const hostValue = { owner: 'host' }
  Reflect.defineProperty(window, 'hljs', {
    configurable: true,
    writable: true,
    value: hostValue,
  })
  const first = mountHighlighter({ autoDetect: true })
  const second = mountHighlighter({ autoDetect: false })
  await first.api.loadLanguage('sql')

  expect(first.injected).toBe(first.api)
  expect(second.injected).toBe(second.api)
  expect(first.api.getHljs()).not.toBe(second.api.getHljs())
  expect(
    first.api.getHljs().highlightAuto('const value = true').relevance
  ).toBeGreaterThan(0)
  expect(
    second.api.getHljs().highlightAuto('const value = true').relevance
  ).toBe(0)
  expect(second.api.getLoadedLanguages()).not.toContain('sql')
  expect(Reflect.get(window, 'hljs')).toBe(hostValue)
  unmount(first.app)
  unmount(second.app)
  expect(Reflect.get(window, 'hljs')).toBe(hostValue)
})

test.each(['first', 'second'] as const)(
  'explicit window exposure restores the host descriptor when %s app unmounts first',
  firstToUnmount => {
    const descriptor = {
      configurable: true,
      enumerable: false,
      writable: false,
      value: { owner: 'host' },
    }
    Reflect.defineProperty(window, 'hljs', descriptor)
    const first = mountHighlighter({ exposeToWindow: true })
    const second = mountHighlighter({ exposeToWindow: true })
    expect(Reflect.get(window, 'hljs')).toBe(second.api.getHljs())

    if (firstToUnmount === 'first') {
      unmount(first.app)
      expect(Reflect.get(window, 'hljs')).toBe(second.api.getHljs())
      unmount(second.app)
    } else {
      unmount(second.app)
      expect(Reflect.get(window, 'hljs')).toBe(first.api.getHljs())
      unmount(first.app)
    }
    expect(Object.getOwnPropertyDescriptor(window, 'hljs')).toEqual(descriptor)
    expect(first.app.config.globalProperties.$highlight).toBeUndefined()
    expect(second.app.config.globalProperties.$highlight).toBeUndefined()
  }
)

test('unmounting an explicit bridge preserves a later host assignment', () => {
  const installed = mountHighlighter({ exposeToWindow: true })
  const hostValue = { owner: 'later-host' }
  Reflect.set(window, 'hljs', hostValue)
  unmount(installed.app)
  expect(Reflect.get(window, 'hljs')).toBe(hostValue)
})

test.each([false, true])(
  'repeated app setup restores owned descriptors and preserves later host writes: %s',
  hostOverwrites => {
    // Vue reports deliberate provider replacement; assertions exercise the real app lifecycle.
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const descriptor = {
      configurable: true,
      enumerable: false,
      writable: false,
      value: { owner: 'host' },
    }
    let injected: HighlightAPI | undefined
    const app = createApp({
      setup() {
        injected = useHighlight()
        return () => h('pre')
      },
    })
    Reflect.defineProperty(
      app.config.globalProperties,
      '$highlight',
      descriptor
    )
    Reflect.defineProperty(window, 'hljs', descriptor)
    const apis = [true, false, true, true].map(exposeToWindow =>
      setupHighlight(app, { exposeToWindow })
    )
    app.mount(document.createElement('div'))
    mountedApps.add(app)
    expect(new Set(apis.map(api => api.getHljs())).size).toBe(apis.length)
    expect(injected).toBe(apis.at(-1))
    expect(Reflect.get(window, 'hljs')).toBe(apis.at(-1)?.getHljs())

    const expectedDescriptor = hostOverwrites
      ? { ...descriptor, value: { owner: 'later-host' } }
      : descriptor
    if (hostOverwrites) {
      Reflect.defineProperty(
        app.config.globalProperties,
        '$highlight',
        expectedDescriptor
      )
      Reflect.defineProperty(window, 'hljs', expectedDescriptor)
    }
    unmount(app)
    expect(
      Object.getOwnPropertyDescriptor(app.config.globalProperties, '$highlight')
    ).toEqual(expectedDescriptor)
    expect(Object.getOwnPropertyDescriptor(window, 'hljs')).toEqual(
      expectedDescriptor
    )
  }
)
