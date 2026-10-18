export { default as C_Tree } from './index.vue'
export type {
  TreeKey,
  TreeNativeProps,
  TreeRenderContext,
  TreeUpdateMeta,
  TreeSlots,
  TreeMode,
  StatusType,
  ButtonType,
  TreeOption,
  DropInfo,
  TreeNodeData,
  StatusConfig,
  ActionConfig,
  IconConfig,
  TreeProps,
  TreeExpose,
  TreeEmits,
} from './types'
export { presetConfigs as treePresetConfigs } from './data'
export { useTreeOperations } from './composables/useTreeOperations'

export type { ComponentDensity } from '../../core/density'
