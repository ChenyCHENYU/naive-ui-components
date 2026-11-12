import { computed, h, reactive, ref, watch } from 'vue'
import type {
  OptionRequest,
  OptionSource,
} from '@robot-admin/naive-ui-components/data'
import type { DataPickerSourceInput } from '@robot-admin/naive-ui-components/C_DataPicker'
import type { SearchFormItem } from '@robot-admin/naive-ui-components/C_FormSearch'
import type { TableColumn } from '@robot-admin/naive-ui-components/C_Table'

interface Material {
  id: string
  code: string
  name: string
  specification: string
  category: string
  factory: string
  stock: number
  unit: string
}
interface MaterialFilters {
  factory: string
  category?: string | number
}
interface Location {
  id: string
  name: string
  warehouse: string
}
interface Customer {
  id: number
  name: string
  creditCode: string
}
interface SearchQuery {
  warehouse: string
  location: string | null
  remark: string
}

// Finite local data keeps every workflow usable without a backend.
const materials: Material[] = Array.from({ length: 27 }, (_, index) => {
  const category = ['bar', 'coil', 'plate'][index % 3]
  return {
    id: `material-${index + 1}`,
    code: `M${String(index + 1).padStart(4, '0')}`,
    name: { bar: '热轧带肋钢筋', coil: '低碳热轧盘条', plate: '热轧钢板' }[
      category
    ]!,
    specification: `${['HRB400E Φ20', 'HPB300 Φ8', 'Q235B 12×1500'][index % 3]} · ${index + 1}批`,
    category,
    factory: index < 24 ? 'F01' : 'F02',
    stock: index % 7 === 0 ? 0 : 18 + index * 3,
    unit: '吨',
  }
})
const locations: Location[] = [
  { id: 'N-A01', name: '北库 · A01货位', warehouse: 'north' },
  { id: 'N-A02', name: '北库 · A02货位', warehouse: 'north' },
  { id: 'S-B01', name: '南库 · B01货位', warehouse: 'south' },
]
const customers: Customer[] = [
  { id: 1, name: '华东精密制造有限公司', creditCode: 'DEMO-9132-001' },
  { id: 2, name: '华南金属贸易有限公司', creditCode: 'DEMO-9144-002' },
  { id: 3, name: '华东精密制造有限公司', creditCode: 'DEMO-9132-003' },
]

async function waitForTransport(signal: AbortSignal) {
  signal.throwIfAborted()
  await new Promise<void>((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer)
      reject(signal.reason)
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort)
      resolve()
    }, 160)
    signal.addEventListener('abort', abort, { once: true })
  })
}

/** Exercise public search and selection APIs against cancellable local transport. */
export function useSearchWorkflows() {
  const dark = ref(false)
  const compact = ref(true)
  const failNext = ref(false)
  const unavailable = ref(false)
  const materialId = ref<string | null>('material-2')
  const selectedMaterial = ref<Material | null>(null)
  const remark = ref('')
  const customerText = ref('')
  const selectedCustomer = ref<Customer | null>(null)
  const selectedIds = ref<string[]>([])
  const selectedRows = ref<Material[]>([])
  const query = ref<SearchQuery>({
    warehouse: 'north',
    location: null,
    remark: '',
  })
  const applied = ref<SearchQuery | null>(null)
  const filters = reactive<MaterialFilters>({ factory: 'F01' })
  const density = computed(() => (compact.value ? 'compact' : 'default'))

  async function requestMaterials(request: OptionRequest<MaterialFilters>) {
    await waitForTransport(request.signal)
    if (failNext.value) {
      failNext.value = false
      throw new Error('Temporary connection failure')
    }
    const search = request.search.trim().toLowerCase()
    const rows = materials.filter(
      row =>
        row.factory === request.filters?.factory &&
        (!request.filters.category ||
          row.category === request.filters.category) &&
        `${row.code} ${row.name} ${row.specification}`
          .toLowerCase()
          .includes(search)
    )
    const start = (request.page - 1) * request.pageSize
    return {
      rows: rows.slice(start, start + request.pageSize),
      total: rows.length,
    }
  }
  async function resolveMaterials(
    values: readonly (string | number | boolean)[],
    signal: AbortSignal
  ) {
    await waitForTransport(signal)
    return materials.filter(
      row => values.includes(row.id) && row.factory === filters.factory
    )
  }
  const materialSource: OptionSource<Material, string, MaterialFilters> = {
    request: requestMaterials,
    resolve: resolveMaterials,
    value: row => row.id,
    label: row => `${row.code} · ${row.name}`,
    pageSize: 6,
    filters,
  }
  const customerSource: OptionSource<Customer, number> = {
    value: row => row.id,
    label: row => row.name,
    pageSize: 2,
    request: async ({ search, page, pageSize, signal }) => {
      await waitForTransport(signal)
      const rows = customers.filter(row =>
        `${row.name} ${row.creditCode}`.includes(search)
      )
      const start = (page - 1) * pageSize
      return { rows: rows.slice(start, start + pageSize), total: rows.length }
    },
  }
  const pickerSource: DataPickerSourceInput<Material, MaterialFilters> = {
    request: requestMaterials,
    resolve: resolveMaterials,
    rowKey: 'id',
    label: row => `${row.code} · ${row.name}`,
  }
  const columns: TableColumn<Material>[] = [
    { key: 'code', title: '物料编码', width: 115 },
    { key: 'name', title: '物料名称', minWidth: 150 },
    { key: 'specification', title: '规格 / 批次', minWidth: 185 },
    { key: 'stock', title: '可用库存', width: 95 },
    { key: 'unit', title: '单位', width: 65 },
  ]
  const navigation = {
    field: 'category' as const,
    title: '物料分类',
    options: [
      { key: 'bar', label: '棒材' },
      { key: 'coil', label: '线材' },
      { key: 'plate', label: '板材' },
    ],
  }
  const locationSource: OptionSource<Location, string, { warehouse: string }> =
    {
      value: row => row.id,
      label: row => row.name,
      request: async ({ search, filters: context, signal }) => {
        await waitForTransport(signal)
        const rows = locations.filter(
          row =>
            row.warehouse === context?.warehouse && row.name.includes(search)
        )
        return { rows, total: rows.length }
      },
      resolve: async (values, signal) => {
        await waitForTransport(signal)
        return locations.filter(
          row =>
            values.includes(row.id) && row.warehouse === query.value.warehouse
        )
      },
    }
  const fields: SearchFormItem<SearchQuery>[] = [
    {
      type: 'select',
      prop: 'warehouse',
      label: '仓库',
      defaultValue: 'north',
      attrs: { clearable: false },
      list: [
        { value: 'north', label: '成品北库' },
        { value: 'south', label: '成品南库' },
      ],
    },
    {
      type: 'select',
      prop: 'location',
      label: '货位',
      source: model => ({
        ...locationSource,
        filters: { warehouse: model.warehouse },
      }),
    },
    {
      type: 'autocomplete',
      prop: 'remark',
      label: '说明',
      attrs: { options: ['按计划发运', '优先安排装车', '需提供质量证明书'] },
    },
  ]
  watch(
    () => query.value.warehouse,
    () => {
      query.value.location = null
    }
  )
  watch(customerText, value => {
    if (value !== selectedCustomer.value?.name) selectedCustomer.value = null
  })

  return {
    dark,
    compact,
    density,
    failNext,
    unavailable,
    materialId,
    selectedMaterial,
    remark,
    customerText,
    selectedCustomer,
    customerSource,
    renderCustomer: (row: Customer) =>
      h('div', { class: 'customer-suggestion' }, [
        h('strong', row.name),
        h('span', row.creditCode),
      ]),
    selectedIds,
    selectedRows,
    query,
    applied,
    filters,
    materialSource,
    pickerSource,
    columns,
    navigation,
    fields,
    templates: ['按计划发运', '优先安排装车', '需提供质量证明书'],
    canSelect: (row: Material) => row.stock > 0 && !unavailable.value,
    switchFactory: () => {
      filters.factory = filters.factory === 'F01' ? 'F02' : 'F01'
      materialId.value = null
      selectedMaterial.value = null
      selectedIds.value = []
      selectedRows.value = []
    },
    applyQuery: async (values: SearchQuery) => {
      applied.value = { ...values }
    },
  }
}
