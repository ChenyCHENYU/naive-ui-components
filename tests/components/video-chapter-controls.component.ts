import { expect, test } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { NButton, NConfigProvider, NPopover, darkTheme } from 'naive-ui'
import ChapterMarkers from '../../src/components/C_VideoPlayer/components/ChapterMarkers.vue'

test('chapter portal uses native focusable buttons and retains its scoped accent', async () => {
  const current = { id: 'first', title: '开始', startTime: 0, endTime: 30 }
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(
          NConfigProvider,
          {
            theme: darkTheme,
            themeOverrides: { common: { primaryColor: '#c861aa' } },
          },
          {
            default: () =>
              h(ChapterMarkers, {
                chapters: [
                  current,
                  { id: 'next', title: '下一章', startTime: 30, endTime: 60 },
                ],
                currentChapter: current,
                currentIndex: 0,
              }),
          }
        ),
    }),
    { attachTo: document.body, global: { components: { NButton, NPopover } } }
  )
  await wrapper.get('.vp-chapter-trigger').trigger('click')
  await flushPromises()
  const popup = document.querySelector<HTMLElement>('.n-popover')!
  expect(popup.style.getPropertyValue('--c-theme-primary')).toBe('#c861aa')
  const buttons = popup.querySelectorAll<HTMLButtonElement>('.vp-chapter-item')
  expect(buttons).toHaveLength(2)
  expect(buttons[0].tagName).toBe('BUTTON')
  expect(buttons[0].type).toBe('button')
  expect(buttons[0].getAttribute('aria-current')).toBe('true')
  buttons[1].focus()
  expect(document.activeElement).toBe(buttons[1])
  buttons[1].click()
  expect(wrapper.getComponent(ChapterMarkers).emitted('goTo')).toEqual([
    ['next'],
  ])
  wrapper.unmount()
})
