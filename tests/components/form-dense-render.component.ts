import { expect, test } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { NInput, NGrid, NGridItem } from 'naive-ui'
import C_Form from '../../src/components/C_Form/index.vue'
import C_FormModal from '../../src/components/C_FormModal/index.vue'
import {
  createFormRendererRegistry,
  FORM_RENDERER_REGISTRY_KEY,
  type FormOption,
  type FormRecord,
  type FormRenderer,
} from '../../src/components/C_Form'

test.each(['form', 'modal'] as const)(
  '%s：400 字段输入仅重渲染受影响控件，保留 DOM',
  async mode => {
    const renders = new Map<string, number>()
    const options: FormOption[] = Array.from({ length: 400 }, (_, i) => ({
      type: 'input',
      prop: `f${i}`,
      label: `字段${i}`,
    }))
    const input: FormRenderer = (props, item) => {
      renders.set(item.prop, (renders.get(item.prop) ?? 0) + 1)
      return h(NInput, props)
    }
    const config = {
      density: 'compact',
      layout: 'grid',
      showActions: false,
    } as const
    const renderers = { input }
    const registry = createFormRendererRegistry(renderers)
    const Host = defineComponent({
      setup() {
        const model = ref<FormRecord>({})
        if (mode === 'modal') {
          const editor = {
            model,
            visible: ref(true),
            mode: ref<'create' | 'edit'>('edit'),
            title: ref('密集表单'),
            loading: ref(false),
            setModel: (value: FormRecord) => {
              model.value = value
            },
            close: () => {},
            submit: async () => false,
          }
          return () => h(C_FormModal<FormRecord>, { editor, options, config })
        }
        return () =>
          h(C_Form<FormRecord>, {
            options,
            modelValue: model.value,
            'onUpdate:modelValue': value => {
              model.value = value
            },
            renderers,
            config,
          })
      },
    })
    const wrapper = mount(Host, {
      attachTo: document.body,
      global: {
        components: { NGrid, NGridItem },
        provide: { [FORM_RENDERER_REGISTRY_KEY as symbol]: registry },
      },
    })
    await flushPromises()
    const controls =
      mode === 'modal'
        ? wrapper.findComponent(C_Form).findAll('input')
        : wrapper.findAll('input')
    expect(controls).toHaveLength(400)
    const last = controls[399].element
    renders.clear()
    controls[0].element.focus()
    await controls[0].setValue('单字段更新')
    await flushPromises()
    expect(renders.get('f0')).toBeGreaterThan(0)
    expect(renders.get('f0')).toBeLessThanOrEqual(2)
    expect([...renders.keys()]).toEqual(['f0'])
    expect(document.querySelectorAll('input')[399]).toBe(last)
    // 弹窗焦点陷阱需要真实布局，交由浏览器夹具验证。
    if (mode === 'form')
      expect(document.activeElement).toBe(controls[0].element)
    wrapper.unmount()
  }
)
