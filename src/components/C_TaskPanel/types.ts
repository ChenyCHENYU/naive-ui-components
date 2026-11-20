import type { BatchOperationResult } from '../../core/batchPatch'
import type { ComponentLocale } from '../../core/contracts'

export type TaskPanelKey = string | number
export type TaskPanelStatus =
  'queued' | 'running' | 'success' | 'failed' | 'cancelled'

export interface TaskPanelTask {
  /** 同一面板内唯一，刷新任务时保持稳定。 */
  key: TaskPanelKey
  title: string
  status: TaskPanelStatus
  /** 运行中的真实百分比，省略时显示未知进度。 */
  progress?: number
  message?: string
  downloadable?: boolean
  retryable?: boolean
  results?: readonly BatchOperationResult[]
}

export interface TaskPanelProps<T extends TaskPanelTask = TaskPanelTask> {
  /** 顺序由宿主决定。 */
  tasks: readonly T[]
  /** 正在执行下载或重试的任务键。 */
  pendingKeys?: readonly TaskPanelKey[]
  loading?: boolean
  error?: string
  title?: string
  pageSize?: number
  locale?: ComponentLocale
}
