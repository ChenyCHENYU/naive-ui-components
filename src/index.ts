import type { App, Component } from 'vue'

// ====== 全局样式由 sass CLI 编译到 dist/style.css，不再通过 JS 导入 ======

// ====== 组件导入（仅用于 install 全量注册） ======
import { C_Code } from './components/C_Code'
import { C_Icon } from './components/C_Icon'
import { C_Upload } from './components/C_Upload'
import { C_Barcode } from './components/C_Barcode'
import { C_Captcha } from './components/C_Captcha'
import { C_Cascade } from './components/C_Cascade'
import { C_Guide } from './components/C_Guide'
import { C_Progress } from './components/C_Progress'
import { C_Steps } from './components/C_Steps'
import { C_ActionBar } from './components/C_ActionBar'
import { C_Theme } from './components/C_Theme'
import { C_Language } from './components/C_Language'
import { C_Date } from './components/C_Date'
import { C_Editor } from './components/C_Editor'
import { C_Markdown } from './components/C_Markdown'
import { C_Map } from './components/C_Map'
import { C_City } from './components/C_City'
import { C_VtableGantt } from './components/C_VtableGantt'
import { C_Signature } from './components/C_Signature'
import { C_SplitPane } from './components/C_SplitPane'
import { C_CollapsePanel } from './components/C_CollapsePanel'
import { C_Time } from './components/C_Time'
import { C_FormSearch } from './components/C_FormSearch'
import { C_Tree } from './components/C_Tree'
import { C_QRCode } from './components/C_QRCode'
import { C_ImageCropper } from './components/C_ImageCropper'
import { C_Draggable } from './components/C_Draggable'
import { C_WaterFall } from './components/C_WaterFall'
import { C_FullCalendar } from './components/C_FullCalendar'
import { C_NotificationCenter } from './components/C_NotificationCenter'
import { C_Cron } from './components/C_Cron'
import { C_FormulaEditor } from './components/C_FormulaEditor'
import { C_AntV } from './components/C_AntV'
import { C_VideoPlayer } from './components/C_VideoPlayer'
import { C_FilePreview } from './components/C_FilePreview'
import { C_WorkFlow } from './components/C_WorkFlow'
import { C_Form } from './components/C_Form'
import { C_Table } from './components/C_Table'
import { C_GlobalSearch } from './components/C_GlobalSearch'
import { C_Menu } from './components/C_Menu'
import { C_Breadcrumb } from './components/C_Breadcrumb'
import { C_TagsView } from './components/C_TagsView'

// ====== 插件 ======
import { setupHighlight, useHighlight } from './plugins/highlight'

// ====== 安装选项 ======
export interface ComponentLibOptions {
  highlight?: import('./plugins/highlight').HighlightPluginOptions
}

// ====== 组件列表（全量注册使用） ======
const components: Component[] = [
  C_Code,
  C_Icon,
  C_Upload,
  C_Barcode,
  C_Captcha,
  C_Cascade,
  C_Guide,
  C_Progress,
  C_Steps,
  C_ActionBar,
  C_Theme,
  C_Language,
  C_Date,
  C_Editor,
  C_Markdown,
  C_Map,
  C_City,
  C_VtableGantt,
  C_Signature,
  C_SplitPane,
  C_CollapsePanel,
  C_Time,
  C_FormSearch,
  C_Tree,
  C_QRCode,
  C_ImageCropper,
  C_Draggable,
  C_WaterFall,
  C_FullCalendar,
  C_NotificationCenter,
  C_Cron,
  C_FormulaEditor,
  C_AntV,
  C_VideoPlayer,
  C_FilePreview,
  C_WorkFlow,
  C_Form,
  C_Table,
  C_GlobalSearch,
  C_Menu,
  C_Breadcrumb,
  C_TagsView,
]

// ====== Barrel Re-exports：所有组件 + composables + types + constants ======
export * from './components/C_Code'
export * from './components/C_Icon'
export * from './components/C_Upload'
export * from './components/C_Barcode'
export * from './components/C_Captcha'
export * from './components/C_Cascade'
export * from './components/C_Guide'
export * from './components/C_Progress'
export * from './components/C_Steps'
export * from './components/C_ActionBar'
export * from './components/C_Theme'
export * from './components/C_Language'
export * from './components/C_Date'
export * from './components/C_Editor'
export * from './components/C_Markdown'
export * from './components/C_Map'
export * from './components/C_City'
export * from './components/C_VtableGantt'
export * from './components/C_Signature'
export * from './components/C_SplitPane'
export * from './components/C_CollapsePanel'
export * from './components/C_Time'
export * from './components/C_FormSearch'
export * from './components/C_Tree'
export * from './components/C_QRCode'
export * from './components/C_ImageCropper'
export * from './components/C_Draggable'
export * from './components/C_WaterFall'
export * from './components/C_FullCalendar'
export * from './components/C_NotificationCenter'
export * from './components/C_Cron'
export * from './components/C_FormulaEditor'
export * from './components/C_AntV'
export * from './components/C_VideoPlayer'
export * from './components/C_FilePreview'
export * from './components/C_WorkFlow'
export * from './components/C_Form'
export * from './components/C_Table'
export * from './components/C_GlobalSearch'
export * from './components/C_Menu'
export * from './components/C_Breadcrumb'
export * from './components/C_TagsView'

// ====== 共享类型 + 适配器 ======
export * from './components/_shared'

// ====== 工具函数（不属于任何组件的公共工具） ======
export { setItem, getItem, removeItem, removeAllItem } from './utils/storage'

// ====== 插件导出 ======
export { setupHighlight, useHighlight }
export type { HighlightPluginOptions } from './plugins/highlight'

// ====== 全量安装 ======
const install = (app: App, options: ComponentLibOptions = {}) => {
  components.forEach(component => {
    const name =
      (component as any).__name || (component as any).name || 'UnknownComponent'
    app.component(name, component)
  })

  if (options.highlight !== undefined) {
    setupHighlight(app, options.highlight)
  }
}

export default {
  install,
} satisfies { install: (app: App, options?: ComponentLibOptions) => void }
