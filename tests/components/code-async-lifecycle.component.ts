import { describe, expect, test, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { NCode } from 'naive-ui'
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
