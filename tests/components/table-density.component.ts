import { describe, expect, test, vi } from 'vitest'
import { computed, defineComponent, h, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { NConfigProvider, NDataTable, NInput, NPagination } from 'naive-ui'
import C_Table from '../../src/components/C_Table/index.vue'
import C_ActionBar from '../../src/components/C_ActionBar/index.vue'
import type { TableInstance } from '../../src/components/C_Table/types'

describe('C_Table density and mode integration', () => {
  test('row selection and row-data refresh retain the native theme override reference', async () => {
    const wrapper = mount(C_Table, {
      props: {
        columns: [{ type: 'selection' }, { key: 'name', title: 'Name' }],
        data: [{ id: 1, name: 'One' }],
        config: {
          density: 'compact',
          pagination: false,
          toolbar: { show: false },
        },
      },
    })
    await flushPromises()
    const initial = wrapper.getComponent(NDataTable).props('themeOverrides')
    await wrapper.findAll('.n-checkbox')[1].trigger('click')
    expect(wrapper.getComponent(NDataTable).props('themeOverrides')).toBe(
      initial
    )
    await wrapper.setProps({
      data: [
        { id: 1, name: 'Refreshed' },
        { id: 2, name: 'Two' },
      ],
    })
    await flushPromises()
    expect(wrapper.getComponent(NDataTable).props('themeOverrides')).toBe(
      initial
    )
  })

  test('compact supplies native small cell padding while a later default density restores native padding', async () => {
    const wrapper = mount(C_Table, {
      props: {
        columns: [{ key: 'name', title: 'Name' }],
        data: [{ id: 1, name: 'One' }],
        config: {
          density: 'compact',
          pagination: false,
          toolbar: { show: false },
        },
      },
    })
    await flushPromises()
    const table = wrapper.getComponent(NDataTable)
    const value = (name: string) => table.element.style.getPropertyValue(name)
    expect(table.props('size')).toBe('small')
    expect(value('--n-td-padding')).toBe('2px 8px')
    expect(value('--n-th-padding')).toBe('4px 8px')
    await wrapper.setProps({
      config: {
        density: 'default',
        pagination: false,
        toolbar: { show: false },
      },
    })
    expect(table.props('size')).toBe('medium')
    expect(value('--n-td-padding')).toBe('12px')
    expect(value('--n-th-padding')).toBe('12px')
  })

  test.each(['config', 'attrs'] as const)(
    'explicit %s large size takes priority over compact padding',
    async source => {
      const wrapper = mount(C_Table, {
        props: {
          columns: [{ key: 'name', title: 'Name' }],
          data: [{ id: 1, name: 'One' }],
          config: {
            density: 'compact',
            pagination: false,
            toolbar: { show: false },
            ...(source === 'config' ? { display: { size: 'large' } } : {}),
          },
        },
        attrs: source === 'attrs' ? { size: 'large' } : {},
      })
      await flushPromises()
      const table = wrapper.getComponent(NDataTable)
      expect(table.props('size')).toBe('large')
      expect(table.element.style.getPropertyValue('--n-td-padding')).toBe(
        '12px'
      )
      expect(table.element.style.getPropertyValue('--n-th-padding')).toBe(
        '12px'
      )
    }
  )

  test('compact padding retains explicit instance and reactive theme override priorities', async () => {
    const padding = ref('6px 14px')
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(C_Table, {
            columns: [{ key: 'name', title: 'Name' }],
            data: [{ id: 1, name: 'One' }],
            config: {
              density: 'compact',
              pagination: false,
              toolbar: { show: false },
            },
            'theme-overrides': {
              tdPaddingSmall: '3px 14px',
              thPaddingSmall: padding.value,
            },
          }),
      })
    )
    await flushPromises()
    const table = wrapper.getComponent(NDataTable)
    expect(table.element.style.getPropertyValue('--n-td-padding')).toBe(
      '3px 14px'
    )
    expect(table.element.style.getPropertyValue('--n-th-padding')).toBe(
      '6px 14px'
    )
    padding.value = '9px 14px'
    await flushPromises()
    expect(table.element.style.getPropertyValue('--n-th-padding')).toBe(
      '9px 14px'
    )
  })

  test('compact geometry overrides provider padding while keeping nested colors and native sibling styles isolated', async () => {
    const tableProps = {
      columns: [{ key: 'name', title: 'Name' }],
      data: [{ id: 1, name: 'One' }],
      config: {
        density: 'compact',
        pagination: false,
        toolbar: { show: false },
      } as const,
    }
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h('div', [
            h(
              NConfigProvider,
              {
                themeOverrides: {
                  DataTable: {
                    tdPaddingSmall: '6px 10px',
                    thPaddingSmall: '5px 10px',
                    tdColor: '#102030',
                  },
                },
              },
              () => [
                h(C_Table, { ...tableProps, class: 'outer-compact' }),
                h(C_Table, {
                  ...tableProps,
                  class: 'local-compact',
                  themeOverrides: { tdPaddingSmall: '9px 14px' },
                }),
                h(
                  NConfigProvider,
                  {
                    themeOverrides: {
                      DataTable: {
                        tdPaddingSmall: '7px 11px',
                        tdColor: '#506070',
                      },
                    },
                  },
                  () => h(C_Table, { ...tableProps, class: 'nested-compact' })
                ),
              ]
            ),
            h(NDataTable, {
              class: 'native-sibling',
              columns: tableProps.columns,
              data: tableProps.data,
              size: 'small',
            }),
          ]),
      })
    )
    await flushPromises()
    const value = (selector: string, name: string) =>
      wrapper.get<HTMLElement>(selector).element.style.getPropertyValue(name)
    expect(value('.outer-compact', '--n-td-padding')).toBe('2px 8px')
    expect(value('.outer-compact', '--n-th-padding')).toBe('4px 8px')
    expect(value('.outer-compact', '--n-td-color')).toBe('#102030')
    expect(value('.local-compact', '--n-td-padding')).toBe('9px 14px')
    expect(value('.nested-compact', '--n-td-padding')).toBe('2px 8px')
    expect(value('.nested-compact', '--n-th-padding')).toBe('4px 8px')
    expect(value('.nested-compact', '--n-td-color')).toBe('#506070')
    expect(value('.native-sibling', '--n-td-padding')).toBe('8px')
    expect(value('.native-sibling', '--n-th-padding')).toBe('8px')
  })

  test('CRUD persistence adapters do not execute until confirmation; explicit edit launchers win', async () => {
    const persistenceAdapter = vi.fn()
    const save = vi.fn()
    const override = vi.fn()
    const crud = {
      data: ref([{ id: 1, name: 'Original' }]),
      loading: ref(false),
      columns: computed(() => [{ key: 'name', title: 'Name' }]),
      actions: computed(() => ({ edit: persistenceAdapter })),
      save,
    }
    const wrapper = mount(C_Table, {
      props: {
        crud,
        config: { edit: 'row', pagination: false, toolbar: { show: false } },
      },
    })
    await wrapper.get('[title="编辑"]').trigger('click')
    await flushPromises()
    expect(
      wrapper.getComponent(NDataTable).findComponent(NInput).exists()
    ).toBe(true)
    expect(persistenceAdapter).not.toHaveBeenCalled()
    expect(save).not.toHaveBeenCalled()
    wrapper
      .getComponent(NDataTable)
      .getComponent(NInput)
      .vm.$emit('update:value', 'Changed')
    await (wrapper.vm as unknown as TableInstance).saveEdit()
    expect(save).toHaveBeenCalledTimes(1)
    expect(save.mock.calls[0][0]).toMatchObject({ id: 1, name: 'Changed' })
    expect(persistenceAdapter).not.toHaveBeenCalled()
    await wrapper.setProps({
      config: { edit: 'row', actions: { edit: override }, pagination: false },
    })
    await wrapper.get('[title="编辑"]').trigger('click')
    await flushPromises()
    expect(override).toHaveBeenCalledTimes(1)
    expect(
      wrapper.getComponent(NDataTable).findComponent(NInput).exists()
    ).toBe(false)
    wrapper.unmount()
  })

  test('live density reaches table, editor, pagination and actions without losing a draft', async () => {
    const wrapper = mount(C_Table, {
      props: {
        columns: [{ key: 'name', title: 'Name' }],
        data: [{ id: 1, name: 'Original' }],
        config: {
          density: 'compact',
          edit: 'row',
          toolbar: { actions: [{ key: 'refresh' }] },
        },
      },
    })
    const api = wrapper.vm as unknown as TableInstance
    api.startEdit(1)
    await flushPromises()
    expect(wrapper.getComponent(NDataTable).props('size')).toBe('small')
    expect(
      wrapper.getComponent(NDataTable).getComponent(NInput).props('size')
    ).toBe('small')
    expect(wrapper.getComponent(NPagination).props('size')).toBe('small')
    expect(wrapper.getComponent(C_ActionBar).props('config')).toMatchObject({
      size: 'small',
      compact: true,
    })
    wrapper
      .getComponent(NDataTable)
      .getComponent(NInput)
      .vm.$emit('update:value', 'Draft')
    await flushPromises()
    await wrapper.setProps({
      config: {
        density: 'comfortable',
        edit: 'row',
        toolbar: { actions: [{ key: 'refresh' }] },
      },
    })
    expect(api.getEditingData()?.name).toBe('Draft')
    expect(
      wrapper.getComponent(NDataTable).getComponent(NInput).props('size')
    ).toBe('large')
    expect(wrapper.getComponent(NDataTable).props('size')).toBe('large')
    expect(wrapper.classes()).toContain('c-table-wrapper--comfortable')
    await wrapper.setProps({ config: { density: 'compact', edit: 'cell' } })
    expect(
      wrapper.getComponent(NDataTable).findComponent(NInput).exists()
    ).toBe(false)
    api.startEdit(1, 'name')
    await flushPromises()
    expect(
      wrapper.getComponent(NDataTable).getComponent(NInput).props('value')
    ).toBe('Original')
    expect(
      wrapper.getComponent(NDataTable).getComponent(NInput).props('size')
    ).toBe('small')
    await wrapper.setProps({ config: { edit: 'none' } })
    expect(
      wrapper.getComponent(NDataTable).findComponent(NInput).exists()
    ).toBe(false)
    expect(wrapper.classes()).not.toContain('c-table-wrapper--compact')
    expect(wrapper.emitted('update:data')).toBeUndefined()
    wrapper.unmount()
  })
})
