import { test, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, ref, h, reactive, nextTick } from 'vue'
import ER from '../../src/components/C_AntV/layout/ER/index.vue'
import { useUploadCore } from '../../src/components/C_Upload/composables/useUploadCore'
import { createUploadScheduler } from '../../src/components/C_Upload/composables/uploadScheduler'
import type { UploadRequestOptions } from '../../src/components/C_Upload/types'
import { useWorkflowNodes } from '../../src/components/C_WorkFlow/composables/useWorkflowNodes'
import {
  formatCellValue,
  processExcelSheet,
} from '../../src/components/C_FilePreview/data'
vi.mock('@antv/x6', async importOriginal => {
  const actual: any = await importOriginal()
  return {
    ...actual,
    Graph: class extends actual.Model {
      options: any
      static registerNode = actual.Graph.registerNode
      static registerPortLayout = actual.Graph.registerPortLayout
      static registerEdge = actual.Graph.registerEdge
      constructor(options: any) {
        super()
        this.options = options
      }
      getCellById(id: string) {
        return this.getCell(id)
      }
      clearCells() {
        this.clear()
      }
      centerContent() {}
      zoomToFit() {}
    },
  }
})
test('ER drag publishes a position snapshot and external data replacement remains silent', async () => {
  const wrapper = mount(ER, {
    props: {
      showToolbar: false,
      data: {
        tables: [{ id: 'a', name: 'a', fields: [], position: { x: 0, y: 0 } }],
        relations: [],
      },
    },
  })
  await flushPromises()
  const graph = wrapper.vm.getGraph()!
  const node = graph.getCellById('a')
  node.setPosition(90, 140, { ui: true })
  graph.trigger('node:moved', { node })
  await nextTick()
  expect(wrapper.vm.getData().tables[0].position).toEqual({ x: 90, y: 140 })
  expect(wrapper.emitted('data-change')).toHaveLength(1)
  const emitted: any = wrapper.emitted('data-change')![0][0]
  expect(emitted.tables[0].position).toEqual({ x: 90, y: 140 })
  await wrapper.setProps({
    data: {
      tables: [{ id: 'a', name: 'new', fields: [], position: { x: 0, y: 0 } }],
      relations: [],
    },
  })
  expect(wrapper.emitted('data-change')).toHaveLength(1)
  wrapper.unmount()
})
test('chunk and ordinary files share one concurrency budget and clear never dispatches pending requests', async () => {
  let core: any
  let requests = 0
  const wrapper = mount(
    defineComponent({
      setup() {
        core = useUploadCore({
          chunked: true,
          chunkSize: 1,
          concurrency: 2,
          customRequest: () => {
            requests++
            return { abort() {} }
          },
        })
        return () => h('div')
      },
    })
  )
  const items = core.addFiles([
    new File(['abc'], 'a.txt'),
    new File(['abc'], 'b.txt'),
    new File(['a'], 'c.txt'),
  ])
  items.forEach((i: any) => (i.hash = 'precomputed'))
  core.startUpload()
  await flushPromises()
  expect(requests).toBe(2)
  core.clearAll()
  await flushPromises()
  expect(requests).toBe(2)
  wrapper.unmount()
})
test('workflow commits canvas gestures once after the SDK applies changes and ignores parent fills', async () => {
  let core: any
  const emits: any[] = []
  const props = reactive({
    modelValue: {
      nodes: [
        {
          id: 'start',
          type: 'start',
          position: { x: 0, y: 0 },
          data: { title: 'Start', status: 'active' },
        },
      ],
      edges: [],
    },
    users: [],
    roles: [],
    departments: [],
    readonly: false,
  })
  const wrapper = mount(
    defineComponent({
      setup() {
        core = useWorkflowNodes(
          props as any,
          ((...args: any[]) => emits.push(args)) as any,
          ref()
        )
        return () => h('div')
      },
    })
  )
  core.nodes.value[0].position = { x: 60, y: 80 }
  await nextTick()
  expect(emits).toEqual([])
  core.commitCanvasChange()
  core.commitCanvasChange()
  await nextTick()
  expect(emits.map(e => e[0])).toEqual(['update:modelValue', 'change'])
  expect(emits[0][1].nodes[0].position).toEqual({ x: 60, y: 80 })
  expect(props.modelValue.nodes[0].position).toEqual({ x: 0, y: 0 })
  props.modelValue = {
    ...props.modelValue,
    nodes: [{ ...props.modelValue.nodes[0], position: { x: 10, y: 20 } }],
  }
  await nextTick()
  expect(emits).toHaveLength(2)
  core.handleCanvasChanges([{ type: 'dimensions', id: 'start' }])
  await nextTick()
  expect(emits).toHaveLength(2)
  wrapper.unmount()
})
test('Excel preserves identifiers, numeric precision and workbook display values and rejects oversized ranges', () => {
  expect(formatCellValue('000123')).toBe('000123')
  expect(formatCellValue('1.234567')).toBe('1.234567')
  const cells = processExcelSheet(
    {
      '!ref': 'A1:B1',
      A1: { t: 's', v: '000123' },
      B1: { t: 'n', v: 0.12345, w: '12.345%' },
    },
    []
  ).data[0]
  expect(cells.col_0.displayValue).toBe('000123')
  expect(cells.col_1.displayValue).toBe('12.345%')
  expect(() => processExcelSheet({ '!ref': 'A1:XFD1048576' }, [])).toThrow(
    '预览上限'
  )
  const { data, columns } = processExcelSheet(
    { '!ref': 'A1:CV1000', A1: { v: 'one' } },
    []
  )
  expect(data.length * columns.length).toBe(100000)
})

test('removing a hashing file cancels queued animation work and stops all remaining reads', async () => {
  let core: any
  const frames: FrameRequestCallback[] = []
  const frame = vi
    .spyOn(globalThis, 'requestAnimationFrame')
    .mockImplementation(cb => {
      frames.push(cb)
      return 1
    })
  let readCount = 0
  const raw = {
    name: 'large.txt',
    type: 'text/plain',
    size: 4,
    slice() {
      return {
        arrayBuffer: async () => {
          readCount++
          return new Uint8Array([1]).buffer
        },
      }
    },
  } as File
  const wrapper = mount(
    defineComponent({
      setup() {
        core = useUploadCore({
          chunked: true,
          chunkSize: 1,
          concurrency: 1,
          customRequest: () => ({ abort() {} }),
        })
        return () => h('div')
      },
    })
  )
  const [item] = core.addFiles([raw])
  core.startUpload()
  await flushPromises()
  expect(readCount).toBe(1)
  core.removeFile(item.uid)
  wrapper.unmount()
  for (let i = 0; i < 5; i++) {
    frames.splice(0).forEach(cb => cb(0))
    // eslint-disable-next-line no-await-in-loop -- 每轮仅推进一个哈希分片，模拟取消后的迟到帧。
    await flushPromises()
  }
  expect(readCount).toBe(1)
  frame.mockRestore()
})

import { usePlayerCore } from '../../src/components/C_VideoPlayer/composables/usePlayerCore'
const mediaCalls = vi.hoisted(() => ({ native: [] as any[], hls: [] as any[] }))
vi.mock('xgplayer', () => ({
  default: class {
    constructor(config: any) {
      mediaCalls.native.push(config)
    }
    on() {}
    destroy() {}
  },
}))
vi.mock('xgplayer-hls', () => ({
  default: class {
    constructor(config: any) {
      mediaCalls.hls.push(config)
    }
    on() {}
    destroy() {}
  },
}))
test.each(['dash', 'flv'] as const)(
  'unconfigured %s reports an explicit adapter error without constructing a native player',
  async sourceType => {
    let core: any
    const wrapper = mount(
      defineComponent({
        setup() {
          core = usePlayerCore({
            url: `https://example.test/media.${sourceType === 'dash' ? 'mpd' : 'flv'}`,
            sourceType,
          })
          core.containerRef.value = document.createElement('div')
          return () => h('div')
        },
      })
    )
    const before = mediaCalls.native.length
    await expect(core.initPlayer()).rejects.toThrow('sourceAdapters')
    expect(core.playerState.value).toBe('error')
    expect(mediaCalls.native).toHaveLength(before)
    expect(mediaCalls.hls).toHaveLength(0)
    wrapper.unmount()
  }
)

test('configured protocol adapters are lazy and create a compatible player', async () => {
  let core: ReturnType<typeof usePlayerCore>
  const adapter = vi.fn(async () => (await import('xgplayer')).default)
  const wrapper = mount(
    defineComponent({
      setup() {
        core = usePlayerCore({
          url: '/stream.mpd',
          sourceType: 'dash',
          sourceAdapters: { dash: adapter },
        })
        core.containerRef.value = document.createElement('div')
        return () => h('div')
      },
    })
  )
  expect(adapter).not.toHaveBeenCalled()
  await core!.initPlayer()
  expect(adapter).toHaveBeenCalledTimes(1)
  expect(core!.playerRef.value).not.toBeNull()
  wrapper.unmount()
})

test('Excel expands sheets on demand and rejects oversized later sheets independently', async () => {
  const XLSX = await import('xlsx')
  const { loadExcel } = await import('../../src/components/C_FilePreview/data')
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([['000123']]),
    'Small'
  )
  XLSX.utils.book_append_sheet(
    workbook,
    { '!ref': 'A1:CV1001', A1: { t: 's', v: 'too big' } },
    'Large'
  )
  const bytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
  const file = new File([bytes], 'sample.xlsx')
  const { sheets } = await loadExcel(file)
  expect(sheets[0].data[0].col_0.displayValue).toBe('000123')
  expect(sheets[1].data).toEqual([])
  expect(() => sheets[1].load!()).toThrow('预览上限')
  await expect(loadExcel({ size: 33 * 1024 * 1024 } as File)).rejects.toThrow(
    '32 MB'
  )
  await expect(loadExcel(file, { maxCells: Number.NaN })).rejects.toThrow(
    '有限正整数'
  )
  const expanded = await loadExcel(file, { maxCells: 101000 })
  expect(expanded.sheets[1].load!().data.length).toBe(1001)
})

test('mixed uploads drain fairly with a shared peak concurrency and report all successes', async () => {
  let core!: ReturnType<typeof useUploadCore>
  let active = 0
  let peak = 0
  const completions: Array<() => void> = []
  const wrapper = mount(
    defineComponent({
      setup() {
        core = useUploadCore({
          chunked: true,
          chunkSize: 1,
          concurrency: 2,
          customRequest: options => {
            active += 1
            peak = Math.max(peak, active)
            completions.push(() => {
              active -= 1
              options.onSuccess?.({ ok: true })
            })
            return {
              abort() {
                active -= 1
              },
            }
          },
        })
        return () => h('div')
      },
    })
  )
  core
    .addFiles([
      new File(['abc'], 'first'),
      new File(['def'], 'second'),
      new File(['x'], 'third'),
    ])
    .forEach(file => {
      file.hash = 'precomputed'
    })
  core.startUpload()
  await flushPromises()
  while (completions.length) {
    completions.shift()!()
    // eslint-disable-next-line no-await-in-loop -- 网络请求逐个完成，观察调度额度和最终状态。
    await flushPromises()
  }
  expect(peak).toBe(2)
  expect(active).toBe(0)
  expect(core.getSuccessList()).toHaveLength(3)
  wrapper.unmount()
})

test('canceling an active upload aborts its transport before starting the next queued request', () => {
  let active = 0
  let peak = 0
  const schedule = createUploadScheduler(ref(1))
  const request = () => {
    active += 1
    peak = Math.max(peak, active)
    return {
      abort: () => {
        active -= 1
      },
    }
  }
  const options: UploadRequestOptions = {
    action: '/upload',
    file: new File(['a'], 'a.txt'),
    filename: 'a.txt',
  }
  const first = schedule(request, options)
  schedule(request, options)
  expect(active).toBe(1)
  first.abort()
  expect(active).toBe(1)
  expect(peak).toBe(1)
  schedule.abortAll()
  expect(active).toBe(0)
})

test('Excel bounds aggregate merge expansion even when repeated ranges individually fit', () => {
  const fullRange = { s: { r: 0, c: 0 }, e: { r: 1, c: 1 } }
  expect(() =>
    processExcelSheet({ '!ref': 'A1:B2' }, [fullRange, fullRange])
  ).toThrow('合并单元格')
  const result = processExcelSheet({ '!ref': 'A1:B2' }, [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
  ])
  expect(result.data[0].col_0.colspan).toBe(2)
  expect(result.data[1].col_1.hidden).toBe(true)
})

test('workflow rejects missing, duplicate and stale edge updates without publishing a changed model', async () => {
  let core: any
  const emit = vi.fn()
  const wrapper = mount(
    defineComponent({
      setup() {
        core = useWorkflowNodes(
          {
            modelValue: {
              nodes: ['a', 'b', 'c'].map(id => ({
                id,
                type: 'approval',
                position: { x: 0, y: 0 },
                data: { title: id },
              })),
              edges: [
                { id: 'ab', source: 'a', target: 'b' },
                { id: 'ac', source: 'a', target: 'c' },
              ],
            },
            users: [],
            roles: [],
            departments: [],
            readonly: false,
          } as any,
          emit,
          ref()
        )
        return () => h('div')
      },
    })
  )
  const original = core.getCurrentWorkflowData().edges
  core.updateConnection({
    edge: { id: 'ab' },
    connection: { source: 'a', target: 'c' },
  })
  core.updateConnection({
    edge: { id: 'ab' },
    connection: { source: 'a', target: 'missing' },
  })
  core.updateConnection({
    edge: { id: 'gone' },
    connection: { source: 'b', target: 'c' },
  })
  await nextTick()
  expect(core.getCurrentWorkflowData().edges).toEqual(original)
  expect(emit).not.toHaveBeenCalled()
  core.updateConnection({
    edge: { id: 'ab' },
    connection: { source: 'b', target: 'c' },
  })
  await nextTick()
  expect(emit).toHaveBeenCalledTimes(2)
  expect(core.getCurrentWorkflowData().edges[0]).toMatchObject({
    id: 'ab',
    source: 'b',
    target: 'c',
  })
  wrapper.unmount()
})
