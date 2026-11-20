import { DOMWrapper, mount } from '@vue/test-utils'
import { expect, test, vi } from 'vitest'
import C_GlobalSearch from '../../src/components/C_GlobalSearch/index.vue'
import type {
  GlobalSearchCommandItem,
  GlobalSearchCommandSource,
  GlobalSearchOptions,
} from '../../src/components/C_GlobalSearch/types'

const body = () => new DOMWrapper(document.body)
function setup(
  commands: GlobalSearchOptions['commands'],
  menus: GlobalSearchOptions['menuItems'] = () => []
) {
  return mount(C_GlobalSearch, {
    attachTo: document.body,
    props: { options: { menuItems: menus, commands } },
  })
}
type Wrapper = ReturnType<typeof setup>
async function open(wrapper: Wrapper) {
  const trigger = wrapper.get<HTMLButtonElement>('.robot-search-trigger')
  trigger.element.focus()
  await trigger.trigger('click')
  return body().get<HTMLInputElement>('.robot-search-input')
}
const commandRows = () => body().findAll('[data-command-index]')

test('jumps from the synchronous menu to a grouped command and restores focus without storing results', async () => {
  const item = { key: 1, label: '发运任务 1', description: '当天待装车' }
  const query = vi.fn(() => [item])
  const onSelect = vi.fn()
  const storageKey = 'command-search-private'
  localStorage.setItem(
    storageKey,
    JSON.stringify([{ menuKey: '/ship', timestamp: 1 }])
  )
  const wrapper = setup(
    {
      sources: [{ key: 'shipment', title: '发运记录', search: query }],
      debounce: 0,
    },
    () => [{ key: '/ship', label: '发运管理' }]
  )
  try {
    await wrapper.setProps({
      options: { ...wrapper.props('options'), storageKey, onSelect },
    })
    const input = await open(wrapper)
    expect(document.activeElement).toBe(input.element)
    expect(query).not.toHaveBeenCalled()
    expect(body().get('.robot-history-item').text()).toContain('发运管理')
    await input.setValue('发运')
    await vi.waitFor(() => expect(commandRows()).toHaveLength(1))
    const option = commandRows()[0]
    expect(option.attributes('aria-posinset')).toBe('2')
    expect(option.attributes('aria-setsize')).toBe('2')
    await input.trigger('keydown', { key: 'ArrowDown' })
    expect(input.attributes('aria-activedescendant')).toBe(
      option.attributes('id')
    )
    await input.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('command-select')).toEqual([['shipment', item]])
    expect(onSelect).not.toHaveBeenCalled()
    expect(JSON.parse(localStorage.getItem(storageKey)!)).toEqual([
      { menuKey: '/ship', timestamp: 1 },
    ])
    expect(document.activeElement).toBe(
      wrapper.get('.robot-search-trigger').element
    )
  } finally {
    wrapper.unmount()
    localStorage.removeItem(storageKey)
  }
})

test('cancels old queries and rejects stale clicks on permission scope changes', async () => {
  const resolvers: Array<(items: GlobalSearchCommandItem[]) => void> = []
  const query = vi.fn<GlobalSearchCommandSource['search']>(
    () => new Promise(resolve => resolvers.push(resolve))
  )
  const sources = [{ key: 'entities', title: '物料', search: query }]
  const wrapper = setup({ sources, debounce: 0, scope: 'tenant-a' })
  try {
    const input = await open(wrapper)
    await input.setValue('old')
    await vi.waitFor(() => expect(query).toHaveBeenCalledTimes(1))
    const oldSignal = query.mock.calls[0][1].signal
    await input.setValue('new')
    expect(oldSignal.aborted).toBe(true)
    await vi.waitFor(() => expect(query).toHaveBeenCalledTimes(2))
    resolvers[0]([{ key: 'old', label: '过期' }])
    const authorized = { key: 'new', label: '当前范围的结果' }
    resolvers[1]([authorized])
    await vi.waitFor(() =>
      expect(commandRows().map(row => row.text())).toEqual(['当前范围的结果'])
    )
    const oldElement = commandRows()[0].element
    await wrapper.setProps({
      options: {
        menuItems: () => [],
        commands: { sources, debounce: 0, scope: 'tenant-b' },
      },
    })
    oldElement.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(wrapper.emitted('command-select')).toBeUndefined()
    await vi.waitFor(() => expect(query).toHaveBeenCalledTimes(3))
    const currentRequest = query.mock.calls[2][1]
    expect(currentRequest.scope).toBe('tenant-b')
    await input.trigger('keydown', { key: 'Escape' })
    expect(currentRequest.signal.aborted).toBe(true)
    resolvers[2]([{ key: 'late', label: '延迟结果' }])
    const reopened = await open(wrapper)
    expect(reopened.element.value).toBe('')
    expect(commandRows()).toHaveLength(0)
  } finally {
    wrapper.unmount()
  }
})

test('bounds concurrent sources, keeps group order and allows failed sources to be retried', async () => {
  const pending = new Map<number, (items: GlobalSearchCommandItem[]) => void>()
  const sources = Array.from({ length: 5 }, (_, index) => ({
    key: `group-${index}`,
    title: `Group ${index}`,
    search: vi.fn<GlobalSearchCommandSource['search']>(
      () => new Promise(resolve => pending.set(index, resolve))
    ),
  }))
  sources[0].search.mockRejectedValueOnce(new Error('private failure'))
  const wrapper = setup({ sources, debounce: 0 })
  try {
    const input = await open(wrapper)
    await input.setValue('command')
    await vi.waitFor(() => expect([...pending.keys()]).toEqual([1, 2, 3]))
    expect(sources[4].search).not.toHaveBeenCalled()
    pending.get(2)!([
      { key: 0, label: 'C2' },
      { key: 0, label: 'Duplicate' },
    ])
    await vi.waitFor(() => expect(pending.has(4)).toBe(true))
    for (const index of [1, 3, 4])
      pending.get(index)!([{ key: 0, label: `C${index}` }])
    await vi.waitFor(() =>
      expect(commandRows().map(row => row.text())).toEqual([
        'C1',
        'C2',
        'C3',
        'C4',
      ])
    )
    expect(body().text()).toContain('部分搜索来源加载失败')
    expect(body().text()).not.toContain('private failure')
    await body().get('.robot-command-status button').trigger('click')
    expect(document.activeElement).toBe(input.element)
    await vi.waitFor(() => expect(sources[0].search).toHaveBeenCalledTimes(2))
  } finally {
    wrapper.unmount()
  }
})
