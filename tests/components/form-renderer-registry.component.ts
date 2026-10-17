import { expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, onUnmounted } from 'vue'
import C_Form from '../../src/components/C_Form/index.vue'
import type { FormRecord } from '../../src/components/C_Form/types'
import {
  createFormRendererRegistry,
  FORM_RENDERER_REGISTRY_KEY,
  registerRenderer,
  type FormRenderer,
  type FormRendererRegistry,
} from '../../src/components/C_Form/composables/useFormRenderer'

const renderer =
  (label: string): FormRenderer =>
  () =>
    h('span', { 'data-renderer': label }, label)

const mountForm = (registry: FormRendererRegistry) =>
  mount(C_Form<FormRecord>, {
    props: {
      options: [{ type: 'input', prop: 'name' }],
      config: { showActions: false },
    },
    global: { provide: { [FORM_RENDERER_REGISTRY_KEY as symbol]: registry } },
  })

test('application injection isolates live forms from other apps and legacy registrations', async () => {
  const registryA = createFormRendererRegistry({ input: renderer('app-a') })
  const registryB = createFormRendererRegistry()
  const disposeLegacy = registerRenderer('input', renderer('legacy'))
  try {
    const appA = mountForm(registryA)
    const appB = mountForm(registryB)
    expect(appA.get('[data-renderer]').text()).toBe('app-a')
    expect(appB.find('[data-renderer]').exists()).toBe(false)
    expect(appB.find('input').exists()).toBe(true)

    const disposeB = registryB.register('input', renderer('app-b'))
    await nextTick()
    expect(appA.get('[data-renderer]').text()).toBe('app-a')
    expect(appB.get('[data-renderer]').text()).toBe('app-b')

    await appA.setProps({ renderers: { input: renderer('instance') } })
    expect(appA.get('[data-renderer]').text()).toBe('instance')
    await appA.setProps({ renderers: undefined })
    expect(appA.get('[data-renderer]').text()).toBe('app-a')

    registryA.unregister('input')
    await nextTick()
    expect(appA.find('[data-renderer]').exists()).toBe(false)
    expect(appA.find('input').exists()).toBe(true)
    appA.unmount()
    expect(appB.get('[data-renderer]').text()).toBe('app-b')
    expect(disposeB()).toBe(true)
    await nextTick()
    expect(appB.find('input').exists()).toBe(true)

    const freshApp = mountForm(createFormRendererRegistry())
    expect(freshApp.find('[data-renderer]').exists()).toBe(false)
    expect(freshApp.find('input').exists()).toBe(true)
  } finally {
    disposeLegacy()
  }
})

test('unmounting an older registration owner preserves its replacement', async () => {
  const registry = createFormRendererRegistry()
  const sharedRenderer = renderer('current')
  const owner = mount(
    defineComponent({
      setup() {
        const dispose = registry.register('input', sharedRenderer)
        onUnmounted(() => {
          dispose()
        })
        return () => h('div')
      },
    })
  )
  const form = mountForm(registry)
  const disposeReplacement = registry.register('input', sharedRenderer)
  owner.unmount()
  await nextTick()
  expect(registry.get('input')).toBe(sharedRenderer)
  expect(form.get('[data-renderer]').text()).toBe('current')

  disposeReplacement()
  await nextTick()
  expect(form.find('[data-renderer]').exists()).toBe(false)
  expect(form.find('input').exists()).toBe(true)
})
