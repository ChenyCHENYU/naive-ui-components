import { DOMWrapper, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { expect, test } from 'vitest'
import ContextMenu from '../../src/components/C_ContextMenu/index.vue'
import type { ContextMenuItem } from '../../src/components/C_ContextMenu/types'

const body = () => new DOMWrapper(document.body)
function item(label: string) {
  const result = body()
    .findAll('[role="menuitem"]')
    .find(node => node.find('.c-context-menu__label').text() === label)
  if (!result) throw new Error(`Missing menu item: ${label}`)
  return result
}
const focusedLabel = () =>
  document.activeElement?.querySelector('.c-context-menu__label')?.textContent

async function open(items: ContextMenuItem[]) {
  document.elementsFromPoint = () => []
  const wrapper = mount(ContextMenu, {
    attachTo: document.body,
    props: { items },
  })
  wrapper.vm.open(10, 10)
  await nextTick()
  return wrapper
}

const nestedItems: ContextMenuItem[] = [
  {
    key: 'parent',
    label: 'Parent',
    children: [
      { key: 'first', label: 'First' },
      { key: 'disabled', label: 'Disabled', disabled: true },
      { key: 'hidden', label: 'Hidden', hidden: true },
      { key: 'last', label: 'Last' },
    ],
  },
  { key: 'peer', label: 'Peer' },
]

test('nested menu vertical keys stay in the current level and skip unavailable items', async () => {
  const wrapper = await open(nestedItems)
  await item('Parent').trigger('keydown', { key: 'ArrowRight' })
  expect(focusedLabel()).toBe('First')
  await item('First').trigger('keydown', { key: 'ArrowDown' })
  expect(focusedLabel()).toBe('Last')
  await item('Last').trigger('keydown', { key: 'ArrowDown' })
  expect(focusedLabel()).toBe('First')
  await item('First').trigger('keydown', { key: 'ArrowUp' })
  expect(focusedLabel()).toBe('Last')
  await item('Last').trigger('keydown', { key: 'Home' })
  expect(focusedLabel()).toBe('First')
  await item('First').trigger('keydown', { key: 'End' })
  expect(focusedLabel()).toBe('Last')
  expect(wrapper.emitted('select')).toBeUndefined()
})

test('ArrowLeft closes only its owning submenu and returns focus to its parent', async () => {
  await open([
    {
      key: 'parent',
      label: 'Parent',
      children: [
        {
          key: 'branch',
          label: 'Branch',
          children: [{ key: 'leaf', label: 'Leaf' }],
        },
      ],
    },
  ])
  await item('Parent').trigger('keydown', { key: 'ArrowRight' })
  await item('Branch').trigger('keydown', { key: 'ArrowRight' })
  expect(focusedLabel()).toBe('Leaf')
  await item('Leaf').trigger('keydown', { key: 'ArrowLeft' })
  expect(focusedLabel()).toBe('Branch')
  expect(item('Branch').attributes('aria-expanded')).toBe('false')
  expect(item('Parent').attributes('aria-expanded')).toBe('true')
  expect(body().findAll('.c-context-menu__submenu')).toHaveLength(1)
  await item('Branch').trigger('keydown', { key: 'ArrowLeft' })
  expect(focusedLabel()).toBe('Parent')
  expect(item('Parent').attributes('aria-expanded')).toBe('false')
  expect(body().find('.c-context-menu__submenu').exists()).toBe(false)
})

test('root navigation ignores expanded descendants and reopening starts at the root', async () => {
  const wrapper = await open(nestedItems)
  await item('Parent').trigger('keydown', { key: 'ArrowRight' })
  // Repositioning an open menu must not start inside the previous submenu.
  wrapper.vm.open(20, 20)
  await nextTick()
  expect(focusedLabel()).toBe('Parent')
  await item('Parent').trigger('keydown', { key: 'ArrowDown' })
  expect(focusedLabel()).toBe('Peer')
  await item('Peer').trigger('keydown', { key: 'Home' })
  expect(focusedLabel()).toBe('Parent')
  await item('Parent').trigger('keydown', { key: 'End' })
  expect(focusedLabel()).toBe('Peer')
})
