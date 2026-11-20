import { expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { NPagination } from 'naive-ui'
import WordViewer from '../../src/components/C_FilePreview/components/WordViewer/index.vue'
import ExcelViewer from '../../src/components/C_FilePreview/components/ExcelViewer/index.vue'
import { processExcelSheet } from '../../src/components/C_FilePreview/excel'

test('Word outline navigation stays inside its own document, including special IDs', async () => {
  const targets: string[] = []
  vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(function (
    this: Element
  ) {
    targets.push(this.textContent ?? '')
  })
  const heading = { id: 'heading:0', text: 'Heading', level: 1 }
  mount(WordViewer, {
    attachTo: document.body,
    props: { content: '<h1 id="heading:0">First</h1>', headings: [heading] },
    global: { stubs: { C_Icon: true } },
  })
  const second = mount(WordViewer, {
    attachTo: document.body,
    props: { content: '<h1 id="heading:0">Second</h1>', headings: [heading] },
    global: { stubs: { C_Icon: true } },
  })
  await second.get('.outline-item').trigger('click')
  expect(targets).toEqual(['Second'])
})

test('Excel projects a cross-page merged anchor and spans without changing parsed data', async () => {
  const merges = [{ s: { r: 48, c: 0 }, e: { r: 102, c: 1 } }]
  const worksheet = { '!ref': 'A1:C110', A49: { t: 's', v: '业务组' } }
  const sheet = {
    name: 'Sheet',
    merges,
    ...processExcelSheet(worksheet, merges),
  }
  const original = JSON.stringify(sheet)
  const wrapper = mount(ExcelViewer, {
    props: { sheets: [sheet] },
    global: { stubs: { C_Icon: true } },
  })
  const pagination = wrapper.getComponent(NPagination)
  const anchor = () =>
    wrapper.findAll('.excel-cell').find(cell => cell.text() === '业务组')!
  expect(anchor().attributes('rowspan')).toBe('2')
  expect(anchor().attributes('colspan')).toBe('2')
  pagination.vm.$emit('update:page', 2)
  await flushPromises()
  expect(anchor().attributes('rowspan')).toBe('50')
  expect(anchor().attributes('colspan')).toBe('2')
  expect(anchor().attributes('style') ?? '').not.toContain('display: none')
  pagination.vm.$emit('update:page', 3)
  await flushPromises()
  expect(anchor().attributes('rowspan')).toBe('3')
  pagination.vm.$emit('update:page-size', 100)
  await flushPromises()
  expect(anchor().attributes('rowspan')).toBe('52')
  expect(JSON.stringify(sheet)).toBe(original)
})
