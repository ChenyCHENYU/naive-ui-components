/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-20
 * @Description: 甘特图公开契约，隔离供应商的任务记录 any 与实例细节
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */
import type {
  Gantt,
  GanttConstructorOptions,
  TYPES as GanttTypes,
} from '@visactor/vtable-gantt'
import type { ColumnDefine, TYPES as VTableTypes } from '@visactor/vtable'

/** 自定义业务字段由业务接口扩展，组件从 data 推导完整任务类型。 */
export interface GanttTask {
  id: string | number
  title: string
  start: string | Date
  end?: string | Date
  progress?: number
  priority?: string
  type?: 'milestone' | 'task'
  children?: GanttTask[]
}
export type GanttPreset =
  'basic' | 'project' | 'timeline' | 'milestone' | 'official'
type GanttChildRecords<C> = C extends readonly GanttTask[]
  ? { [I in keyof C]: C[I] extends GanttTask ? GanttTaskRecord<C[I]> : C[I] }
  : C

/** SDK 会同时编辑嵌套任务的日期；映射保留每层业务字段及 children 的可选性。 */
export type GanttTaskRecord<T extends GanttTask = GanttTask> =
  T extends GanttTask
    ? Omit<
        {
          [K in keyof T]: K extends 'children' ? GanttChildRecords<T[K]> : T[K]
        },
        'start' | 'end'
      > &
        Pick<GanttTask, 'start' | 'end'>
    : never

/** 已访问模型终止同构与相互递归，异构后代保留各自的业务字段。 */
type GanttTaskNodes<T extends GanttTask, Seen = never> = T extends Seen
  ? never
  : T | GanttTaskNodes<NonNullable<T['children']>[number], Seen | T>

/** SDK 的事件与布局可针对任意层任务触发，不能将后代虚称为根记录。 */
export type GanttTaskNodeRecord<T extends GanttTask = GanttTask> =
  GanttTaskRecord<GanttTaskNodes<T>>
export type GanttTaskChanges<T extends GanttTask = GanttTask> = Partial<
  GanttTaskNodeRecord<T>
>
export type GanttClickEvent =
  | GanttTypes.TableEventHandlersEventArgumentMap['click_task_bar']['event']
  | VTableTypes.TableEventHandlersEventArgumentMap['click_cell']['event']

export type GanttTaskBarContext<T extends GanttTask = GanttTask> = Omit<
  GanttTypes.TaskBarCustomLayoutArgumentType,
  'taskRecord'
> & { taskRecord: GanttTaskNodeRecord<T> }
export type GanttTaskBarLayout<T extends GanttTask = GanttTask> = (
  context: GanttTaskBarContext<T>
) => GanttTypes.ITaskBarCustomLayoutObj
export type GanttTimelineContext = GanttTypes.DateCustomLayoutArgumentType
export type GanttTimelineLayout = GanttTypes.IDateCustomLayout

type TaskTable<T extends GanttTask> = Omit<
  VTableTypes.BaseTableAPI,
  'getCellOriginRecord'
> & {
  getCellOriginRecord: (
    col: number,
    row: number
  ) => GanttTaskNodeRecord<T> | undefined
}
export type GanttTaskCellContext<T extends GanttTask = GanttTask> =
  VTableTypes.CustomRenderFunctionArg<TaskTable<T>>
/** 采用 SDK 的返回对象，只收紧已知会向外泄漏 any 的图形根节点。 */
export type GanttTaskCellLayout<T extends GanttTask = GanttTask> = (
  context: GanttTaskCellContext<T>
) => Omit<VTableTypes.ICustomLayoutObj, 'rootContainer'> & {
  rootContainer: NonNullable<
    GanttTypes.ITaskBarCustomLayoutObj['rootContainer']
  >
}

type GanttColumn<T extends GanttTask, C = ColumnDefine> = C extends ColumnDefine
  ? C extends { columns: unknown }
    ? Omit<C, 'columns'> & { columns: GanttColumn<T>[] }
    : Omit<C, 'customLayout' | 'headerCustomLayout'> & {
        customLayout?: GanttTaskCellLayout<T> | 'react-custom-layout'
        headerCustomLayout?: GanttTaskCellLayout<T> | 'react-custom-layout'
      }
  : never

type NativeTaskList = NonNullable<GanttConstructorOptions['taskListTable']>
type NativeTaskBar = NonNullable<GanttConstructorOptions['taskBar']>
/** 配置按现有预设合并；只放宽实际支持的嵌套补丁层，保留 SDK 其他能力。 */
export type GanttOptions<T extends GanttTask = GanttTask> = Partial<
  Omit<
    GanttConstructorOptions,
    'records' | 'timelineHeader' | 'taskListTable' | 'taskBar'
  >
> & {
  timelineHeader?: Partial<GanttConstructorOptions['timelineHeader']>
  taskListTable?: Omit<NativeTaskList, 'columns'> & {
    columns?: GanttColumn<T>[]
  }
  taskBar?: Omit<NativeTaskBar, 'customLayout'> & {
    customLayout?: GanttTaskBarLayout<T>
  }
}

export interface GanttProps<T extends GanttTask = GanttTask> {
  data?: T[]
  options?: GanttOptions<T>
  preset?: GanttPreset
  height?: string | number
  title?: string
  showToolbar?: boolean
  showFullscreenButton?: boolean
  theme?: 'light' | 'dark'
}
export interface GanttEmits<T extends GanttTask = GanttTask> {
  ganttCreated: [gantt: Gantt]
  taskClick: [task: GanttTaskNodeRecord<T>, event: GanttClickEvent]
  taskChange: [task: GanttTaskNodeRecord<T>, changes: GanttTaskChanges<T>]
  error: [error: Error]
}
/** Vue 会解包顶层引用；未初始化、失败、切换及卸载后实例为 undefined。 */
export interface GanttExpose<T extends GanttTask = GanttTask> {
  ganttInstance: Gantt | undefined
  loading: boolean
  error: Error | undefined
  reload: () => Promise<void>
  updateData: (data: T[]) => void
  updateOptions: (options: GanttOptions<T>) => void
  toggleFullscreen: () => Promise<void>
}
