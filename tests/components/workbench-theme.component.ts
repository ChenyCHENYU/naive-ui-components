import { readFileSync } from 'node:fs'
import { compileStyle } from '@vue/compiler-sfc'
import { flushPromises, mount } from '@vue/test-utils'
import { NConfigProvider } from 'naive-ui'
import { compileString } from 'sass'
import { afterEach, expect, test } from 'vitest'
import { defineComponent, h, ref, type CSSProperties } from 'vue'
import { createComponentTheme } from '../../src/adapters/naive/theme'
import { C_FilterBuilder } from '../../src/components/C_FilterBuilder'
import { C_ImportWizard } from '../../src/components/C_ImportWizard'
import { C_ResourceSchedule } from '../../src/components/C_ResourceSchedule'
import { C_TaskBoard } from '../../src/components/C_TaskBoard'

const styles: HTMLStyleElement[] = []
afterEach(() => styles.splice(0).forEach(style => style.remove()))

function addScopedStyles(component: string, root: Element) {
  const filename = `src/components/${component}/index.scss`
  // Vitest does not inject SFC CSS. Use its actual scope ID so the regression
  // exercises the same descendant and :deep() selectors as the published CSS.
  const id = [...root.attributes].find(({ name }) =>
    name.startsWith('data-v-')
  )?.name
  if (!id) throw new Error(`Missing scope ID for ${component}`)
  const { code, errors } = compileStyle({
    filename,
    source: compileString(readFileSync(filename, 'utf8')).css,
    id,
    scoped: true,
  })
  expect(errors).toEqual([])
  const element = document.createElement('style')
  element.textContent = code
  document.head.append(element)
  styles.push(element)
}

const outer = createComponentTheme({
  border: '#455a6f',
  text2: '#495967',
  bgMuted: '#eef2f9',
  bgBody: '#f9fafe',
  radius: 6,
})
const inner = createComponentTheme({
  mode: 'dark',
  border: '#847368',
  text2: '#d1c1b1',
  bgMuted: '#354153',
  bgBody: '#253347',
  radius: 8,
})
// A native Provider can independently configure the outline of an unselected booking.
inner.themeOverrides.common = {
  ...inner.themeOverrides.common,
  primaryColorSuppl: '#8c27b8',
}

const overrides = {
  '--c-border': '#772366',
  '--c-radius': '9px',
  '--c-radius-panel': '12px',
  '--c-text-2': '#a02d85',
  '--c-bg-muted': '#e0f3f8',
  '--c-bg-card': '#ffe9f5',
  '--c-bg-body': '#fdf8dc',
  '--c-primary': '#9653b9',
} satisfies CSSProperties

function workbench(style?: CSSProperties) {
  return [
    h(C_FilterBuilder<string>, { fields: [], style }),
    h(C_ImportWizard<string>, {
      fields: [],
      adapter: {
        read: async () => [],
        preview: async () => ({ plan: null, rowCount: 0 }),
        commit: async () => [],
      },
      style,
    }),
    h(C_TaskBoard, {
      columns: [{ key: 'new', label: 'New' }],
      tasks: [{ key: 1, title: 'Load truck', status: 'new' }],
      draggable: false,
      style,
    }),
    h(C_ResourceSchedule, {
      range: [0, 60_000],
      resources: [{ key: 1, label: 'Dock' }],
      bookings: [
        {
          key: 'load',
          label: 'Loading',
          resourceKey: 1,
          start: 0,
          end: 30_000,
        },
      ],
      style,
    }),
  ]
}

test('workbench surfaces resolve overrides locally and return to their own Provider when removed', async () => {
  const local = ref<CSSProperties | undefined>(overrides)
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(NConfigProvider, outer, () => [
          h('div', { class: 'local' }, workbench(local.value)),
          h('div', { class: 'sibling' }, workbench()),
          h(NConfigProvider, inner, () =>
            h('div', { class: 'nested' }, workbench())
          ),
        ]),
    }),
    { attachTo: document.body }
  )
  for (const [component, selector] of [
    ['C_FilterBuilder', '.c-filter-builder'],
    ['C_ImportWizard', '.c-import-wizard'],
    ['C_TaskBoard', '.c-task-board'],
    ['C_ResourceSchedule', '.c-resource-schedule'],
  ])
    addScopedStyles(component, wrapper.get(selector).element)

  const painted = (scope: string, selector: string) =>
    getComputedStyle(wrapper.get(`.${scope} ${selector}`).element)
  expect(painted('local', '.c-filter-builder__group')).toMatchObject({
    borderColor: '#772366',
    borderRadius: '12px',
  })
  expect(painted('local', '.c-import-wizard').color).toBe('#a02d85')
  expect(painted('local', '.c-task-board__column')).toMatchObject({
    borderColor: '#772366',
    borderRadius: '12px',
    backgroundColor: '#e0f3f8',
  })
  expect(painted('local', '.c-task-board__card')).toMatchObject({
    borderRadius: '9px',
    backgroundColor: '#ffe9f5',
  })
  expect(painted('local', '.c-resource-schedule__viewport')).toMatchObject({
    borderColor: '#772366',
    borderRadius: '12px',
  })
  expect(painted('local', '.c-resource-schedule__label').backgroundColor).toBe(
    '#fdf8dc'
  )
  expect(painted('local', '.c-resource-schedule__booking').borderColor).toBe(
    '#9653b9'
  )

  expect(painted('sibling', '.c-filter-builder__group').borderColor).toBe(
    '#455a6f'
  )
  expect(painted('nested', '.c-import-wizard').color).toBe('#d1c1b1')
  expect(painted('nested', '.c-task-board__column')).toMatchObject({
    borderColor: '#847368',
    borderRadius: '8px',
    backgroundColor: '#354153',
  })
  expect(painted('nested', '.c-resource-schedule__booking').borderColor).toBe(
    '#8c27b8'
  )

  local.value = { '--c-border': '#772366', '--c-filter-border': '#9b6442' }
  await flushPromises()
  expect(painted('local', '.c-filter-builder__group').borderColor).toBe(
    '#9b6442'
  )
  expect(painted('local', '.c-task-board__card').backgroundColor).toBe(
    '#f9fafe'
  )
  local.value = undefined
  await flushPromises()
  expect(painted('local', '.c-filter-builder__group')).toMatchObject({
    borderColor: '#455a6f',
    borderRadius: '6px',
  })
  expect(painted('local', '.c-import-wizard').color).toBe('#495967')
  expect(painted('nested', '.c-resource-schedule__booking').borderColor).toBe(
    '#8c27b8'
  )
})
