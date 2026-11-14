import { afterEach, expect, test } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import {
  darkTheme,
  NButton,
  NConfigProvider,
  NDropdown,
  NDatePicker,
  NForm,
  NFormItem,
  NInput,
  NTimePicker,
  NTag,
  NTooltip,
} from 'naive-ui'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { compileString } from 'sass'
import { compileStyle } from '@vue/compiler-sfc'
import ActionBar from '../../src/components/C_ActionBar/index.vue'
import AvatarGroup from '../../src/components/C_AvatarGroup/index.vue'
import CollapsePanel from '../../src/components/C_CollapsePanel/index.vue'
import ContextMenu from '../../src/components/C_ContextMenu/index.vue'
import Density from '../../src/components/C_Density/index.vue'
import DateComponent from '../../src/components/C_Date/index.vue'
import TimeComponent from '../../src/components/C_Time/index.vue'
import Draggable from '../../src/components/C_Draggable/index.vue'
import GlobalSearch from '../../src/components/C_GlobalSearch/index.vue'
import Icon from '../../src/components/C_Icon/index.vue'
import Skeleton from '../../src/components/C_Skeleton/index.vue'
import SplitPane from '../../src/components/C_SplitPane/index.vue'
import Steps from '../../src/components/C_Steps/index.vue'
import Tabs from '../../src/components/C_Tabs/index.vue'
import TagsView from '../../src/components/C_TagsView/index.vue'
import Timeline from '../../src/components/C_Timeline/index.vue'

const nativeComponents = { NTag, NDropdown, NTooltip }
const styles: HTMLStyleElement[] = []
const { elementsFromPoint } = document

/** Compile the real stylesheet: assertions exercise the cascade, not a copy of its declarations. */
function applyStyles(component: string) {
  const source = readFileSync(
    resolve(process.cwd(), 'src/components', component, 'index.scss'),
    'utf8'
  )
  const css = compileStyle({
    source: compileString(source).css,
    id: 'data-v-visual-regression',
    scoped: true,
    filename: `${component}.css`,
  })
  expect(css.errors).toEqual([])
  const style = document.createElement('style')
  style.textContent = css.code.replaceAll('[data-v-visual-regression]', '')
  document.head.append(style)
  styles.push(style)
}
afterEach(() => {
  styles.splice(0).forEach(style => style.remove())
  document.elementsFromPoint = elementsFromPoint
})

test('a density scope adjusts ActionBar defaults while explicit button and bar sizes win', async () => {
  const density = ref<'compact' | 'comfortable'>('compact')
  const scoped = ref(true)
  const wrapper = mount(
    defineComponent({
      setup: () => () => {
        const content = () => [
          h(ActionBar, { actions: [{ key: 'add' }] }),
          h(ActionBar, {
            config: { size: 'medium' },
            actions: [
              { key: 'save' },
              { key: 'cancel', size: 'tiny' },
              { key: 'view', size: 'tiny', buttonProps: { size: 'large' } },
            ],
          }),
        ]
        return scoped.value
          ? h(Density, { density: density.value }, { default: content })
          : h('div', content())
      },
    })
  )
  expect(
    wrapper.findAllComponents(NButton).map(button => button.props('size'))
  ).toEqual(['small', 'medium', 'tiny', 'large'])
  density.value = 'comfortable'
  await nextTick()
  expect(
    wrapper.findAllComponents(NButton).map(button => button.props('size'))
  ).toEqual(['large', 'medium', 'tiny', 'large'])
  scoped.value = false
  await nextTick()
  expect(
    wrapper.findAllComponents(NButton).map(button => button.props('size'))
  ).toEqual(['tiny', 'medium', 'tiny', 'large'])
})

test('Date and Time inherit an explicit density scope without replacing native Form defaults', async () => {
  const scope = ref<'compact' | 'comfortable'>('compact')
  const scoped = ref(true)
  const SmartDate = DateComponent<'smart-range'>
  const SingleTime = TimeComponent<'single'>
  const RangeTime = TimeComponent<'range'>
  const wrapper = mount(
    defineComponent({
      setup: () => () => {
        const content = () => [
          h(DateComponent),
          h(SmartDate, {
            mode: 'smart-range',
            endDateProps: { size: 'large' },
          }),
          h(SingleTime, { mode: 'single' }),
          h(RangeTime, { mode: 'range', endTimeProps: { size: 'large' } }),
        ]
        return h(
          NForm,
          { size: 'large' },
          {
            default: () =>
              h(
                NFormItem,
                { label: 'Schedule' },
                {
                  default: () =>
                    scoped.value
                      ? h(
                          Density,
                          { density: scope.value },
                          { default: content }
                        )
                      : content(),
                }
              ),
          }
        )
      },
    })
  )
  const sizes = () =>
    [NDatePicker, NTimePicker].map(component =>
      wrapper.findAllComponents(component).map(picker => picker.props('size'))
    )
  expect(sizes()).toEqual([
    ['small', 'small', 'large'],
    ['small', 'small', 'large'],
  ])
  scope.value = 'comfortable'
  await nextTick()
  expect(sizes()).toEqual([
    ['large', 'large', 'large'],
    ['large', 'large', 'large'],
  ])
  scoped.value = false
  await nextTick()
  expect(sizes()).toEqual([
    [undefined, undefined, 'large'],
    [undefined, undefined, 'large'],
  ])
  expect(
    wrapper
      .findAllComponents(NInput)
      .every(
        input =>
          (input.element as HTMLElement).style.getPropertyValue(
            '--n-height'
          ) === '40px'
      )
  ).toBe(true)
})

test('custom drawing surfaces update together inside the active local Provider', async () => {
  const dark = ref(false)
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(
          NConfigProvider,
          {
            theme: dark.value ? darkTheme : null,
            themeOverrides: { common: { primaryColor: '#8b5cf6' } },
          },
          {
            default: () => [
              h(AvatarGroup, {
                items: [{ id: 'a', name: 'A', status: 'online' }],
              }),
              h(CollapsePanel, { items: [{ key: 'one', title: 'One' }] }),
              h(Draggable, { modelValue: [{ id: 'a', title: 'A' }] }),
              h(Skeleton),
              h(SplitPane),
              h(Steps, { steps: [{ title: 'One' }] }),
            ],
          }
        ),
    }),
    { global: { components: nativeComponents } }
  )
  const surfaces = [
    '.c-avatar-group',
    '.c-collapse-panel',
    '.c-draggable-wrapper',
    '.c-skeleton',
    '.c-split-pane',
    '.c-steps',
  ]
  for (const selector of surfaces)
    expect(
      wrapper
        .get<HTMLElement>(selector)
        .element.style.getPropertyValue('--c-theme-primary')
    ).toBe('#8b5cf6')
  const light = wrapper
    .get<HTMLElement>('.c-skeleton')
    .element.style.getPropertyValue('--c-theme-skeleton-bg')
  dark.value = true
  await nextTick()
  for (const selector of surfaces)
    expect(
      wrapper
        .get<HTMLElement>(selector)
        .element.style.getPropertyValue('--c-theme-bg-card')
    ).toBe(darkTheme.common?.cardColor)
  expect(
    wrapper
      .get<HTMLElement>('.c-skeleton')
      .element.style.getPropertyValue('--c-theme-skeleton-bg')
  ).not.toBe(light)
})

test('Tabs keeps native large typography, disabled state and custom primary colors', async () => {
  applyStyles('C_Tabs')
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(
          NConfigProvider,
          {
            theme: darkTheme,
            themeOverrides: { common: { primaryColor: '#8b5cf6' } },
          },
          {
            default: () =>
              h(Tabs, {
                size: 'large',
                items: [
                  { key: 'a', label: 'A' },
                  { key: 'b', label: 'B', disabled: true },
                ],
              }),
          }
        ),
    }),
    { attachTo: document.body }
  )
  await flushPromises()
  const root = wrapper.get<HTMLElement>('.n-tabs').element
  expect(root.style.getPropertyValue('--n-tab-font-size')).toBe('16px')
  expect(root.style.getPropertyValue('--n-bar-color')).toBe('#8b5cf6')
  expect(getComputedStyle(wrapper.get('.n-tabs-tab').element).fontSize).toBe(
    '16px'
  )
  expect(wrapper.find('.n-tabs-tab--disabled').exists()).toBe(true)
})

test('TagsView exposes its real active route and leaves a stable close-button hit area', async () => {
  applyStyles('C_TagsView')
  const router = createRouter({
    history: createMemoryHistory(),
    routes: ['/home', '/other'].map(path => ({
      path,
      component: { render: () => null },
      meta: { title: path },
    })),
  })
  await router.push('/home')
  const wrapper = mount(TagsView, {
    attachTo: document.body,
    props: { persistKey: '', homeIcon: '' },
    global: { plugins: [router], components: nativeComponents },
  })
  await router.push('/other')
  await flushPromises()
  expect(wrapper.findAll('.n-tag.is-active')).toHaveLength(1)
  expect(wrapper.get('.n-tag.is-active').attributes('data-path')).toBe('/other')
  const close = wrapper.get('.n-tag.is-active .n-tag__close').element
  expect(getComputedStyle(close).width).toBe('22px')
  expect(getComputedStyle(close).height).toBe('22px')
  expect(getComputedStyle(close).transform).not.toContain('0.6')
})

test('Icon loading renders a correctly sized ring and Timeline never clips expanded content', async () => {
  applyStyles('C_Icon')
  applyStyles('C_Timeline')
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h('div', [
          h(Icon, { name: 'mdi:check', size: 32, loading: true }),
          h(Timeline, {
            items: [
              {
                id: 'plain',
                title: 'Long content',
                content: '<p>'.concat('line<br>'.repeat(100), 'end-marker</p>'),
              },
              {
                id: 'expandable',
                title: 'Expandable',
                content: '<p>expanded-end</p>',
                collapsible: true,
              },
            ],
          }),
        ]),
    }),
    { attachTo: document.body }
  )
  const spinner = getComputedStyle(wrapper.get('.c-icon__spinner').element)
  expect(spinner.display).toBe('block')
  expect(spinner.boxSizing).toBe('border-box')
  expect(wrapper.get('.c-timeline__detail').text()).toContain('end-marker')
  expect(
    getComputedStyle(wrapper.get('.c-timeline__detail').element).maxHeight
  ).toBe('none')
  await wrapper.get('.c-timeline__collapse-trigger').trigger('click')
  expect(wrapper.text()).toContain('expanded-end')
  expect(
    wrapper
      .findAll('.c-timeline__detail')
      .every(item => getComputedStyle(item.element).maxHeight === 'none')
  ).toBe(true)
})

test('teleported surfaces retain local theme and explicit CSS overrides', async () => {
  document.elementsFromPoint = () => []
  const explicitDark = ref<boolean>()
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(
          NConfigProvider,
          {
            theme: darkTheme,
            themeOverrides: { common: { primaryColor: '#8b5cf6' } },
          },
          {
            default: () => [
              h(ContextMenu, {
                items: [{ key: 'one', label: 'One' }],
                style: { '--c-primary': '#ee2277' },
              }),
              h(GlobalSearch, {
                options: {
                  menuItems: () => [],
                  ...(explicitDark.value === undefined
                    ? {}
                    : { isDark: () => explicitDark.value === true }),
                },
              }),
            ],
          }
        ),
    }),
    { attachTo: document.body }
  )
  wrapper.getComponent(ContextMenu).vm.open(10, 10)
  await wrapper.get('.robot-search-trigger').trigger('click')
  await flushPromises()
  const menu = document.querySelector<HTMLElement>('.c-context-menu')!
  expect(menu.style.getPropertyValue('--c-theme-primary')).toBe('#8b5cf6')
  expect(menu.style.getPropertyValue('--c-primary')).toBe('#ee2277')
  const search = document.querySelector<HTMLElement>('.robot-dialog-overlay')!
  expect(search.style.getPropertyValue('--c-theme-primary')).toBe('#8b5cf6')
  expect(search.querySelector('.dialog-dark')).not.toBeNull()
  explicitDark.value = false
  await nextTick()
  expect(document.querySelector('.dialog-dark')).toBeNull()
})
