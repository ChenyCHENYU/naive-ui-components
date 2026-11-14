/** WL 真实页面的离线契约对照；领域规则留在应用，通用请求和选择会话复用组件库。 */
import { computed, proxyRefs, reactive, ref } from 'vue'
import { useDataResource } from '../../src/workflows'
import type { TableColumn } from '../../src/components/C_Table/types'
import type {
  DataPickerSourceInput,
  DataPickerNavigation,
} from '../../src/components/C_DataPicker/types'
import type {
  UserPickerSource,
  UserPickerOrganization,
} from '../../src/components/C_UserPicker/types'

export interface ProductionOrder {
  id: string
  orderNo: string
  orderItemNo: string
  steelCode: string
}
export interface HeatRow {
  id: string
  heatNo: string
  billetQty: number
}
export interface SlabRow {
  matNo: string
  heatNo: string
  billetQty: number
}
export interface ProductionApi {
  bound(
    order: ProductionOrder,
    signal: AbortSignal
  ): Promise<{ data: HeatRow[] }>
  candidates(
    order: ProductionOrder,
    signal: AbortSignal
  ): Promise<{ data: SlabRow[] }>
}
export const productionOrders: ProductionOrder[] = [
  {
    id: 'pool-1',
    orderNo: 'SO-202611-001',
    orderItemNo: '01',
    steelCode: 'Q355B',
  },
  {
    id: 'pool-2',
    orderNo: 'SO-202611-001',
    orderItemNo: '02',
    steelCode: 'HRB400E',
  },
]
export const productionColumns: TableColumn<ProductionOrder>[] = [
  { key: 'orderNo', title: '订单号' },
  { key: 'orderItemNo', title: '项次' },
  { key: 'steelCode', title: '钢种' },
]
export const heatColumns: TableColumn<HeatRow>[] = [
  { key: 'heatNo', title: '炉次' },
  { key: 'billetQty', title: '已选支数' },
]
export const slabColumns: TableColumn<SlabRow>[] = [
  { key: 'matNo', title: '坯料编号' },
  { key: 'heatNo', title: '炉次' },
  { key: 'billetQty', title: '可用支数' },
]

/** 仅为离线接口模拟延时；真实项目在 source 边界传递 signal 给请求包。 */
async function pause(signal: AbortSignal) {
  await new Promise<void>((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort)
      resolve()
    }, 100)
    if (signal.aborted) abort()
    else signal.addEventListener('abort', abort, { once: true })
  })
}

/** 同一订单号的不同项次分别拥有两份子资源；失败和重试互不牵连。 */
export function useProductionParity(api?: ProductionApi) {
  const selected = ref<string | null>(null)
  const failBound = ref(false)
  const client: ProductionApi = api ?? {
    async bound(order, signal) {
      await pause(signal)
      if (failBound.value) {
        failBound.value = false
        throw new Error('炉次查询失败，可单独重试')
      }
      return {
        data: [
          {
            id: `lock-${order.id}`,
            heatNo: `H-${order.orderItemNo}`,
            billetQty: 12,
          },
        ],
      }
    },
    async candidates(order, signal) {
      await pause(signal)
      return {
        data: [
          {
            matNo: `MAT-${order.orderItemNo}`,
            heatNo: `H-${order.orderItemNo}`,
            billetQty: 28,
          },
        ],
      }
    },
  }
  const order = (key: string) => productionOrders.find(row => row.id === key)!
  const bound = proxyRefs(
    useDataResource({
      key: selected,
      load: async ({ key, signal }) =>
        (await client.bound(order(key), signal)).data,
    })
  )
  const slabs = proxyRefs(
    useDataResource({
      key: selected,
      load: async ({ key, signal }) =>
        (await client.candidates(order(key), signal)).data,
    })
  )
  const rowProps = (row: ProductionOrder) => ({
    onClick: () => {
      selected.value = row.id
    },
    'aria-selected': selected.value === row.id,
  })
  return proxyRefs({ selected, failBound, bound, slabs, rowProps })
}

export const devices = [
  {
    deviceNo: '02',
    name: '直读光谱仪 · LAS02',
    elements: ['Mn', 'Si', 'P', 'Cr', 'Ni', 'Mo', 'Cu', 'Al'],
  },
  { deviceNo: '04', name: '碳硫分析仪 · CS744', elements: ['S', 'C'] },
  { deviceNo: '06', name: '氮分析仪', elements: ['N'] },
]
export interface MeasurementRow {
  id: string
  [element: string]: string
}
export interface IntegratedResult {
  id: string
  parentId: string
  heatNo: string
  heatId: string
  smpNo: string
  deviceNo: string
  elementCode: string
  testRst: string
}
export const samples = [
  { id: 'sample-1', heatNo: 'H-01', heatId: 'heat-1', smpNo: 'S-001' },
  { id: 'sample-2', heatNo: 'H-02', heatId: 'heat-2', smpNo: 'S-002' },
]
export const integratedColumns: TableColumn<IntegratedResult>[] = [
  { key: 'deviceNo', title: '设备' },
  { key: 'elementCode', title: '元素' },
  { key: 'testRst', title: '检测值' },
]

/** 样品草稿缓存属于质量业务；字符串检测值保留原精度，生成载荷时只修剪空白。 */
export function useQualityParity() {
  let nextId = 0
  const selected = ref(samples[0].id)
  const drafts = reactive(new Map<string, Record<string, MeasurementRow[]>>())
  const results = ref<IntegratedResult[]>([])
  const emptyRow = (elements: string[]): MeasurementRow => ({
    id: `measurement-${nextId++}`,
    ...Object.fromEntries(elements.map(element => [element, ''])),
  })
  const selectSample = (id: string) => {
    if (!drafts.has(id))
      drafts.set(
        id,
        Object.fromEntries(
          devices.map(device => [device.deviceNo, [emptyRow(device.elements)]])
        )
      )
    selected.value = id
    results.value = []
  }
  selectSample(selected.value)
  const matrix = computed(() => drafts.get(selected.value)!)
  // 设备列在实例内构造一次，连续录入只更新行数据，不重造列定义。
  const columns: Record<string, TableColumn<MeasurementRow>[]> =
    Object.fromEntries(
      devices.map(device => [
        device.deviceNo,
        device.elements.map(element => ({
          key: element,
          title: element,
          editType: 'input',
          editable: true,
          minWidth: 86,
        })),
      ])
    )
  const append = (deviceNo: string) => {
    const device = devices.find(item => item.deviceNo === deviceNo)!
    matrix.value[deviceNo].push(emptyRow(device.elements))
  }
  const remove = (deviceNo: string) => {
    if (matrix.value[deviceNo].length > 1) matrix.value[deviceNo].pop()
  }
  const integrate = () => {
    const sample = samples.find(item => item.id === selected.value)!
    results.value = devices.flatMap(device =>
      matrix.value[device.deviceNo].flatMap(row =>
        device.elements.flatMap(elementCode => {
          const testRst = row[elementCode].trim()
          return testRst
            ? [
                {
                  id: `${row.id}:${elementCode}`,
                  parentId: sample.id,
                  heatNo: sample.heatNo,
                  heatId: sample.heatId,
                  smpNo: sample.smpNo,
                  deviceNo: device.deviceNo,
                  elementCode,
                  testRst,
                },
              ]
            : []
        })
      )
    )
  }
  return proxyRefs({
    selected,
    matrix,
    results,
    selectSample,
    columns,
    append,
    remove,
    integrate,
  })
}

export interface Material {
  id: string
  matlNo: string
  materialName: string
  specification: string
  matlCategoryId: string
  status: string
}
export interface MaterialFilters {
  matlCategoryId?: string | number
  matlNo?: string
  materialName?: string
  specification?: string
  status?: string
}
export interface MaterialApi {
  list(
    params: MaterialFilters & { current: number; size: number },
    signal: AbortSignal
  ): Promise<{ data: { records: Material[]; total: number } }>
  resolve(
    ids: readonly (string | number)[],
    signal: AbortSignal
  ): Promise<readonly Material[]>
}
const materials: Material[] = Array.from({ length: 8 }, (_, index) => ({
  id: `material-${index + 1}`,
  matlNo: `M-${index + 1}`,
  materialName: index < 4 ? `圆钢 ${index + 1}` : `合金 ${index - 3}`,
  specification: index % 2 ? 'Φ20' : 'Φ30',
  matlCategoryId: index < 4 ? 'steel' : 'alloy',
  status: index === 7 ? '0' : '1',
}))
export const materialColumns: TableColumn<Material>[] = [
  { key: 'materialName', title: '物料名称' },
  { key: 'matlNo', title: '物料编号' },
  { key: 'specification', title: '规格说明' },
]
export const materialNavigation: DataPickerNavigation<MaterialFilters> = {
  field: 'matlCategoryId',
  title: '物料分类',
  options: [
    { key: 'steel', label: '钢材' },
    { key: 'alloy', label: '合金' },
  ],
}

/** 旧 current/size + data.records 在单一数据源边界映射，选择器不猜响应层级。 */
export function createMaterialSource(
  api?: MaterialApi
): DataPickerSourceInput<Material, MaterialFilters> {
  const client: MaterialApi = api ?? {
    async list(params, signal) {
      await pause(signal)
      const rows = materials.filter(
        row =>
          (!params.matlCategoryId ||
            row.matlCategoryId === params.matlCategoryId) &&
          (!params.status || row.status === params.status) &&
          row.matlNo.includes(params.matlNo ?? '') &&
          row.materialName.includes(params.materialName ?? '') &&
          row.specification.includes(params.specification ?? '')
      )
      return {
        data: {
          records: rows.slice(
            (params.current - 1) * params.size,
            params.current * params.size
          ),
          total: rows.length,
        },
      }
    },
    async resolve(ids, signal) {
      await pause(signal)
      return materials.filter(row => ids.includes(row.id))
    },
  }
  return {
    rowKey: 'id',
    label: row => row.materialName,
    request: async ({ page, pageSize, filters, signal }) => {
      const { data } = await client.list(
        { ...filters, current: page, size: pageSize },
        signal
      )
      return { rows: data.records, total: data.total }
    },
    resolve: (ids, signal) => client.resolve(ids, signal),
  }
}

export interface Operator {
  id: number
  userNo: string
  displayName: string
  departmentId: string
  departmentName: string
}
export interface OperatorFilters {
  departmentId?: string | number
}
export const operatorRows: Operator[] = [
  {
    id: 0,
    userNo: 'U001',
    displayName: '林澄',
    departmentId: 'smelting',
    departmentName: '熔炼班组',
  },
  {
    id: 1,
    userNo: 'U002',
    displayName: '林澄',
    departmentId: 'rolling',
    departmentName: '轧钢班组',
  },
  {
    id: 2,
    userNo: 'U003',
    displayName: '周屿',
    departmentId: 'smelting',
    departmentName: '熔炼班组',
  },
]
export const operatorOrganization: UserPickerOrganization<
  { id: string; name: string },
  OperatorFilters
> = {
  data: [
    { id: 'smelting', name: '熔炼班组' },
    { id: 'rolling', name: '轧钢班组' },
  ],
  field: 'departmentId',
  keyField: 'id',
  labelField: 'name',
  actions: [],
  showToolbar: false,
}
export const operatorSource: UserPickerSource<
  Operator,
  string,
  OperatorFilters
> = {
  rowKey: 'id',
  value: row => row.userNo,
  label: row => row.displayName,
  async request({ search, page, pageSize, filters, signal }) {
    await pause(signal)
    const rows = operatorRows.filter(
      row =>
        (!filters?.departmentId || row.departmentId === filters.departmentId) &&
        `${row.displayName} ${row.userNo}`.includes(search)
    )
    return {
      rows: rows.slice((page - 1) * pageSize, page * pageSize),
      total: rows.length,
    }
  },
  async resolve(values, signal) {
    await pause(signal)
    return operatorRows.filter(row => values.includes(row.userNo))
  },
}
