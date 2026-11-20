import type { ComponentLocale } from '../../core/contracts'
import type { ComponentDensity } from '../../core/density'

export type TaskBoardKey = string | number

export interface TaskBoardTask {
  key: TaskBoardKey
  title: string
  status: string
  lane?: string | null
  disabled?: boolean
}

export interface TaskBoardColumn<S extends string = string> {
  key: S
  label: string
  disabled?: boolean
}

export interface TaskBoardLane {
  key: string
  label: string
}

export interface TaskBoardPosition<S extends string = string> {
  status: S
  lane: string | null
  index: number
}

export interface TaskBoardMove<T extends TaskBoardTask = TaskBoardTask> {
  task: T
  from: TaskBoardPosition<T['status']>
  to: TaskBoardPosition<T['status']>
  source: 'drag' | 'menu'
}

export interface TaskBoardProps<T extends TaskBoardTask = TaskBoardTask> {
  columns: readonly TaskBoardColumn<T['status']>[]
  lanes?: readonly TaskBoardLane[]
  tasks: readonly T[]
  pendingKeys?: readonly TaskBoardKey[]
  title?: string
  disabled?: boolean
  /** Enables pointer drag in addition to the per-card move menu. */
  draggable?: boolean
  canMove?: (move: TaskBoardMove<T>) => boolean
  density?: ComponentDensity
  locale?: ComponentLocale
}
