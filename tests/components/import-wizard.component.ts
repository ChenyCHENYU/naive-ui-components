import { flushPromises, mount } from '@vue/test-utils'
import { NSelect } from 'naive-ui'
import { h } from 'vue'
import { expect, test, vi } from 'vitest'
import {
  C_ImportWizard,
  type ImportWizardAdapter,
  type ImportWizardField,
  type ImportWizardPreview,
  type ImportWizardSheet,
} from '../../src/components/C_ImportWizard'

const fields = [
  { key: 'code', label: 'Code', required: true },
  { key: 'comment', label: 'Comment', required: true },
] satisfies ImportWizardField[]

const sheets = [
  {
    key: 'first',
    label: 'First',
    columns: [
      { key: 'code', label: 'Code' },
      { key: 'details', label: 'Details' },
    ],
  },
  {
    key: 'second',
    label: 'Second',
    columns: [
      { key: 'sourceCode', label: 'Code' },
      { key: 'note', label: 'Comment' },
    ],
  },
] satisfies ImportWizardSheet[]

function createAdapter() {
  return {
    read: vi.fn<ImportWizardAdapter<string, string>['read']>(
      async () => sheets
    ),
    preview: vi.fn<ImportWizardAdapter<string, string>['preview']>(
      async () => ({
        plan: 'plan-1',
        rowCount: 2,
      })
    ),
    commit: vi.fn<ImportWizardAdapter<string, string>['commit']>(async () => [
      { key: 1, status: 'success' },
      {
        key: 2,
        status: 'failure',
        message: 'Missing category',
        retryable: true,
      },
    ]),
  }
}

function createWizard(
  adapter: ImportWizardAdapter<string, string>,
  customResults = true
) {
  const wrapper = mount(C_ImportWizard<string, string>, {
    props: { fields, adapter, locale: { locale: 'en-US' } },
    slots: customResults
      ? {
          results: ({ results }) =>
            h('p', results.map(row => `${row.key}:${row.status}`).join(', ')),
        }
      : undefined,
  })
  const file = (name: string) =>
    new File(['Code,Details'], name, { type: 'text/csv' })
  const setFile = (source: File) => {
    const input = wrapper.get('input[type="file"]')
    Object.defineProperty(input.element, 'files', {
      configurable: true,
      value: [source],
    })
    return input.trigger('change')
  }
  const button = (label: string) =>
    wrapper.findAll('button').find(item => item.text() === label)!
  const select = (label: string) =>
    wrapper
      .findAllComponents(NSelect)
      .find(item => item.attributes('aria-label') === label)!
  return { wrapper, file, setFile, button, select }
}

test('keeps required mappings unique and submits the reviewed plan exactly once', async () => {
  const adapter = createAdapter()
  const { wrapper, file, setFile, button, select } = createWizard(adapter)
  const source = file('orders.csv')
  await setFile(source)
  await flushPromises()
  expect(select('Code').props('value')).toBe('code')
  expect(button('Validate data').attributes('disabled')).toBeDefined()
  select('Comment').vm.$emit('update:value', 'code')
  await wrapper.vm.$nextTick()
  expect(button('Validate data').attributes('disabled')).toBeDefined()
  select('Sheet').vm.$emit('update:value', 'second')
  await wrapper.vm.$nextTick()
  await button('Validate data').trigger('click')
  await flushPromises()
  expect(adapter.preview).toHaveBeenCalledWith(
    {
      file: source,
      sheetKey: 'second',
      mapping: [
        { field: 'code', column: 'sourceCode' },
        { field: 'comment', column: 'note' },
      ],
    },
    expect.any(AbortSignal)
  )
  const confirm = button('Confirm import')
  await Promise.all([confirm.trigger('click'), confirm.trigger('click')])
  await flushPromises()
  expect(adapter.commit).toHaveBeenCalledTimes(1)
  expect(adapter.commit).toHaveBeenCalledWith('plan-1', expect.any(AbortSignal))
  expect(wrapper.text()).toContain('1:success, 2:failure')
  expect(wrapper.emitted('completed')).toHaveLength(1)
  wrapper.unmount()
})

test('default import results show failed rows without a retry action', async () => {
  const { wrapper, file, setFile, button, select } = createWizard(
    createAdapter(),
    false
  )
  await setFile(file('orders.csv'))
  await flushPromises()
  select('Sheet').vm.$emit('update:value', 'second')
  await wrapper.vm.$nextTick()
  await button('Validate data').trigger('click')
  await flushPromises()
  await button('Confirm import').trigger('click')
  await vi.waitFor(() =>
    expect(wrapper.get('.c-batch-result').text()).toContain('Missing category')
  )
  expect(
    wrapper
      .get('.c-batch-result')
      .findAll('button')
      .some(node => node.text().startsWith('Retry eligible items'))
  ).toBe(false)
})

test('aborts replaced reads and ignores a preview fulfilled after cancel or scope change', async () => {
  const adapter = createAdapter()
  let resolveRead!: (value: readonly ImportWizardSheet[]) => void
  adapter.read.mockImplementationOnce(
    () =>
      new Promise(resolve => {
        resolveRead = resolve
      })
  )
  let resolvePreview!: (value: ImportWizardPreview<string>) => void
  adapter.preview.mockImplementationOnce(
    () =>
      new Promise(resolve => {
        resolvePreview = resolve
      })
  )
  const { wrapper, file, setFile, button, select } = createWizard(adapter)
  await setFile(file('old.csv'))
  const oldReadSignal = adapter.read.mock.calls[0][1]
  await setFile(file('new.csv'))
  await flushPromises()
  expect(oldReadSignal.aborted).toBe(true)
  resolveRead([])
  await flushPromises()
  expect(wrapper.text()).toContain('new.csv')
  expect(wrapper.emitted('failure')).toBeUndefined()

  select('Sheet').vm.$emit('update:value', 'second')
  await wrapper.vm.$nextTick()
  await button('Validate data').trigger('click')
  await button('Cancel validation').trigger('click')
  expect(adapter.preview.mock.calls[0][1].aborted).toBe(true)
  resolvePreview({ plan: 'stale', rowCount: 2 })
  await flushPromises()
  expect(button('Confirm import')).toBeUndefined()
  expect(button('Validate data').attributes('disabled')).toBeUndefined()

  await wrapper.setProps({ scope: 'next-order' })
  expect(wrapper.text()).not.toContain('new.csv')
  expect(wrapper.emitted('completed')).toBeUndefined()
  wrapper.unmount()
})

test('keeps blocked previews editable and locks an ambiguous commit against a retry', async () => {
  const adapter = createAdapter()
  adapter.preview.mockResolvedValueOnce({
    plan: 'blocked',
    rowCount: 2,
    issues: [
      { level: 'error', row: 0, field: 'Code', message: 'Duplicate code' },
    ],
  })
  adapter.commit.mockRejectedValueOnce(new Error('Connection dropped'))
  const { wrapper, file, setFile, button, select } = createWizard(adapter)
  await setFile(file('orders.csv'))
  await flushPromises()
  select('Sheet').vm.$emit('update:value', 'second')
  await wrapper.vm.$nextTick()
  await button('Validate data').trigger('click')
  await flushPromises()
  expect(wrapper.text()).toContain('Row 0')
  expect(wrapper.text()).toContain('Duplicate code')
  expect(button('Confirm import').attributes('disabled')).toBeDefined()
  await button('Back to mapping').trigger('click')
  await button('Validate data').trigger('click')
  await flushPromises()
  await button('Confirm import').trigger('click')
  await flushPromises()
  expect(wrapper.text()).toContain('Import outcome is unknown')
  expect(button('Confirm import').attributes('disabled')).toBeDefined()
  expect(button('Back to mapping').attributes('disabled')).toBeDefined()
  expect(wrapper.emitted('failure')?.[0][0]).toBe('commit')
  expect(adapter.commit).toHaveBeenCalledTimes(1)
  wrapper.unmount()
})
