import { h } from 'vue'
import C_Icon from '../C_Icon/index.vue'

// 预设图标随组件发布。描边继承按钮颜色，常用动作无需向图标服务发请求。
const localPaths = new Map(
  Object.entries({
    check: 'm5 12 4 4L19 6',
    close: 'm6 6 12 12M6 18 18 6',
    'content-save-outline': 'M5 3h12l4 4v14H3V3zm2 0v6h10V3M7 21v-8h10v8',
    'delete-outline': 'M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15m-8 4v7m4-7v7',
    'dots-horizontal': 'M5 12h1m6 0h1m6 0h1',
    'eye-outline':
      'M2 12q10-14 20 0-10 14-20 0zm7 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0',
    'file-export-outline': 'M12 20H4V4h10l4 4v3m-5 4h8m-3-3 3 3-3 3',
    'file-import-outline': 'M12 20H4V4h10l4 4v3m3 4h-8m3-3-3 3 3 3',
    fullscreen: 'M9 4H4v5m11-5h5v5m0 6v5h-5m-6 0H4v-5',
    'gesture-tap-button': 'M6 3v15l4-4 3 6 2-1-3-6h6z',
    'pencil-outline': 'm4 16-1 5 5-1L21 7l-4-4Zm10-10 4 4',
    plus: 'M12 5v14M5 12h14',
    'printer-outline': 'M7 8V3h10v5M7 17H3V8h18v9h-4M7 14h10v7H7zm-1-3h.1',
    refresh: 'M20 4v6h-6m6-2a8 8 0 1 0 0 8',
    restore: 'M4 4v6h6M4 8a8 8 0 1 1 0 8m8-8v4l3 2',
    'tune-variant': 'M3 6h18m0 6H3m0 6h18M9 4v4m6 2v4M7 16v4',
    'view-column-outline': 'M3 5h18v14H3zm6 0v14m6-14v14',
  })
)

/** 自定义图标仍由 C_Icon 加载，图标本身不参与按钮的可访问名称。 */
export function renderActionIcon(name: string, size: number) {
  const d = name.startsWith('mdi:') && localPaths.get(name.slice(4))
  return d
    ? h(
        'svg',
        {
          viewBox: '0 0 24 24',
          width: size,
          height: size,
          fill: 'none',
          stroke: 'currentColor',
          'stroke-width': 1.7,
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          'aria-hidden': 'true',
        },
        [h('path', { d })]
      )
    : h(C_Icon, { name, size, 'aria-hidden': true })
}
