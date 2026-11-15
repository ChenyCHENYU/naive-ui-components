import { useScopedComponentLocale } from '../_shared/useScopedComponentLocale'

const CHINESE = Object.freeze({
  'guide.done': '完成',
  'guide.next': '下一步',
  'guide.previous': '上一步',
  'guide.skip': '跳过引导',
  'guide.trigger': '功能引导',
})
const ENGLISH = Object.freeze({
  'guide.done': 'Done',
  'guide.next': 'Next',
  'guide.previous': 'Previous',
  'guide.skip': 'Skip guide',
  'guide.trigger': 'Feature guide',
})

export const useGuideLocale = () => useScopedComponentLocale(CHINESE, ENGLISH)
