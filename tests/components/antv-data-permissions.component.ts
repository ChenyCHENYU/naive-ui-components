import { afterEach, expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { NButton } from 'naive-ui'
import ER from '../../src/components/C_AntV/layout/ER/index.vue'
import UML from '../../src/components/C_AntV/layout/UML/index.vue'
import BPMN from '../../src/components/C_AntV/layout/BPMN/index.vue'
import ERTableEditor from '../../src/components/C_AntV/layout/ER/components/ERTableEditor.vue'
import UMLClassEditor from '../../src/components/C_AntV/layout/UML/components/UMLClassEditor.vue'
import BPMNPropertyEditor from '../../src/components/C_AntV/layout/BPMN/components/BPMNPropertyEditor.vue'
import type {
  ERDiagramData,
  UMLDiagramData,
} from '../../src/components/C_AntV/types'

// 保留 X6 真实 Model / Node / Edge 与端口处理，只替换需要 SVG 画布的 Graph 外壳。
vi.mock('@antv/x6', async importOriginal => {
  const actual = await importOriginal<typeof import('@antv/x6')>()
  return {
    ...actual,
    Graph: class extends actual.Model {
      options: Record<string, any>
      static registerNode = actual.Graph.registerNode
      static registerPortLayout = actual.Graph.registerPortLayout
      static registerEdge = actual.Graph.registerEdge
      constructor(options: Record<string, any>) {
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

afterEach(() => vi.useRealTimers())

function erData(): ERDiagramData {
  return {
    tables: ['table_123', 'orders_main'].map(id => ({
      id,
      name: id,
      fields: [
        {
          name: 'user_id_编号',
          type: 'BIGINT',
          isPrimaryKey: true,
          isRequired: true,
          isForeignKey: false,
        },
      ],
      position: { x: 0, y: 0 },
    })),
    relations: ['foreign-key', 'one-to-one', 'one-to-many', 'many-to-many'].map(
      (type, index) => ({
        id: `relation_${index}`,
        type: type as ERDiagramData['relations'][number]['type'],
        sourceTable: 'table_123',
        sourceField: 'user_id_编号',
        targetTable: 'orders_main',
        targetField: 'user_id_编号',
        name: index === 0 ? '' : `关联 ${index}`,
        comment: `注释_${index}`,
      })
    ),
  }
}

function umlData(): UMLDiagramData {
  return {
    classes: [
      {
        id: 'class_a',
        name: '原始类',
        attributes: [
          { name: '原始属性', type: 'string', visibility: 'public' },
        ],
        methods: [
          {
            name: '原始方法',
            returnType: 'void',
            visibility: 'public',
            parameters: ['original'],
          },
        ],
        position: { x: 10, y: 20 },
      },
    ],
    relations: [],
  }
}

test('ER imports, edits, replaces and exports complete relation metadata with unambiguous native ports', async () => {
  const data = erData()
  const wrapper = mount(ER, { props: { data, showToolbar: false } })
  await flushPromises()
  const graph = wrapper.vm.getGraph()!
  expect(wrapper.vm.getData()).toEqual(data)
  expect(
    graph.getCellById('table_123').getPort('table_123_user_id_编号')?.data
  ).toEqual({ tableId: 'table_123', fieldName: 'user_id_编号' })

  graph.trigger('node:dblclick', { node: graph.getCellById('table_123') })
  await flushPromises()
  const editor = wrapper.findComponent(ERTableEditor)
  editor.props('editingTable')!.name = '改名'
  editor.vm.$emit('save')
  await flushPromises()
  expect(wrapper.vm.getData().relations).toEqual(data.relations)
  expect(data.tables[0].name).toBe('table_123')

  const replacement = erData()
  replacement.relations[0].comment = '替换数据'
  await wrapper.setProps({ data: replacement })
  expect(wrapper.vm.getData()).toEqual(replacement)
  // 导出快照不与真实图模型共享嵌套字段。
  wrapper.vm.getData().tables[0].fields[0].name = '外部修改'
  expect(wrapper.vm.getData()).toEqual(replacement)
})

test('ER Delete belongs only to its focused canvas, including multiple diagrams on one page', async () => {
  const first = mount(ER, {
    props: { data: erData(), showToolbar: false },
    attachTo: document.body,
  })
  const second = mount(ER, {
    props: { data: erData(), showToolbar: false },
    attachTo: document.body,
  })
  await flushPromises()
  const firstGraph = first.vm.getGraph()!,
    secondGraph = second.vm.getGraph()!
  firstGraph.trigger('edge:click', { edge: firstGraph.getEdges()[0] })
  secondGraph.trigger('edge:click', { edge: secondGraph.getEdges()[0] })
  const outside = document.createElement('button')
  document.body.append(outside)
  outside.focus()
  outside.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Delete', bubbles: true })
  )
  expect(firstGraph.getEdges()).toHaveLength(4)
  expect(secondGraph.getEdges()).toHaveLength(4)
  const canvas = first.get('.graph-container')
  await canvas.trigger('pointerdown')
  expect(document.activeElement).toBe(canvas.element)
  await canvas.trigger('keydown', { key: 'Delete' })
  expect(firstGraph.getEdges()).toHaveLength(3)
  expect(secondGraph.getEdges()).toHaveLength(4)
  expect(first.emitted('data-change')).toHaveLength(1)
})

test('ER readonly is live for toolbar, editor, deletion, connections and a drag already in flight', async () => {
  const wrapper = mount(ER, {
    props: { data: erData() },
    attachTo: document.body,
  })
  await flushPromises()
  const graph = wrapper.vm.getGraph()!
  const node = graph.getCellById('table_123')
  graph.trigger('node:dblclick', { node })
  await flushPromises()
  const editor = wrapper.findComponent(ERTableEditor)
  expect(editor.props('show')).toBe(true)
  editor.props('editingTable')!.name = '不应保存'
  await wrapper.setProps({ readonly: true })
  expect(editor.props('show')).toBe(false)
  editor.vm.$emit('save')
  graph.trigger('edge:dblclick', { edge: graph.getEdges()[0] })
  graph.trigger('edge:click', { edge: graph.getEdges()[0] })
  expect(graph.getEdges()).toHaveLength(4)
  expect(wrapper.vm.getData().tables[0].name).toBe('table_123')
  expect(
    wrapper
      .findAllComponents(NButton)
      .find(button => button.text() === '添加表')
      ?.props('disabled')
  ).toBe(true)
  expect((graph.options.interacting as () => boolean)()).toBe(false)
  expect(graph.options.connecting.validateMagnet!({} as never)).toBe(false)
  expect(graph.options.connecting.validateEdge!({} as never)).toBe(false)
  const position = node.getPosition()
  node.setPosition(100, 200, { ui: true })
  expect(node.getPosition()).toEqual(position)
  // 程序化数据更新仍受支持，不把 readonly 当作冻结数据输入。
  node.setPosition(30, 40)
  expect(node.getPosition()).toEqual({ x: 30, y: 40 })
  await wrapper.setProps({ readonly: false })
  expect((graph.options.interacting as () => boolean)()).toBe(true)
  graph.trigger('edge:dblclick', { edge: graph.getEdges()[0] })
  expect(graph.getEdges()).toHaveLength(3)
})

test('UML nested drafts are discarded on cancel and saved as an independent snapshot', async () => {
  const data = umlData()
  const wrapper = mount(UML, { props: { data, showToolbar: false } })
  await flushPromises()
  const graph = wrapper.vm.getGraph()!
  const node = graph.getCellById('class_a')
  graph.trigger('node:dblclick', { node })
  await flushPromises()
  const editor = wrapper.findComponent(UMLClassEditor)
  const draft = editor.props('editingClass')!
  draft.attributes[0].name = '未保存属性'
  draft.methods[0].parameters![0] = '未保存参数'
  draft.position.x = 99
  editor.vm.$emit('update:show', false)
  await flushPromises()
  expect(wrapper.vm.getData()).toEqual(data)
  expect(data).toEqual(umlData())
  graph.trigger('node:dblclick', { node })
  await flushPromises()
  const savedDraft = editor.props('editingClass')!
  savedDraft.attributes[0].name = '已保存'
  editor.vm.$emit('save')
  await flushPromises()
  savedDraft.attributes[0].name = '迟到草稿写入'
  expect(wrapper.vm.getData().classes[0].attributes[0].name).toBe('已保存')
  expect(data).toEqual(umlData())
})

test.each(['uml', 'bpmn'] as const)(
  '%s readonly can be enabled and disabled without rebinding stale write handlers',
  async kind => {
    const wrapper =
      kind === 'uml'
        ? mount(UML, { props: { data: umlData(), readonly: true } })
        : mount(BPMN, { props: { data: [], readonly: true } })
    await flushPromises()
    const graph = wrapper.vm.getGraph()!
    const node =
      graph.getNodes()[0] ??
      graph.addNode({ id: 'task_a', shape: 'activity', x: 10, y: 20, data: {} })
    const edge = graph.addEdge({
      id: 'test_edge',
      source: node.id,
      target: node.id,
    })
    const editor =
      kind === 'uml'
        ? wrapper.findComponent(UMLClassEditor)
        : wrapper.findComponent(BPMNPropertyEditor)
    graph.trigger('edge:dblclick', { edge })
    graph.trigger('node:dblclick', { node })
    expect(graph.getEdges()).toHaveLength(1)
    expect(editor.props().show).toBe(false)
    const { options } = graph
    expect((options.interacting as () => boolean)()).toBe(false)
    expect(
      options.connecting.validateConnection({
        sourceView: {},
        targetView: {},
        sourceMagnet: { getAttribute: () => 'true' },
        targetMagnet: { getAttribute: () => 'true' },
      } as never)
    ).toBe(false)
    await wrapper.setProps({ readonly: false })
    graph.trigger('node:dblclick', { node })
    await flushPromises()
    expect(editor.props().show).toBe(true)
    await wrapper.setProps({ readonly: true })
    expect(editor.props().show).toBe(false)
    editor.vm.$emit('save')
    editor.vm.$emit('delete')
    expect(graph.getNodes()).toHaveLength(1)
    expect((options.interacting as () => boolean)()).toBe(false)
    await wrapper.setProps({ readonly: false })
    graph.trigger('edge:dblclick', { edge })
    expect(graph.getEdges()).toHaveLength(0)
  }
)
