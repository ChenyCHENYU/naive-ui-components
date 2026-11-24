import { computed, ref } from 'vue'
import { resolveActionState } from './presets'
import type { ActionEntry, ActionItem, TableActionsProps } from './types'

type Side = 'left' | 'right'

function visibleEntries(
  actions: readonly ActionItem[],
  side: Side
): ActionEntry[] {
  const occurrences = new Map<string, number>()
  const entries: ActionEntry[] = []
  actions.forEach((action, index) => {
    const taskKey =
      action.key === undefined
        ? `position:${side}:${index}`
        : `key:${action.key}`
    // 隐藏项保留原位置和同 key 序号，显隐变化不会把执行锁交给邻项。
    const occurrence = occurrences.get(taskKey) ?? 0
    occurrences.set(taskKey, occurrence + 1)
    if (resolveActionState(action.show) === false) return
    entries.push({
      action,
      taskKey,
      renderKey: `${side}:${taskKey}:${occurrence}`,
    })
  })
  return entries
}

function canOverflow({ action }: ActionEntry): boolean {
  return (
    action.overflow === true &&
    !action.buttonProps &&
    !action.directives?.length &&
    !action.dropdown?.length &&
    !action.tooltip
  )
}

/** 根据动作来源、显示状态与容器宽度派生左右分组和溢出入口。 */
export function useActionGroups(
  props: Pick<TableActionsProps, 'actions' | 'leftActions' | 'rightActions'>,
  threshold: () => number
) {
  const narrow = ref(false)
  const overflowAt = computed(() => {
    const width = threshold()
    return Number.isFinite(width) && width > 0 ? width : 0
  })
  const buttonGroups = computed(() => {
    const actions = props.actions ?? []
    const left = visibleEntries(
      props.leftActions?.length
        ? props.leftActions
        : actions.filter(action => action.group !== 'right'),
      'left'
    )
    const right = visibleEntries(
      props.rightActions?.length
        ? props.rightActions
        : actions.filter(action => action.group === 'right'),
      'right'
    )
    const overflow: ActionEntry[] = []
    if (!overflowAt.value || !narrow.value) return { left, right, overflow }

    const keepVisible = (entry: ActionEntry) => {
      if (!canOverflow(entry)) return true
      overflow.push(entry)
      return false
    }
    return {
      left: left.filter(keepVisible),
      right: right.filter(keepVisible),
      overflow,
    }
  })
  return { buttonGroups, narrow, overflowAt }
}
