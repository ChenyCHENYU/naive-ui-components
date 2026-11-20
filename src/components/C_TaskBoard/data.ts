import type {
  TaskBoardColumn,
  TaskBoardKey,
  TaskBoardLane,
  TaskBoardPosition,
  TaskBoardTask,
} from './types'

interface CardReference {
  key: TaskBoardKey
}

interface BoardLane {
  key: string | null
  label?: string
  byStatus: Map<string, CardReference[]>
}

let nextDragGroup = 0

/** Sortable group names share the document, including separate Vue roots. */
export function createTaskBoardDragGroup() {
  return `robot-task-board-${++nextDragGroup}`
}

function byUniqueKey<T extends { key: string }>(items: readonly T[]) {
  const map = new Map<string, T>()
  for (const item of items)
    if (item.key && !map.has(item.key)) map.set(item.key, item)
  return map
}

/** Preserve caller order within each cell and keep business objects out of the drag library. */
export function buildTaskBoard<T extends TaskBoardTask>(
  tasks: readonly T[],
  columns: readonly TaskBoardColumn<T['status']>[],
  lanes: readonly TaskBoardLane[] | undefined
) {
  const columnsByKey = byUniqueKey(columns)
  const lanesByKey = new Map(
    [...byUniqueKey(lanes ?? []).values()].map(lane => [
      lane.key,
      { ...lane, byStatus: new Map<string, CardReference[]>() },
    ])
  )
  const unassigned: BoardLane = { key: null, byStatus: new Map() }
  const taskPositions = new Map<
    TaskBoardKey,
    { task: T; position: TaskBoardPosition<T['status']> }
  >()
  for (const task of tasks) {
    if (!columnsByKey.has(task.status) || taskPositions.has(task.key)) continue
    const lane = lanesByKey.get(task.lane ?? '') ?? unassigned
    const cell = lane.byStatus.get(task.status) ?? []
    const position: TaskBoardPosition<T['status']> = {
      status: task.status,
      lane: lane.key,
      index: cell.length,
    }
    taskPositions.set(task.key, { task, position })
    cell.push({ key: task.key })
    lane.byStatus.set(task.status, cell)
  }
  const rows: BoardLane[] = [...lanesByKey.values()]
  if (!rows.length || unassigned.byStatus.size) rows.push(unassigned)

  return { columnsByKey, rows, taskPositions }
}
