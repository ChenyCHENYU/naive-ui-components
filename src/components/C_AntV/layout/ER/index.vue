<template>
  <div class="er-layout">
    <!-- 工具栏 -->
    <div
      class="toolbar"
      v-if="showToolbar"
    >
      <NSpace>
        <NButton
          @click="addTable"
          :disabled="readonly"
          type="primary"
          size="small"
        >
          <template #icon>
            <C_Icon
              name="mdi:table-plus"
              :size="16"
            />
          </template>
          添加表
        </NButton>
        <NButton
          @click="centerContent"
          size="small"
        >
          <template #icon>
            <C_Icon
              name="mdi:image-filter-center-focus"
              :size="16"
            />
          </template>
          居中
        </NButton>
        <NButton
          @click="zoomToFit"
          size="small"
        >
          <template #icon>
            <C_Icon
              name="mdi:fit-to-screen"
              :size="16"
            />
          </template>
          适应
        </NButton>
        <NButton
          @click="toggleDeleteMode"
          :disabled="readonly"
          :type="deleteMode ? 'error' : 'default'"
          size="small"
        >
          <template #icon>
            <C_Icon
              name="mdi:delete"
              :size="16"
            />
          </template>
          {{ deleteMode ? '退出删除' : '删除连线' }}
        </NButton>
        <NDropdown
          :options="exportOptions"
          @select="(key: string) => handleExport(key, getCurrentData)"
        >
          <NButton size="small">
            <template #icon>
              <C_Icon
                name="mdi:export"
                :size="16"
              />
            </template>
            导出
          </NButton>
        </NDropdown>
      </NSpace>

      <div
        v-if="deleteMode"
        style="margin-top: 8px"
      >
        <NAlert
          type="info"
          size="small"
          :show-icon="false"
        >
          删除模式：点击连接线即可删除
        </NAlert>
      </div>
    </div>

    <!-- 图表容器 -->
    <div
      ref="containerRef"
      class="graph-container"
      tabindex="0"
      role="region"
      aria-label="ER 图画布"
      @pointerdown="focusCanvas"
      @keydown="handleKeyDown"
    ></div>

    <!-- 表编辑器 -->
    <ERTableEditor
      :show="showEditor"
      v-model:editing-table="editingTable"
      @update:show="showEditor = $event"
      @save="saveTable"
      @add-field="addField"
      @remove-field="removeField"
      @handle-primary-key="handlePrimaryKey"
    />
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, watch, nextTick, onMounted } from 'vue'
  import { NSpace, NButton, NDropdown, NAlert } from 'naive-ui'
  import { Node, Graph, Cell, Edge } from '@antv/x6'
  import { useGraphBase } from '../../composables/useGraphBase'
  import { useGraphExport } from '../../composables/useGraphExport'
  import { bindReadonlyGuard } from '../../composables/readonlyGraph'
  import { cloneData } from '../../../../utils/data'
  import type { ERTable, ERField, ERDiagramData, ERRelation } from '../../types'
  import ERTableEditor from './components/ERTableEditor.vue'
  import C_Icon from '../../../C_Icon/index.vue'

  interface Props {
    data?: ERDiagramData
    showToolbar?: boolean
    readonly?: boolean
    theme?: 'light' | 'dark'
  }

  const props = withDefaults(defineProps<Props>(), {
    showToolbar: true,
    readonly: false,
  })

  const emit = defineEmits<{
    (e: 'ready', graph: Graph): void
    (e: 'data-change', data: ERDiagramData): void
  }>()

  // ==================== Composables ====================
  const containerRef = ref<HTMLDivElement>()
  const isDark = computed(() => props.theme === 'dark')
  const { graph, initGraph, centerContent, zoomToFit, scheduleZoomToFit } =
    useGraphBase(containerRef, isDark)
  const { exportOptions, handleExport } = useGraphExport(graph, 'er-diagram')

  // ==================== 编辑器状态 ====================
  const showEditor = ref(false)
  const editingTable = ref<ERTable>()
  const deleteMode = ref(false)

  // ==================== 工具函数 ====================
  const truncateText = (text: string, maxLength: number) =>
    text.length > maxLength ? text.substring(0, maxLength - 1) + '..' : text

  const createPortConfig = (table: ERTable) =>
    table.fields?.map(field => {
      const displayName = field.isPrimaryKey
        ? `🔑 ${field.name}`
        : field.isRequired
          ? `* ${field.name}`
          : field.name
      return {
        id: `${table.id}_${field.name}`,
        // 字段身份独立保存，不再从带下划线的端口 id 猜测。
        data: { tableId: table.id, fieldName: field.name },
        group: 'list',
        attrs: {
          portNameLabel: {
            text: truncateText(displayName, 12),
            title: displayName,
          },
          portTypeLabel: {
            text: truncateText(field.type, 10),
            title: field.type,
          },
          portBody: { fill: field.isPrimaryKey ? '#FFF7E6' : '#EFF4FF' },
        },
      }
    }) || []

  const createNodeConfig = (table: ERTable) => ({
    id: table.id,
    shape: 'er-rect',
    x: table.position.x,
    y: table.position.y,
    width: 200,
    height: 24 + (table.fields?.length || 0) * 24,
    data: cloneData(table),
    attrs: {
      label: {
        text: truncateText(table.name, 20),
        refX: 0.5,
        refY: 10,
        textAnchor: 'middle',
        title: table.name,
      },
    },
    ports: createPortConfig(table),
  })

  // ==================== 节点注册 ====================
  const registerNodes = () => {
    if (!graph.value) return

    Graph.registerPortLayout(
      'erPortPosition',
      portsPositionArgs =>
        portsPositionArgs.map((_, index) => ({
          position: { x: 0, y: (index + 1) * 24 },
          angle: 0,
        })),
      true
    )

    Graph.registerNode(
      'er-rect',
      {
        inherit: 'rect',
        markup: [
          { tagName: 'rect', selector: 'body' },
          { tagName: 'text', selector: 'label' },
        ],
        attrs: {
          rect: { strokeWidth: 1, stroke: '#5F95FF', fill: '#5F95FF' },
          label: { fontWeight: 'bold', fill: '#ffffff', fontSize: 12 },
        },
        ports: {
          groups: {
            list: {
              markup: [
                { tagName: 'rect', selector: 'portBody' },
                { tagName: 'text', selector: 'portNameLabel' },
                { tagName: 'text', selector: 'portTypeLabel' },
              ],
              attrs: {
                portBody: {
                  width: 200,
                  height: 24,
                  strokeWidth: 1,
                  stroke: '#5F95FF',
                  fill: '#EFF4FF',
                  magnet: true,
                },
                portNameLabel: {
                  ref: 'portBody',
                  refX: 6,
                  refY: 6,
                  fontSize: 9,
                  textAnchor: 'start',
                  textOverflow: 'ellipsis',
                },
                portTypeLabel: {
                  ref: 'portBody',
                  refX: 120,
                  refY: 6,
                  fontSize: 9,
                  textAnchor: 'start',
                  fill: '#666',
                },
              },
              position: 'erPortPosition',
            },
          },
        },
      },
      true
    )
  }

  // ==================== 删除模式 ====================
  const toggleDeleteMode = () => {
    if (props.readonly) return
    deleteMode.value = !deleteMode.value
    if (!deleteMode.value) resetEdgeStyles()
  }

  const resetEdgeStyles = () => {
    graph.value?.getEdges().forEach((edge: any) => {
      edge.attr('line/stroke', '#A2B1C3')
      edge.attr('line/strokeWidth', 2)
    })
  }

  // ==================== 表 CRUD ====================
  const createTableNode = (table: ERTable) => {
    if (!graph.value) return
    const node = graph.value.createNode(createNodeConfig(table))
    graph.value.resetCells([node, ...graph.value.getCells()])
    return node
  }

  const findPosition = () => {
    const nodes = graph.value?.getNodes() || []
    const spacing = 250
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 3; col++) {
        const pos = { x: col * spacing + 50, y: row * spacing + 50 }
        const hasOverlap = nodes.some((node: any) => {
          const nodePos = node.getPosition()
          return (
            Math.abs(nodePos.x - pos.x) < spacing * 0.8 &&
            Math.abs(nodePos.y - pos.y) < spacing * 0.8
          )
        })
        if (!hasOverlap) return pos
      }
    }
    return { x: 50, y: 50 }
  }

  const addTable = () => {
    if (props.readonly) return
    const newTable: ERTable = {
      id: `table_${Date.now()}`,
      name: '新表',
      comment: '',
      fields: [
        {
          name: 'id',
          type: 'BIGINT',
          isPrimaryKey: true,
          isRequired: true,
          isForeignKey: false,
          comment: '主键',
        },
        {
          name: 'name',
          type: 'VARCHAR(100)',
          isPrimaryKey: false,
          isRequired: true,
          isForeignKey: false,
          comment: '名称',
        },
      ],
      position: findPosition(),
    }
    createTableNode(newTable)
    editTable(newTable)
    emitDataChange()
  }

  const editTable = (table: ERTable) => {
    if (props.readonly) return
    editingTable.value = cloneData(table)
    showEditor.value = true
  }

  const saveTable = () => {
    if (props.readonly || !graph.value || !editingTable.value) return
    const node = graph.value.getCellById(editingTable.value.id) as Node
    if (node) {
      node.setData(cloneData(editingTable.value))
      node.prop({
        size: {
          width: 200,
          height: 24 + editingTable.value.fields.length * 24,
        },
        attrs: {
          label: {
            text: truncateText(editingTable.value.name, 20),
            title: editingTable.value.name,
          },
        },
        ports: createPortConfig(editingTable.value),
      })
    }
    showEditor.value = false
    emitDataChange()
  }

  // ==================== 字段操作（由子组件事件触发） ====================
  const handlePrimaryKey = (field: ERField, isPrimaryKey: boolean) => {
    if (props.readonly || !isPrimaryKey) return
    field.isRequired = true
    editingTable.value?.fields.forEach(f => {
      if (f !== field) f.isPrimaryKey = false
    })
  }

  const addField = () => {
    if (props.readonly) return
    editingTable.value?.fields.push({
      name: `field_${(editingTable.value?.fields.length || 0) + 1}`,
      type: 'VARCHAR(100)',
      isPrimaryKey: false,
      isRequired: false,
      isForeignKey: false,
      comment: '',
    })
  }

  const removeField = (index: number) => {
    if (props.readonly) return
    if (editingTable.value && editingTable.value.fields.length > 1)
      editingTable.value.fields.splice(index, 1)
  }

  // ==================== 数据获取 ====================
  const getFieldName = (node: Node, portId: string): string | undefined => {
    const metadata = node.getPort(portId)?.data as
      { tableId: string; fieldName: string } | undefined
    if (metadata?.tableId === node.id) return metadata.fieldName
    // 兼容使用侧通过 getGraph 导入的旧端口格式，按完整表 id 截取。
    const prefix = `${node.id}_`
    return portId.startsWith(prefix) ? portId.slice(prefix.length) : undefined
  }

  const getTableLabel = (node: Node): string => node.getData()?.name || node.id

  const getRelation = (edge: Edge): ERRelation | undefined => {
    const source = edge.getSourceNode()
    const target = edge.getTargetNode()
    if (!source || !target) return
    const sourceField = getFieldName(source, edge.getSourcePortId() ?? '')
    const targetField = getFieldName(target, edge.getTargetPortId() ?? '')
    if (sourceField === undefined || targetField === undefined) return
    const metadata = edge.getData() as ERRelation | undefined
    return {
      ...cloneData(metadata),
      id: edge.id,
      type: metadata?.type ?? 'foreign-key',
      sourceTable: source.id,
      sourceField,
      targetTable: target.id,
      targetField,
      ...(!metadata && {
        name: `${getTableLabel(source)} -> ${getTableLabel(target)}`,
      }),
    }
  }

  const getCurrentData = (): ERDiagramData => {
    if (!graph.value) return { tables: [], relations: [] }

    const tables = graph.value.getNodes().map((node: any) => ({
      ...cloneData(node.getData()),
      position: node.getPosition(),
    }))

    const relations: ERRelation[] = []
    graph.value.getEdges().forEach((edge: Edge) => {
      const relation = getRelation(edge)
      if (relation) relations.push(relation)
    })
    return { tables, relations }
  }

  const emitDataChange = () => {
    if (!props.readonly) emit('data-change', getCurrentData())
  }

  const loadErData = (data: ERDiagramData) => {
    const currentGraph = graph.value
    if (!currentGraph) return
    selectedEdge = null
    const cells: Cell[] = data.tables.map(table =>
      currentGraph.createNode(createNodeConfig(table))
    )
    data.relations?.forEach(relation => {
      cells.push(
        currentGraph.createEdge({
          id: relation.id,
          source: {
            cell: relation.sourceTable,
            port: `${relation.sourceTable}_${relation.sourceField}`,
          },
          target: {
            cell: relation.targetTable,
            port: `${relation.targetTable}_${relation.targetField}`,
          },
          data: cloneData(relation),
          attrs: { line: { stroke: '#A2B1C3', strokeWidth: 2 } },
        })
      )
    })
    currentGraph.resetCells(cells)
  }

  // ==================== Graph 事件绑定 ====================
  let selectedEdge: Edge | null = null

  watch(
    graph,
    newGraph => {
      if (!(newGraph instanceof Graph)) return

      registerNodes()
      bindReadonlyGuard(newGraph, () => props.readonly)
      newGraph.on('node:dblclick', ({ node }) => {
        if (!props.readonly) editTable(node.getData() as ERTable)
      })
      newGraph.on('node:moved', emitDataChange)
      newGraph.on('edge:connected', emitDataChange)
      newGraph.on('edge:removed', ({ edge }) => {
        if (selectedEdge === edge) selectedEdge = null
        emitDataChange()
      })

      newGraph.on('edge:click', ({ edge }) => {
        if (props.readonly) return
        if (deleteMode.value) {
          edge.remove()
        } else {
          resetEdgeStyles()
          edge.attr('line/stroke', '#ff4d4f')
          edge.attr('line/strokeWidth', 3)
          selectedEdge = edge
        }
      })
      newGraph.on('edge:dblclick', ({ edge }) => {
        if (props.readonly) return
        edge.remove()
      })
      newGraph.on('blank:click', () => {
        selectedEdge = null
        if (!deleteMode.value) resetEdgeStyles()
      })

      emit('ready', newGraph)

      nextTick(() => {
        if (graph.value === newGraph && props.data?.tables) {
          loadErData(props.data)
          scheduleZoomToFit(300, 20)
        }
      })
    },
    { immediate: true }
  )

  watch(
    () => props.data,
    newData => {
      if (graph.value && newData?.tables) {
        loadErData(newData)
      }
    },
    { deep: true }
  )

  watch(
    () => props.readonly,
    readonly => {
      if (!readonly) return
      showEditor.value = false
      editingTable.value = undefined
      deleteMode.value = false
      selectedEdge = null
      resetEdgeStyles()
    },
    { flush: 'sync' }
  )

  const focusCanvas = (event: PointerEvent) => {
    const target = event.target as Element | null
    if (
      !target?.closest(
        'input, textarea, [contenteditable]:not([contenteditable="false"])'
      )
    ) {
      containerRef.value?.focus({ preventScroll: true })
    }
  }

  const handleKeyDown = (e: KeyboardEvent): void => {
    if (props.readonly || document.activeElement !== containerRef.value) return
    const target = e.target as Element | null
    if (
      target?.closest(
        'input, textarea, [contenteditable]:not([contenteditable="false"])'
      )
    ) {
      return
    }

    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEdge) {
      e.preventDefault()
      selectedEdge.remove()
      selectedEdge = null
    }
  }

  onMounted(() => {
    void initGraph({
      interacting: () => !props.readonly,
      connecting: {
        allowBlank: false,
        allowNode: false,
        allowEdge: false,
        validateMagnet: () => !props.readonly,
        validateConnection: () => !props.readonly,
        validateEdge: () => !props.readonly,
      },
    })
  })

  defineExpose({
    getGraph: () => graph.value ?? undefined,
    getData: getCurrentData,
  })
</script>

<style lang="scss" scoped>
  @use './index.scss';
</style>
