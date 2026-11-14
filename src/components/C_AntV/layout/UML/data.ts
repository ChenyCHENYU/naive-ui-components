import type { UMLAttribute, UMLMethod } from '../../types'

export const visibilityMap = {
  public: '+',
  private: '-',
  protected: '#',
}

/* 连线类型配置 */
export const edgeTypes = {
  extends: {
    strokeDasharray: 0,
    targetMarker: {
      name: 'block',
      width: 10,
      height: 8,
      fill: 'var(--c-bg-card, var(--c-theme-bg-card, #fff))',
      stroke: 'var(--c-primary, var(--c-theme-primary, #2080f0))',
      strokeWidth: 2,
    },
  },
  implement: {
    strokeDasharray: '8,4',
    targetMarker: {
      name: 'block',
      width: 10,
      height: 8,
      fill: 'var(--c-bg-card, var(--c-theme-bg-card, #fff))',
      stroke: 'var(--c-primary, var(--c-theme-primary, #2080f0))',
      strokeWidth: 2,
    },
  },
  dependency: {
    strokeDasharray: '6,4',
    targetMarker: {
      name: 'classic',
      size: 8,
      fill: 'var(--c-primary, var(--c-theme-primary, #2080f0))',
    },
  },
  composition: {
    strokeDasharray: 0,
    sourceMarker: {
      name: 'diamond',
      width: 12,
      height: 8,
      fill: 'var(--c-primary, var(--c-theme-primary, #2080f0))',
      stroke: 'var(--c-primary, var(--c-theme-primary, #2080f0))',
    },
  },
  aggregation: {
    strokeDasharray: 0,
    sourceMarker: {
      name: 'diamond',
      width: 12,
      height: 8,
      fill: 'var(--c-bg-card, var(--c-theme-bg-card, #fff))',
      stroke: 'var(--c-primary, var(--c-theme-primary, #2080f0))',
      strokeWidth: 2,
    },
  },
  association: {
    strokeDasharray: 0,
    targetMarker: {
      name: 'classic',
      size: 8,
      fill: 'var(--c-primary, var(--c-theme-primary, #2080f0))',
    },
  },
}

/* 端口配置 */
export const portConfig = ['top', 'right', 'bottom', 'left'].reduce(
  (acc, pos) => {
    const refConfig =
      pos === 'top'
        ? { refX: 0.5, refY: 0 }
        : pos === 'right'
          ? { refX: 1, refY: 0.5 }
          : pos === 'bottom'
            ? { refX: 0.5, refY: 1 }
            : { refX: 0, refY: 0.5 }
    acc[`port-${pos}`] = {
      ref: 'body',
      ...refConfig,
      r: 4,
      fill: 'var(--c-primary, var(--c-theme-primary, #2080f0))',
      stroke: 'var(--c-bg-card, var(--c-theme-bg-card, #fff))',
      strokeWidth: 2,
      magnet: true,
      style: {
        cursor: 'crosshair',
        opacity: 0,
        transition: 'opacity 0.2s',
      },
    }
    return acc
  },
  {} as any
)

/* UML类节点配置 */
export const classNodeConfig = {
  inherit: 'rect',
  markup: [
    { tagName: 'rect', selector: 'body' },
    { tagName: 'rect', selector: 'name-rect' },
    { tagName: 'rect', selector: 'attrs-rect' },
    { tagName: 'rect', selector: 'methods-rect' },
    { tagName: 'text', selector: 'name-text' },
    { tagName: 'text', selector: 'attrs-text' },
    { tagName: 'text', selector: 'methods-text' },
    { tagName: 'circle', selector: 'port-top' },
    { tagName: 'circle', selector: 'port-right' },
    { tagName: 'circle', selector: 'port-bottom' },
    { tagName: 'circle', selector: 'port-left' },
  ],
  attrs: {
    rect: { width: 160 },
    body: {
      stroke: 'var(--c-primary, var(--c-theme-primary, #2080f0))',
      strokeWidth: 1,
      fill: 'var(--c-bg-card, var(--c-theme-bg-card, #fff))',
      magnet: false,
      style: { cursor: 'move' },
    },
    'name-rect': {
      fill: 'var(--c-bg-muted, var(--c-theme-bg-muted, #f1f5f9))',
      stroke: 'var(--c-bg-card, var(--c-theme-bg-card, #fff))',
      strokeWidth: 0.5,
      magnet: false,
      style: { cursor: 'move' },
    },
    'attrs-rect': {
      fill: 'var(--c-bg-muted, var(--c-theme-bg-muted, #f1f5f9))',
      stroke: 'var(--c-bg-card, var(--c-theme-bg-card, #fff))',
      strokeWidth: 0.5,
      magnet: false,
      style: { cursor: 'move' },
    },
    'methods-rect': {
      fill: 'var(--c-bg-muted, var(--c-theme-bg-muted, #f1f5f9))',
      stroke: 'var(--c-bg-card, var(--c-theme-bg-card, #fff))',
      strokeWidth: 0.5,
      magnet: false,
      style: { cursor: 'move' },
    },
    'name-text': {
      ref: 'name-rect',
      refY: 0.5,
      refX: 0.5,
      textAnchor: 'middle',
      fontWeight: 'bold',
      fill: 'var(--c-text-1, var(--c-theme-text-1, #262626))',
      fontSize: 12,
      pointerEvents: 'none',
    },
    'attrs-text': {
      ref: 'attrs-rect',
      refY: 0.5,
      refX: 5,
      textAnchor: 'left',
      fill: 'var(--c-text-1, var(--c-theme-text-1, #262626))',
      fontSize: 10,
      pointerEvents: 'none',
    },
    'methods-text': {
      ref: 'methods-rect',
      refY: 0.5,
      refX: 5,
      textAnchor: 'left',
      fill: 'var(--c-text-1, var(--c-theme-text-1, #262626))',
      fontSize: 10,
      pointerEvents: 'none',
    },
    ...portConfig,
  },
}

/* 图形配置 */
export const graphConfig = {
  grid: true,
  panning: true,
  mousewheel: {
    enabled: true,
    zoomAtMousePosition: true,
    modifiers: 'ctrl',
    minScale: 0.5,
    maxScale: 3,
  },
}

/* 连接配置 */
export const connectingConfig = {
  router: 'manhattan',
  connector: { name: 'rounded', args: { radius: 8 } },
  allowBlank: false,
  allowLoop: false,
  allowNode: false,
  snap: true,
  allowEdge: false,
}

/* 高亮配置 */
export const highlightingConfig = {
  magnetAvailable: {
    name: 'stroke',
    args: {
      attrs: {
        fill: 'var(--c-primary, var(--c-theme-primary, #2080f0))',
        stroke: 'var(--c-primary, var(--c-theme-primary, #2080f0))',
        opacity: 1,
      },
    },
  },
  magnetAdsorbed: {
    name: 'stroke',
    args: {
      attrs: {
        fill: 'var(--c-primary, var(--c-theme-primary, #2080f0))',
        stroke: 'var(--c-primary, var(--c-theme-primary, #2080f0))',
        opacity: 1,
      },
    },
  },
}

/* 默认边配置 */
export const defaultEdgeConfig = {
  shape: 'extends',
  attrs: {
    line: {
      stroke: 'var(--c-primary, var(--c-theme-primary, #2080f0))',
      strokeWidth: 2,
      targetMarker: {
        name: 'block',
        width: 8,
        height: 6,
        fill: 'var(--c-primary, var(--c-theme-primary, #2080f0))',
      },
    },
  },
}

/* 示例类数据 */
export const sampleClasses = [
  {
    id: 'animal',
    name: '<<Abstract>>\n动物',
    x: 342,
    y: 98,
    attributes: [{ name: '名字', type: 'string', visibility: 'public' }],
    methods: [
      { name: '新陈代谢', returnType: 'void', visibility: 'public' },
      { name: '繁殖', returnType: 'void', visibility: 'public' },
    ],
  },
  {
    id: 'bird',
    name: '鸟',
    x: 575,
    y: 280,
    attributes: [
      { name: '羽毛', type: 'string', visibility: 'public' },
      { name: '下蛋', type: 'boolean', visibility: 'public' },
    ],
    methods: [],
  },
  {
    id: 'mammal',
    name: '哺乳动物',
    x: 844,
    y: 319,
    attributes: [{ name: '翅膀', type: 'boolean', visibility: 'public' }],
    methods: [],
  },
  {
    id: 'dog',
    name: '狗',
    x: 656,
    y: 456,
    attributes: [{ name: '下蛋', type: 'boolean', visibility: 'public' }],
    methods: [],
  },
  {
    id: 'enterprise',
    name: '企鹅',
    x: 984,
    y: 456,
    attributes: [{ name: '下蛋', type: 'boolean', visibility: 'public' }],
    methods: [],
  },
  {
    id: 'sparrow',
    name: '麻雀',
    x: 531,
    y: 608,
    attributes: [{ name: '学飞', type: 'boolean', visibility: 'public' }],
    methods: [],
  },
  {
    id: 'interface-flying',
    name: '<<interface>>\n飞翔',
    x: 762,
    y: 608,
    attributes: [{ name: '下蛋', type: 'boolean', visibility: 'public' }],
    methods: [],
  },
  { id: 'qemu', name: '气球', x: 981, y: 608, attributes: [], methods: [] },
]

/* 示例连接关系 */
export const sampleConnections = [
  { id: 'edge-1', shape: 'extends', source: 'bird', target: 'animal' },
  { id: 'edge-2', shape: 'extends', source: 'mammal', target: 'animal' },
  { id: 'edge-3', shape: 'extends', source: 'dog', target: 'mammal' },
  {
    id: 'edge-4',
    shape: 'extends',
    source: 'enterprise',
    target: 'mammal',
  },
  { id: 'edge-5', shape: 'extends', source: 'sparrow', target: 'bird' },
  {
    id: 'edge-6',
    shape: 'implement',
    source: 'sparrow',
    target: 'interface-flying',
  },
  {
    id: 'edge-7',
    shape: 'implement',
    source: 'enterprise',
    target: 'interface-flying',
  },
  {
    id: 'edge-8',
    shape: 'association',
    source: 'bird',
    target: 'mammal',
    label: '1:2',
  },
]

/* 工具函数 */
export const getVisibilitySymbol = (visibility: string) =>
  visibilityMap[visibility as keyof typeof visibilityMap] || '+'

/* 新类模板 */
export const newClassTemplate = {
  name: '新类',
  attributes: [
    { name: 'attribute', type: 'string', visibility: 'private' },
  ] as UMLAttribute[],
  methods: [
    { name: 'method', returnType: 'void', visibility: 'public' },
  ] as UMLMethod[],
  position: { x: 100, y: 100 },
}
