import { describe, expect, test, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { usePrintWatermark } from '../../src/components/C_Table/composables/usePrintWatermark'

const print = vi.hoisted(() => vi.fn())
vi.mock('print-js', () => ({ default: print }))

function createPrinter() {
  let printer!: ReturnType<typeof usePrintWatermark>
  const wrapper = mount(
    defineComponent({
      setup() {
        printer = usePrintWatermark()
        return () => h('div')
      },
    })
  )
  return { wrapper, printer }
}

describe('print engine contract', () => {
  test('synchronous engine errors use the same once-only failure observer', async () => {
    const { wrapper, printer } = createPrinter()
    try {
      const failed = vi.fn()
      print.mockImplementationOnce(() => {
        throw new Error('sync engine failure')
      })
      await expect(
        printer.utils.printImage('data:image/png;base64,AAA', {
          onError: failed,
        })
      ).rejects.toThrow('sync engine failure')
      expect(failed).toHaveBeenCalledOnce()
      expect(failed.mock.calls[0][0]).toBeInstanceOf(Error)
    } finally {
      wrapper.unmount()
    }
  })
  test('forwards actual page CSS and safe text decoration, then settles after dialog closure', async () => {
    const { wrapper, printer } = createPrinter()
    try {
      const closed = vi.fn(() => {
        throw new Error('observer')
      })
      const promise = printer.utils.printImage('data:image/png;base64,AAA', {
        orientation: 'landscape',
        paperSize: 'A3',
        margin: '8mm',
        header: '<库存>',
        footer: '签字：',
        onPrintDialogClose: closed,
      })
      await vi.waitFor(() => expect(print).toHaveBeenCalledOnce())
      const options = print.mock.calls[0][0]
      expect(options.type).toBe('raw-html')
      expect(options.style).toContain(
        '@page { size: A3 landscape; margin: 8mm; }'
      )
      expect(options.printable).toContain('&lt;库存&gt;')
      expect(options.printable).toContain('<footer')
      options.onPrintDialogClose()
      await expect(promise).resolves.toBeUndefined()
      expect(closed).toHaveBeenCalledOnce()
    } finally {
      wrapper.unmount()
    }
  })

  test('asynchronous print failures reject even when callbacks throw or dialog cleanup follows', async () => {
    const { wrapper, printer } = createPrinter()
    try {
      const error = new Error('engine failed')
      const failed = vi.fn(() => {
        throw new Error('observer')
      })
      const promise = printer.utils.printImage('data:image/png;base64,AAA', {
        onError: failed,
      })
      const assertion = expect(promise).rejects.toThrow('engine failed')
      await vi.waitFor(() => expect(print).toHaveBeenCalledOnce())
      const options = print.mock.calls[0][0]
      expect(options.type).toBe('image')
      options.onError(error)
      options.onPrintDialogClose()
      await assertion
      expect(failed).toHaveBeenCalledExactlyOnceWith(error)
    } finally {
      wrapper.unmount()
    }
  })
})
