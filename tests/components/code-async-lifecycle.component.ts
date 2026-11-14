import { describe, expect, test, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import {
  NCode,
  NConfigProvider,
  NButton,
  NModal,
  NTooltip,
  NSpin,
  darkTheme,
} from 'naive-ui'
import { defineComponent, h, ref } from 'vue'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import C_Code from '../../src/components/C_Code/index.vue'

function deferred() {
  let resolve!: () => void
  let reject!: (reason: Error) => void
  const promise = new Promise<void>((done, fail) => {
    resolve = done
    reject = fail
  })
  return { promise, resolve, reject }
}

function createManager(loadedLanguages: string[] = []) {
  const engine = hljs.newInstance()
  const loaded = new Set(loadedLanguages)
  for (const language of loaded) engine.registerLanguage(language, javascript)
  const requests: Array<{
    language: string
    pending: ReturnType<typeof deferred>
  }> = []
  const loadLanguage = vi.fn((language: string) => {
    const pending = deferred()
    requests.push({ language, pending })
    return pending.promise.then(() => {
      engine.registerLanguage(language, javascript)
      loaded.add(language)
    })
  })
  return {
    requests,
    manager: {
      getHljs: () => engine,
      getLoadedLanguages: () => [...loaded],
      loadLanguage,
    },
  }
}

function mountCode(
  manager: ReturnType<typeof createManager>['manager'],
  language = 'python'
) {
  return mount(C_Code, {
    props: { code: 'const answer = 42', language },
    global: {
      provide: { highlightManager: manager },
      components: { NCode },
      stubs: {
        C_Icon: true,
        NTooltip: { template: '<span><slot name="trigger" /></span>' },
        NButton: true,
        NSpin: true,
        NModal: true,
      },
    },
  })
}

describe('C_Code current async task ownership', () => {
  test('old completions and errors cannot finish or pollute the latest language load', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const { manager, requests } = createManager()
    const wrapper = mountCode(manager)
    await wrapper.setProps({ language: 'sql' })
    requests[0].pending.resolve()
    await flushPromises()
    expect(wrapper.get('.c-code-loading').text()).toContain('sql')
    await wrapper.setProps({ language: 'ruby' })
    requests[1].pending.reject(new Error('old language failed'))
    await flushPromises()
    expect(wrapper.get('.c-code-loading').text()).toContain('ruby')
    expect(warn).not.toHaveBeenCalled()
    requests[2].pending.resolve()
    await flushPromises()
    expect(wrapper.find('.c-code-loading').exists()).toBe(false)
  })

  test('text, preloaded languages and autoLoad changes invalidate pending state without extra loads', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const { manager, requests } = createManager(['javascript'])
    const wrapper = mountCode(manager)
    await wrapper.setProps({ language: 'text' })
    expect(wrapper.find('.c-code-loading').exists()).toBe(false)
    requests[0].pending.reject(new Error('text replaced this load'))
    await flushPromises()
    expect(warn).not.toHaveBeenCalled()
    await wrapper.setProps({ language: 'ruby', autoLoadLanguage: false })
    expect(manager.loadLanguage).toHaveBeenCalledTimes(1)
    await wrapper.setProps({ autoLoadLanguage: true })
    expect(manager.loadLanguage).toHaveBeenCalledTimes(2)
    expect(wrapper.find('.c-code-loading').exists()).toBe(true)
    await wrapper.setProps({ language: 'javascript' })
    expect(wrapper.find('.c-code-loading').exists()).toBe(false)
    expect(manager.loadLanguage).toHaveBeenCalledTimes(2)
    requests[1].pending.reject(
      new Error('preloaded language replaced this load')
    )
    await flushPromises()
    expect(warn).not.toHaveBeenCalled()
  })

  test('disabling autoLoad immediately clears loading and suppresses its late error', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const { manager, requests } = createManager()
    const wrapper = mountCode(manager)
    await wrapper.setProps({ autoLoadLanguage: false })
    expect(wrapper.find('.c-code-loading').exists()).toBe(false)
    requests[0].pending.reject(new Error('disabled load'))
    await flushPromises()
    expect(warn).not.toHaveBeenCalled()
  })

  test('loaded grammar refreshes the existing real NCode instance', async () => {
    const { manager, requests } = createManager()
    const wrapper = mountCode(manager, 'javascript')
    const codeElement = wrapper.getComponent(NCode).element
    expect(wrapper.find('.hljs-keyword').exists()).toBe(false)
    requests[0].pending.resolve()
    await flushPromises()
    expect(wrapper.get('.hljs-keyword').text()).toBe('const')
    expect(wrapper.getComponent(NCode).element).toBe(codeElement)
  })

  test('a current loader failure still ends loading and reports its own error', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const { manager, requests } = createManager()
    const wrapper = mountCode(manager)
    const failure = new Error('current language failed')
    requests[0].pending.reject(failure)
    await flushPromises()
    expect(wrapper.find('.c-code-loading').exists()).toBe(false)
    expect(warn).toHaveBeenCalledExactlyOnceWith(
      'Failed to load language: python',
      failure
    )
  })

  test('unmount suppresses late language errors', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const { manager, requests } = createManager()
    const wrapper = mountCode(manager)
    wrapper.unmount()
    requests[0].pending.reject(new Error('detached load'))
    await flushPromises()
    expect(warn).not.toHaveBeenCalled()
  })

  test('copy emits the exact text written before later prop updates', async () => {
    const { manager } = createManager(['javascript'])
    const wrapper = mountCode(manager, 'javascript')
    const pending = deferred()
    const write = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockReturnValue(pending.promise)
    const copy = wrapper.vm.copyCode()
    await wrapper.setProps({ code: 'replacement code' })
    pending.resolve()
    await copy
    expect(write).toHaveBeenCalledExactlyOnceWith('const answer = 42')
    expect(wrapper.emitted('copy')).toEqual([['const answer = 42']])
  })

  test.each(['resolve', 'reject'] as const)(
    'unmount prevents late copy %s events and diagnostics',
    async outcome => {
      const error = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined)
      const { manager } = createManager(['javascript'])
      const wrapper = mountCode(manager, 'javascript')
      const pending = deferred()
      const write = vi
        .spyOn(navigator.clipboard, 'writeText')
        .mockReturnValue(pending.promise)
      const copy = wrapper.vm.copyCode()
      void wrapper.vm.copyCode()
      expect(write).toHaveBeenCalledTimes(1)
      wrapper.unmount()
      if (outcome === 'resolve') pending.resolve()
      else pending.reject(new Error('clipboard rejected after unmount'))
      await copy
      expect(wrapper.emitted('copy')).toBeUndefined()
      expect(error).not.toHaveBeenCalled()
    }
  )
})

test('fullscreen Code carries instance semantic overrides across the real Teleport without copying layout styles', async () => {
  const dark = ref(true)
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(
          NConfigProvider,
          { theme: dark.value ? darkTheme : null, hljs },
          {
            default: () =>
              h(C_Code, {
                code: 'const current = true',
                language: 'text',
                showFullscreen: true,
                style: { '--c-primary': '#a43e89', width: '480px' },
              }),
          }
        ),
    }),
    {
      attachTo: document.body,
      global: {
        components: { NCode, NButton, NModal, NTooltip, NSpin },
        stubs: { C_Icon: true },
      },
    }
  )
  wrapper.getComponent(C_Code).vm.toggleFullscreen()
  await flushPromises()
  const popup = document.querySelector<HTMLElement>('.fullscreen-content')!
  expect(popup).toBeTruthy()
  expect(wrapper.get('.c-code-wrapper').element.contains(popup)).toBe(false)
  expect(popup.style.getPropertyValue('--c-primary')).toBe('#a43e89')
  expect(popup.style.width).not.toBe('480px')
  const background = popup.style.getPropertyValue('--c-theme-bg-card')
  dark.value = false
  await flushPromises()
  expect(document.querySelector('.fullscreen-content')).toBe(popup)
  expect(popup.style.getPropertyValue('--c-theme-bg-card')).not.toBe(background)
  expect(popup.textContent).toContain('const current = true')
})

test('an explicitly pending manager renders safe plaintext until retry makes a real engine available', async () => {
  const engine = hljs.newInstance()
  const requests: ReturnType<typeof deferred>[] = []
  class LateManager {
    getHljs?: () => typeof engine
    getLoadedLanguages = () => []
    loadLanguage = () => {
      const pending = deferred()
      requests.push(pending)
      return pending.promise.then(() => {
        engine.registerLanguage('javascript', javascript)
        this.getHljs = () => engine
      })
    }
  }
  const manager = new LateManager()
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const code = '\n<script>danger()</script>\nconst answer = 42\n'
  const wrapper = mount(C_Code, {
    props: { code, language: 'javascript', trim: false },
    global: {
      provide: { highlightManager: manager },
      stubs: {
        C_Icon: true,
        NButton: true,
        NTooltip: true,
        NSpin: true,
        NModal: true,
      },
    },
  })
  expect(wrapper.findComponent(NCode).exists()).toBe(false)
  expect(wrapper.get('.c-code-plain__source code').element.textContent).toBe(
    code
  )
  expect(wrapper.find('script').exists()).toBe(false)
  expect(wrapper.get('.c-code-plain__numbers').element.textContent).toBe(
    '1\n2\n3'
  )
  expect(warn).not.toHaveBeenCalled()
  expect(error).not.toHaveBeenCalled()
  requests[0].reject(new Error('language unavailable'))
  await flushPromises()
  expect(wrapper.find('.c-code-plain').exists()).toBe(true)
  await wrapper.setProps({
    autoLoadLanguage: false,
    wordWrap: true,
    trim: true,
  })
  expect(wrapper.find('.c-code-plain__numbers').exists()).toBe(false)
  expect(wrapper.get('.c-code-plain__source code').element.textContent).toBe(
    code.trim()
  )
  await wrapper.setProps({ autoLoadLanguage: true })
  expect(wrapper.findComponent(NCode).exists()).toBe(false)
  requests[1].resolve()
  await flushPromises()
  expect(wrapper.find('.c-code-plain').exists()).toBe(false)
  expect(wrapper.getComponent(NCode).find('.hljs-keyword').text()).toBe('const')
  await wrapper.setProps({ wordWrap: false })
  expect(wrapper.getComponent(NCode).get('.n-code__line-numbers').text()).toBe(
    '1\n2'
  )
  expect(wrapper.find('script').exists()).toBe(false)
  expect(error).not.toHaveBeenCalled()
  expect(
    warn.mock.calls.filter(([message]) =>
      String(message).includes('[naive/code]')
    )
  ).toEqual([])
  expect(warn).toHaveBeenCalledExactlyOnceWith(
    'Failed to load language: javascript',
    expect.any(Error)
  )
})

test('a real native NConfigProvider engine is inherited without a Robot manager', async () => {
  const engine = hljs.newInstance()
  engine.registerLanguage('javascript', javascript)
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(
          NConfigProvider,
          { hljs: engine },
          {
            default: () =>
              h(C_Code, { code: 'const answer = 42', language: 'javascript' }),
          }
        ),
    }),
    {
      global: {
        components: { NButton, NModal, NTooltip, NSpin },
        stubs: { C_Icon: true },
      },
    }
  )
  await flushPromises()
  expect(wrapper.getComponent(NCode).find('.hljs-keyword').text()).toBe('const')
  expect(warn).not.toHaveBeenCalled()
  expect(error).not.toHaveBeenCalled()
  wrapper.unmount()
})
