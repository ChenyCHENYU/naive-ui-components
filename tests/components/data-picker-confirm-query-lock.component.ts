import { expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { h, nextTick, type ComponentPublicInstance } from 'vue'
import { NButton } from 'naive-ui'
import DataPicker from '../../src/components/C_DataPicker/index.vue'
import Table from '../../src/components/C_Table/index.vue'
import type { TreeProps } from '../../src/components/C_Tree/types'
import type {
  DataPickerNavigationContext,
  DataPickerNavigationNode,
  DataPickerSourceInput,
} from '../../src/components/C_DataPicker/types'

type NavigationTree = ComponentPublicInstance<
  TreeProps<DataPickerNavigationNode>
>
const tree = (wrapper: ReturnType<typeof mount>) =>
  wrapper.getComponent<NavigationTree>({ name: 'C_Tree' })

interface Row {
  id: number
  name: string
}
interface Filters {
  factory?: string
  category?: string
  text?: string
}
const rows: Row[] = [{ id: 0, name: 'Zero' }]

test.each(['standard', 'custom'] as const)(
  'pending confirmation locks %s navigation and direct slot submissions',
  async kind => {
    let release!: (rows: readonly Row[]) => void
    const pending = new Promise<readonly Row[]>(resolve => {
      release = resolve
    })
    const request = vi.fn(async () => ({ rows, total: 1 }))
    const source: DataPickerSourceInput<Row, Filters> = {
      rowKey: 'id',
      label: row => row.name,
      request,
      resolve: vi.fn(() => pending),
    }
    let submit!: (filters: Filters) => void
    let navigation!: DataPickerNavigationContext
    const wrapper = mount(DataPicker<Row, Filters>, {
      props: {
        source,
        columns: [{ key: 'name', title: 'Name' }],
        multiple: true,
        presentation: 'inline',
        initialValues: { factory: 'A', category: 'initial' },
        revalidateOnConfirm: true,
        navigation: {
          field: 'category',
          options: [
            { key: 'initial', label: 'Initial' },
            { key: 'other', label: 'Other' },
          ],
          ...(kind === 'custom'
            ? {
                render: (context: DataPickerNavigationContext) => {
                  navigation = context
                  return h(
                    'button',
                    {
                      'data-navigation': '',
                      disabled: context.disabled,
                      onClick: () => context.select('other'),
                    },
                    String(context.value)
                  )
                },
              }
            : {}),
        },
      },
      slots: {
        query: ({ submit: next }) => {
          submit = next
          return null
        },
      },
    })
    wrapper.vm.open()
    await flushPromises()
    if (kind === 'standard')
      await vi.waitFor(() =>
        expect(wrapper.findComponent({ name: 'C_Tree' }).exists()).toBe(true)
      )
    await wrapper.getComponent(Table).get('.n-checkbox').trigger('click')
    await flushPromises()
    const count = request.mock.calls.length
    const confirming = wrapper.vm.confirm()
    await nextTick()
    if (kind === 'standard') {
      expect(tree(wrapper).props('disabled')).toBe(true)
      expect(
        wrapper
          .findAllComponents(NButton)
          .find(button => button.text() === '全部分类')
          ?.props('disabled')
      ).toBe(true)
      // Direct public component events must not bypass the state-layer lock.
      tree(wrapper).vm.$emit('node-select', { key: 'other', label: 'Other' }, [
        'other',
      ])
    } else {
      expect(navigation.disabled).toBe(true)
      expect(
        wrapper.get('[data-navigation]').attributes('disabled')
      ).toBeDefined()
      navigation.select('other')
    }
    submit({ category: 'forged', text: 'should stay out' })
    await flushPromises()
    expect(request).toHaveBeenCalledTimes(count)
    if (kind === 'standard')
      expect(tree(wrapper).props('selectedKeys')).toEqual(['initial'])
    else expect(wrapper.get('[data-navigation]').text()).toBe('initial')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()

    // A failed validation keeps the draft open and releases navigation normally.
    release([])
    expect(await confirming).toBe(false)
    await nextTick()
    if (kind === 'standard') {
      expect(tree(wrapper).props('disabled')).toBe(false)
      tree(wrapper).vm.$emit('node-select', { key: 'other', label: 'Other' }, [
        'other',
      ])
    } else {
      expect(navigation.disabled).toBe(false)
      navigation.select('other')
    }
    await flushPromises()
    expect(request).toHaveBeenLastCalledWith(
      expect.objectContaining({ filters: { factory: 'A', category: 'other' } })
    )
  }
)
