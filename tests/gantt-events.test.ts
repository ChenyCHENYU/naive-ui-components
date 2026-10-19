/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-19
 * @Description: 原生甘特事件的任务选择与数据编辑桥接回归
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */
import { test, expect } from 'bun:test'
import type { Gantt } from '@visactor/vtable-gantt'
import { bindGanttEvents } from '../src/components/C_VtableGantt/ganttEvents'
import type { GanttTask } from '../src/components/C_VtableGantt/data'
test('native task-bar, date, progress and table events publish usable records', () => {
  const handlers = new Map<string, (args: unknown) => void>()
  const tableHandlers = new Map<string, (args: unknown) => void>()
  const record = {
    id: 'task',
    title: 'Review',
    start: '2026-10-19',
    end: '2026-10-20',
  }
  const instance = {
    on: (name: string, handler: (args: unknown) => void) =>
      handlers.set(name, handler),
    taskListTableInstance: {
      on: (name: string, handler: (args: unknown) => void) =>
        tableHandlers.set(name, handler),
      getCellOriginRecord: () => record,
      getHeaderField: () => 'title',
    },
  } as unknown as Gantt
  const clicks: GanttTask[] = []
  const changes: Array<Partial<GanttTask>> = []
  bindGanttEvents(
    instance,
    task => clicks.push(task),
    (_task, change) => changes.push(change)
  )
  handlers.get('click_task_bar')!({ record, event: new Event('click') })
  tableHandlers.get('click_cell')!({
    col: 0,
    row: 1,
    event: new Event('click'),
  })
  expect(clicks.map(task => task.id)).toEqual(['task', 'task'])
  const startDate = new Date(2026, 9, 21),
    endDate = new Date(2026, 9, 22)
  handlers.get('change_date_range')!({ record, startDate, endDate })
  handlers.get('progress_update')!({ record, progress: 75 })
  tableHandlers.get('change_cell_value')!({
    col: 0,
    row: 1,
    changedValue: 'Reviewed',
  })
  expect(changes).toEqual([
    { start: startDate, end: endDate },
    { progress: 75 },
    { title: 'Reviewed' },
  ])
})
