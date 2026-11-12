/** 库内兼容契约演示：可取消的离线来源、未加载树路径、行级编辑与字段偏好。 */
import { computed, ref } from 'vue'
import type {
  TreeSearchSource,
  TreeExpose,
} from '@robot-admin/naive-ui-components/C_Tree'
import type { TableColumn } from '@robot-admin/naive-ui-components/C_Table'
import {
  serializeSearch,
  type SearchFormItem,
  type FormSearchExpose,
} from '@robot-admin/naive-ui-components/C_FormSearch'
import type { SelectOptionNode } from '@robot-admin/naive-ui-components/C_Select'
import type { OptionSource } from '@robot-admin/naive-ui-components/data'

interface Asset {
  id: number
  title: string
  isLeaf: boolean
  nodes?: Asset[]
}
interface StockRow {
  id: number
  material: string
  quantity: number
  supplier: number | null
  locked: boolean
}
interface Supplier {
  id: number
  name: string
}
interface Query {
  name: string
  warehouse: number | null
  region: number | null
  status: string | null
}
const assets: Asset[] = [
  {
    id: 0,
    title: '生产设备',
    isLeaf: false,
    nodes: [
      {
        id: 10,
        title: '一号车间',
        isLeaf: false,
        nodes: [
          { id: 11, title: '循环水泵', isLeaf: true },
          { id: 12, title: '轧机轴承', isLeaf: true },
        ],
      },
      {
        id: 20,
        title: '二号车间',
        isLeaf: false,
        nodes: [
          { id: 21, title: '冷却水泵', isLeaf: true },
          { id: 22, title: '备用轴承', isLeaf: true },
        ],
      },
    ],
  },
]
const paths: Asset[][] = []
function index(nodes: Asset[], ancestors: Asset[] = []) {
  for (const node of nodes) {
    const path = [...ancestors, node]
    paths.push(path)
    if (node.nodes) index(node.nodes, path)
  }
}
index(assets)
const pathRows = (path: readonly Asset[]) =>
  path.map(({ id, title, isLeaf }) => ({ id, title, isLeaf }))
function pause(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Canceled', 'AbortError'))
      return
    }
    const abort = () => {
      clearTimeout(timer)
      reject(new DOMException('Canceled', 'AbortError'))
    }
    const timer = window.setTimeout(() => {
      signal.removeEventListener('abort', abort)
      resolve()
    }, 180)
    signal.addEventListener('abort', abort, { once: true })
  })
}

/** 每个实例独立拥有来源和草稿；业务范围切换时显式清空旧树选择。 */
export function useContractDemo() {
  const dark = ref(false),
    compact = ref(true),
    failNext = ref(false),
    scope = ref('factory-A')
  const density = computed(() =>
    compact.value ? ('compact' as const) : ('default' as const)
  )
  const tree = ref<TreeExpose<Asset>>()
  const pattern = ref(''),
    selected = ref<Array<string | number>>([]),
    expanded = ref<Array<string | number>>([])
  const switchScope = () => {
    scope.value = scope.value === 'factory-A' ? 'factory-B' : 'factory-A'
    selected.value = []
    expanded.value = []
    pattern.value = ''
  }
  const roots = pathRows([assets[0]])
  const source = computed<TreeSearchSource<Asset>>(() => ({
    scope: scope.value,
    debounce: 120,
    async request({ search, signal, limit }) {
      await pause(signal)
      if (failNext.value) {
        failNext.value = false
        throw new Error('演示：查询失败，可安全重试')
      }
      return paths
        .filter(path => path[path.length - 1].title.includes(search))
        .slice(0, limit)
        .map(pathRows)
    },
    async resolve(key, signal) {
      await pause(signal)
      const path = paths.find(path => path[path.length - 1].id === key)
      return path ? pathRows(path) : null
    },
    async load(node, { signal }) {
      await pause(signal)
      const path = paths.find(path => path[path.length - 1].id === node.id)
      return path
        ? (path[path.length - 1].nodes ?? []).map(child => pathRows([child])[0])
        : []
    },
  }))
  const choice = ref<boolean | number | null>(null)
  const choices: SelectOptionNode<boolean | number>[] = [
    {
      type: 'group',
      label: '布尔值',
      children: [
        { label: '否（false）', value: false },
        { label: '是（true）', value: true },
      ],
    },
    {
      type: 'group',
      label: '数字编码',
      children: [
        { label: '零号仓（0）', value: 0 },
        { label: '一号仓（1）', value: 1 },
      ],
    },
  ]
  const chosen = ref('尚未选择')
  const query = ref<Query>({
    name: '',
    warehouse: null,
    region: null,
    status: null,
  })
  const search = ref<FormSearchExpose<Query>>()
  const fields: SearchFormItem<Query>[] = [
    { prop: 'name', type: 'input', label: '物料', placeholder: '名称或编码' },
    {
      prop: 'warehouse',
      type: 'treeSelect',
      label: '仓库',
      attrs: { keyField: 'value' },
      list: [
        {
          label: '华东仓',
          value: 100,
          children: [
            { label: '一号库位', value: 101 },
            { label: '二号库位', value: 102 },
          ],
        },
      ],
    },
    {
      prop: 'region',
      type: 'cascader',
      label: '区域',
      list: [
        {
          label: '生产园区',
          value: 200,
          children: [
            { label: '一号车间', value: 201 },
            { label: '二号车间', value: 202 },
          ],
        },
      ],
    },
    {
      prop: 'status',
      type: 'select',
      label: '状态',
      list: [
        { label: '启用', value: 'enabled' },
        { label: '停用', value: 'disabled' },
      ],
    },
  ]
  const applied = ref<Record<string, unknown>>({})
  const apply = () => {
    applied.value = serializeSearch(query.value, fields, {
      scope: 'active',
      visibleFields: search.value?.visibleFields,
    })
  }
  const suppliers: Supplier[] = [
    { id: 0, name: '零号供应商' },
    { id: 1, name: '华东供应商' },
    { id: 2, name: '华南供应商' },
  ]
  const supplierSource: OptionSource<Supplier, number> = {
    async request({ search, signal }) {
      await pause(signal)
      const filtered = suppliers.filter(row => row.name.includes(search))
      return { rows: filtered, total: filtered.length }
    },
    value: row => row.id,
    label: row => row.name,
    async resolve(values, signal) {
      await pause(signal)
      return suppliers.filter(row => values.includes(row.id))
    },
  }
  const rows = ref<StockRow[]>([
    {
      id: 1,
      material: '轧机轴承',
      quantity: 12.375,
      supplier: 0,
      locked: false,
    },
    { id: 2, material: '循环水泵', quantity: 2, supplier: 1, locked: true },
  ])
  const columns: TableColumn<StockRow>[] = [
    {
      type: 'group',
      key: 'stock',
      title: '物料明细',
      children: [
        {
          key: 'material',
          title: '物料名称',
          width: 180,
          editable: row => !row.locked,
        },
        {
          key: 'quantity',
          title: '数量 / 三位精度',
          width: 180,
          editable: row => !row.locked,
          editType: 'number',
          editProps: { precision: 3, min: 0 },
        },
      ],
    },
    {
      type: 'group',
      key: 'supply',
      title: '供货信息',
      children: [
        {
          key: 'supplier',
          title: '远程供应商',
          width: 200,
          editable: row => !row.locked,
          editType: 'select',
          editProps: { source: supplierSource },
          render: row =>
            suppliers.find(supplier => supplier.id === row.supplier)?.name ??
            '未设置',
        },
        {
          key: 'locked',
          title: '业务状态',
          width: 120,
          editable: false,
          render: row => (row.locked ? '已锁定' : '可编辑'),
        },
      ],
    },
  ]
  return {
    dark,
    compact,
    density,
    tree,
    roots,
    pattern,
    selected,
    expanded,
    source,
    failNext,
    scope,
    switchScope,
    choice,
    choices,
    chosen,
    query,
    search,
    fields,
    applied,
    apply,
    rows,
    columns,
  }
}
