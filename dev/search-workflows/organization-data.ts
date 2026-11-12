/** 离线展示数据；人数是业务统计值，与本页加载了几个子节点无关。 */
import { computed, onScopeDispose, ref } from 'vue'
import type {
  ActionConfig,
  IconConfig,
  TreeExpose,
  TreeKey,
  TreeNodeRenderContext,
} from '@robot-admin/naive-ui-components/C_Tree'
import type {
  OrgChartDirection,
  OrgChartExpose,
  OrgChartLineStyle,
} from '@robot-admin/naive-ui-components/C_OrgChart'

export interface OrganizationNode {
  id: string
  label: string
  subtitle: string
  kind: 'company' | 'department' | 'manager' | 'person'
  owner: string
  memberCount: number
  status: 'active' | 'pending' | 'inactive'
  editable: boolean
  initials: string
  color: string
  avatar: string
  children?: OrganizationNode[]
}

/** 独立业务模型：字段映射直接消费原对象，不要求接入侧做递归转换。 */
export interface BusinessOrganization {
  code: string
  title: string
  role: string
  picture: string
  nodes?: BusinessOrganization[]
  kind: OrganizationNode['kind']
  owner: string
  memberTotal: number
  state: OrganizationNode['status']
  initials: string
  color: string
}

const avatar = (initials: string, color: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="80" height="80" rx="22" fill="${color}"/><text x="40" y="48" fill="white" font-size="26" text-anchor="middle" font-family="sans-serif">${initials}</text></svg>`
  )}`

const person = (
  id: string,
  label: string,
  subtitle: string,
  color: string,
  kind: 'manager' | 'person' = 'person',
  status: OrganizationNode['status'] = 'active'
): OrganizationNode => ({
  id,
  label,
  subtitle,
  kind,
  status,
  owner: label,
  memberCount: 0,
  editable: status !== 'inactive',
  initials: label.slice(-2),
  color,
  avatar: avatar(label.slice(-2), color),
})

const department = (
  id: string,
  label: string,
  owner: string,
  memberCount: number,
  children: OrganizationNode[]
): OrganizationNode => ({
  id,
  label,
  subtitle: `${owner} · 部门负责人`,
  kind: 'department',
  owner,
  memberCount,
  status: 'active',
  editable: true,
  initials: label.slice(0, 2),
  color: '#157c80',
  avatar: avatar(label.slice(0, 2), '#157c80'),
  children,
})

function freezeOrganization<T extends { children?: T[] }>(node: T): T {
  node.children?.forEach(freezeOrganization)
  if (node.children) Object.freeze(node.children)
  return Object.freeze(node)
}

const organization = freezeOrganization<OrganizationNode>({
  id: 'northstar',
  label: '北辰科技',
  subtitle: '让协作更有方向',
  kind: 'company',
  owner: '陈知远',
  memberCount: 128,
  status: 'active',
  editable: false,
  initials: '北辰',
  color: '#375c98',
  avatar: avatar('北辰', '#375c98'),
  children: [
    department('product', '产品体验部', '林澄', 26, [
      person('lin-cheng', '林澄', '产品负责人', '#8969b2', 'manager'),
      person('shen-yi', '沈一', '交互设计师', '#b37d57'),
    ]),
    department('engineering', '工程研发部', '周屿', 78, [
      person('zhou-yu', '周屿', '技术负责人', '#5574ae', 'manager'),
      person('lu-yan', '陆言', '前端工程师', '#388884', 'person', 'pending'),
    ]),
    department('operations', '业务运营部', '许禾', 24, [
      person('xu-he', '许禾', '运营负责人', '#977345', 'manager'),
      person('jiang-lai', '江莱', '运营专员', '#7b8392', 'person', 'inactive'),
    ]),
  ],
})

function businessModel(node: OrganizationNode): BusinessOrganization {
  const nodes = node.children?.map(businessModel)
  if (nodes) Object.freeze(nodes)
  return Object.freeze({
    code: node.id,
    title: node.label,
    role: node.subtitle,
    picture: node.avatar,
    nodes,
    kind: node.kind,
    owner: node.owner,
    memberTotal: node.memberCount,
    state: node.status,
    initials: node.initials,
    color: node.color,
  })
}

const businessOrganization = businessModel(organization)
const directoryNodes = Object.freeze([organization])
function flatten(node: OrganizationNode): OrganizationNode[] {
  return [node, ...(node.children?.flatMap(flatten) ?? [])]
}
const allNodes = flatten(organization)
const originalSnapshot = JSON.stringify([organization, businessOrganization])
const expandableKeys = allNodes
  .filter(node => node.children?.length)
  .map(node => node.id)

export const statusLabels: Record<OrganizationNode['status'], string> = {
  active: '正常',
  pending: '待入职',
  inactive: '已停用',
}
export const kindLabels: Record<OrganizationNode['kind'], string> = {
  company: '公司',
  department: '部门',
  manager: '负责人',
  person: '成员',
}

/** 页面只组合两个独立组件的公开能力，不向组件塞入组织业务状态。 */
export function useOrganizationDemo() {
  const dark = ref(false)
  const compact = ref(true)
  const avatars = ref(true)
  const managementPermission = ref(true)
  const schema = ref<'business' | 'default'>('business')
  const direction = ref<OrgChartDirection>('vertical')
  const lineStyle = ref<OrgChartLineStyle>('rounded')
  const tree = ref<TreeExpose<OrganizationNode>>()
  const defaultChart = ref<OrgChartExpose<OrganizationNode>>()
  const businessChart = ref<OrgChartExpose<BusinessOrganization>>()
  const selectedKeys = ref<TreeKey[]>(['engineering'])
  const treeExpandedKeys = ref<TreeKey[]>([...expandableKeys])
  const selectedKey = ref<string | number | null>('engineering')
  const expandedKeys = ref<Array<string | number>>([organization.id])
  const locateKey = ref('lu-yan')
  const sourceUnchanged = ref(true)
  const events = ref(['离线数据已就绪，展开、选择与布局状态由页面独立持有。'])
  const busyKey = ref<string | null>(null)
  const timers = new Set<ReturnType<typeof setTimeout>>()
  const density = computed(() => (compact.value ? 'compact' : 'default'))
  const selectedNode = computed(() =>
    allNodes.find(node => node.id === selectedKey.value)
  )
  const locateOptions = allNodes.map(node => ({
    label: `${node.label} · ${kindLabels[node.kind]}`,
    value: node.id,
  }))

  const record = (message: string) => {
    sourceUnchanged.value =
      JSON.stringify([organization, businessOrganization]) === originalSnapshot
    events.value = [message, ...events.value].slice(0, 3)
  }
  const activeChart = () =>
    schema.value === 'business' ? businessChart.value : defaultChart.value
  const locate = async (key = locateKey.value) => {
    const found = await activeChart()?.locate(key)
    if (found) {
      selectedKeys.value = [key]
      await tree.value?.locate(key)
    }
    record(
      found
        ? `已定位 ${allNodes.find(node => node.id === key)?.label ?? key}，隐藏的祖先会先展开。`
        : '未找到可见目标，请检查节点与受控展开状态。'
    )
  }
  const selectDirectory = (node: OrganizationNode | null) => {
    // locate() 也会发出目录选择事件；已同步的键不再次定位画布。
    if ((node?.id ?? null) === selectedKey.value) return
    selectedKey.value = node?.id ?? null
    if (node) {
      void activeChart()?.locate(node.id)
      record(`目录选择 ${node.label}，架构图同步展开并定位。`)
    }
  }
  const selectChart = (node: OrganizationNode | BusinessOrganization) => {
    const key = 'id' in node ? node.id : node.code
    selectedKeys.value = [key]
    void tree.value?.locate(key)
    record(
      `已选择 ${'label' in node ? node.label : node.title}；事件保留原业务节点。`
    )
  }
  const toggleChart = () => {
    expandedKeys.value = expandedKeys.value.length ? [] : [...expandableKeys]
    record(
      expandedKeys.value.length
        ? '架构图已全部展开。'
        : '架构图已收起，仍可定位深层成员。'
    )
  }
  const fitChart = () => {
    void activeChart()?.fitView()
  }
  const iconColors = computed(() =>
    dark.value
      ? { company: '#94b4ea', department: '#79c9c1', person: '#b6a2d5' }
      : { company: '#476caa', department: '#16837b', person: '#8064aa' }
  )
  const personStateIcons = {
    active: null,
    pending: { name: 'mdi:account-clock-outline', color: '#ba8839', size: 18 },
    inactive: { name: 'mdi:account-off-outline', color: '#8a94a2', size: 18 },
  }
  const nodeIcon = ({
    option,
    expanded,
    loading,
  }: TreeNodeRenderContext<OrganizationNode>) => {
    if (loading) return { name: 'mdi:refresh', color: '#62829d', size: 18 }
    if (option.kind === 'company')
      return {
        name: 'mdi:office-building-outline',
        color: iconColors.value.company,
        size: 18,
      }
    if (option.kind === 'department')
      return {
        name: expanded ? 'mdi:folder-open-outline' : 'mdi:folder-outline',
        color: iconColors.value.department,
        size: 18,
      }
    const stateIcon = personStateIcons[option.status]
    if (stateIcon) return stateIcon
    return {
      name:
        option.kind === 'manager'
          ? 'mdi:account-tie-outline'
          : 'mdi:account-check-outline',
      color: iconColors.value.person,
      size: 18,
    }
  }
  const iconConfig: IconConfig<OrganizationNode> = { resolve: nodeIcon }
  const actions = computed<ActionConfig<OrganizationNode>[]>(() => [
    { key: 'inspect', text: '查看资料', icon: 'mdi:account-details-outline' },
    {
      key: 'sync',
      text: '同步演示状态',
      icon: 'mdi:refresh',
      type: 'primary',
      disabled: node =>
        !managementPermission.value ||
        !node.editable ||
        (busyKey.value !== null && busyKey.value !== node.id),
      loading: node => busyKey.value === node.id,
    },
  ])
  const runAction = (action: string, node: OrganizationNode) => {
    if (action === 'inspect') {
      selectedKey.value = node.id
      selectedKeys.value = [node.id]
      record(`${node.label} · ${node.subtitle}。查看事件直接收到原节点。`)
      return
    }
    if (!managementPermission.value || !node.editable || busyKey.value) return
    busyKey.value = node.id
    record(`正在模拟同步 ${node.label}，按钮进入 busy 状态。`)
    const timer = setTimeout(() => {
      timers.delete(timer)
      busyKey.value = null
      record(`${node.label} 模拟同步完成；仅变更演示状态，未发送请求。`)
    }, 1100)
    timers.add(timer)
  }
  onScopeDispose(() => timers.forEach(clearTimeout))

  return {
    organization,
    directoryNodes,
    businessOrganization,
    allNodes,
    dark,
    compact,
    avatars,
    managementPermission,
    schema,
    direction,
    lineStyle,
    tree,
    defaultChart,
    businessChart,
    selectedKeys,
    treeExpandedKeys,
    selectedKey,
    expandedKeys,
    locateKey,
    locateOptions,
    density,
    selectedNode,
    sourceUnchanged,
    events,
    busyKey,
    nodeIcon,
    iconConfig,
    actions,
    selectDirectory,
    selectChart,
    toggleChart,
    fitChart,
    locate,
    runAction,
  }
}
