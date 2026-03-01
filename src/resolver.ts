/**
 * @robot-admin/naive-ui-components Resolver
 * 用于 unplugin-vue-components 的自动导入解析器
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import Components from 'unplugin-vue-components/vite'
 * import { RobotNaiveUiResolver } from '@robot-admin/naive-ui-components/resolver'
 *
 * export default defineConfig({
 *   plugins: [
 *     Components({
 *       resolvers: [RobotNaiveUiResolver()]
 *     })
 *   ]
 * })
 * ```
 */

const PKG_NAME = '@robot-admin/naive-ui-components'

/** 组件库包含的所有组件名称 */
export const componentNames = [
  'C_ActionBar',
  'C_AntV',
  'C_Barcode',
  'C_Captcha',
  'C_Cascade',
  'C_City',
  'C_Code',
  'C_CollapsePanel',
  'C_Cron',
  'C_Date',
  'C_Draggable',
  'C_Editor',
  'C_FilePreview',
  'C_Form',
  'C_FormSearch',
  'C_FormulaEditor',
  'C_FullCalendar',
  'C_GlobalSearch',
  'C_Guide',
  'C_Icon',
  'C_ImageCropper',
  'C_Language',
  'C_Map',
  'C_Markdown',
  'C_NotificationCenter',
  'C_Progress',
  'C_QRCode',
  'C_Signature',
  'C_SplitPane',
  'C_Steps',
  'C_Table',
  'C_Theme',
  'C_Time',
  'C_Tree',
  'C_Upload',
  'C_VideoPlayer',
  'C_VtableGantt',
  'C_WaterFall',
  'C_WorkFlow',
] as const

/** 组件名称类型 */
export type ComponentName = (typeof componentNames)[number]

/** 组件名称集合（快速查找） */
const componentSet = new Set<string>(componentNames)

export interface RobotNaiveUiResolverOptions {
  /**
   * 按需导入：从子路径解析单个组件，减少打包体积
   * - false (默认): `import { C_Form } from '@robot-admin/naive-ui-components'`
   * - true: `import { C_Form } from '@robot-admin/naive-ui-components/C_Form'`
   */
  importOnDemand?: boolean
}

/**
 * @robot-admin/naive-ui-components 组件自动导入解析器
 *
 * 匹配组件库中所有 C_ 前缀的组件，自动解析导入路径。
 * 类似于 NaiveUiResolver、ElementPlusResolver 等成熟解析器的设计。
 */
export function RobotNaiveUiResolver(
  options: RobotNaiveUiResolverOptions = {}
) {
  const { importOnDemand = false } = options

  return {
    type: 'component' as const,
    resolve: (name: string) => {
      if (componentSet.has(name)) {
        return {
          name,
          from: importOnDemand ? `${PKG_NAME}/${name}` : PKG_NAME,
        }
      }
    },
  }
}
