import { useScopedComponentLocale } from '../_shared/useScopedComponentLocale'

const CHINESE = Object.freeze({
  'guide.done': '完成',
  'guide.next': '下一步',
  'guide.previous': '上一步',
  'guide.skip': '跳过引导',
  'guide.trigger': '功能引导',
  'guide.waitingForAction': '完成当前操作后继续',
  'guide.checklist': '操作清单',
  'guide.checklistProgress': '已完成 {done} / {total} 项',
  'guide.checklistDone': '已完成',
  'guide.checklistPending': '待完成',
})
const ENGLISH = Object.freeze({
  'guide.done': 'Done',
  'guide.next': 'Next',
  'guide.previous': 'Previous',
  'guide.skip': 'Skip guide',
  'guide.trigger': 'Feature guide',
  'guide.waitingForAction': 'Complete the current action to continue',
  'guide.checklist': 'Task checklist',
  'guide.checklistProgress': '{done} of {total} tasks complete',
  'guide.checklistDone': 'Complete',
  'guide.checklistPending': 'Pending',
})

export const useGuideLocale = () => useScopedComponentLocale(CHINESE, ENGLISH)
