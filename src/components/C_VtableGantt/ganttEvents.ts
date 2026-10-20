/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-19
 * @Description: 原生甘特图与任务表事件到组件公共事件的桥接
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */
import type { Gantt } from '@visactor/vtable-gantt'
import type {
  GanttTask,
  GanttTaskNodeRecord,
  GanttClickEvent,
  GanttTaskChanges,
} from './types'
/** 监听原生存在的事件，任务条和表格编辑都发布同一份记录。 */
export function bindGanttEvents<T extends GanttTask = GanttTask>(
  instance: Gantt,
  onClick: (task: GanttTaskNodeRecord<T>, event: GanttClickEvent) => void,
  onChange: (task: GanttTaskNodeRecord<T>, changes: GanttTaskChanges<T>) => void
) {
  instance.on('click_task_bar', args => {
    if (args.record) onClick(args.record, args.event)
  })
  instance.on('change_date_range', args => {
    if (args.record) {
      const changes = { start: args.startDate, end: args.endDate }
      onChange({ ...args.record, ...changes }, changes as GanttTaskChanges<T>)
    }
  })
  instance.on('progress_update', args => {
    if (args.record) {
      const changes = { progress: args.progress }
      onChange({ ...args.record, ...changes }, changes as GanttTaskChanges<T>)
    }
  })
  const table = instance.taskListTableInstance
  if (!table) return
  table.on('click_cell', args => {
    const record = table.getCellOriginRecord(args.col, args.row)
    if (record && typeof record === 'object' && 'id' in record)
      onClick(record as GanttTaskNodeRecord<T>, args.event)
  })
  table.on('change_cell_value', args => {
    const record = table.getCellOriginRecord(args.col, args.row)
    const field = table.getHeaderField(args.col, args.row)
    if (record && typeof field === 'string')
      onChange({ ...record, [field]: args.changedValue }, {
        [field]: args.changedValue,
      } as GanttTaskChanges<T>)
  })
}
