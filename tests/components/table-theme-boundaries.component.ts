import { expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import {
  NAlert,
  NCard,
  NConfigProvider,
  NEmpty,
  NGrid,
  NGridItem,
  NSpace,
  darkTheme,
} from 'naive-ui'
import Table from '../../src/components/C_Table/index.vue'
import type { TableInstance } from '../../src/components/C_Table/types'
import Form from '../../src/components/C_Form/index.vue'

interface Row {
  id: number
  name: string
}
const components = { NAlert, NCard, NEmpty, NGrid, NGridItem, NSpace }

function mountTable() {
  const primary = ref('#f472b6')
  const table = ref<TableInstance<Row>>()
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(
          NConfigProvider,
          {
            theme: darkTheme,
            themeOverrides: {
              common: { cardColor: '#101820', primaryColor: '#22c55e' },
            },
          },
          () =>
            h(Table<Row>, {
              ref: table,
              data: [{ id: 1, name: '成员' }],
              columns: [{ key: 'name', title: '姓名' }],
              style: {
                '--c-primary': primary.value,
                '--c-bg-card': '#203040',
                width: '850px',
              },
              config: { pagination: false, edit: { mode: 'modal' } },
            })
        ),
    }),
    { attachTo: document.body, global: { components } }
  )
  return { wrapper, primary, table }
}

test('table edit Teleport preserves local Provider and explicit semantic colors while retaining modal layout ownership', async () => {
  const { wrapper, primary, table } = mountTable()
  table.value!.startEdit(1)
  await vi.waitFor(() =>
    expect(wrapper.findComponent(Form).exists()).toBe(true)
  )
  await flushPromises()
  const modal = document.querySelector<HTMLElement>('.c-table-edit-modal')!
  expect(modal.style.getPropertyValue('--c-theme-bg-card')).toBe('#101820')
  expect(modal.style.getPropertyValue('--c-theme-primary')).toBe('#22c55e')
  expect(modal.style.getPropertyValue('--c-primary')).toBe('#f472b6')
  expect(modal.style.getPropertyValue('--c-bg-card')).toBe('#203040')
  expect(modal.style.width).toBe('600px')
  primary.value = '#a78bfa'
  await flushPromises()
  expect(modal.style.getPropertyValue('--c-primary')).toBe('#a78bfa')
  expect(modal.style.width).toBe('600px')
  wrapper.unmount()
})

test('table settings Drawer receives scoped semantic overrides without copying host width', async () => {
  const { wrapper, primary } = mountTable()
  await wrapper.get('.column-settings-btn').trigger('click')
  await flushPromises()
  const content = document.querySelector<HTMLElement>('.n-drawer-content')!
  expect(content.style.getPropertyValue('--c-theme-bg-card')).toBe('#101820')
  expect(content.style.getPropertyValue('--c-primary')).toBe('#f472b6')
  expect(content.style.getPropertyValue('--c-bg-card')).toBe('#203040')
  expect(content.style.width).toBe('')
  primary.value = '#a78bfa'
  await flushPromises()
  expect(content.style.getPropertyValue('--c-primary')).toBe('#a78bfa')
  expect(content.style.width).toBe('')
  wrapper.unmount()
})
