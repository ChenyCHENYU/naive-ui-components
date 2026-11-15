import { useScopedComponentLocale } from '../_shared/useScopedComponentLocale'

const CHINESE = Object.freeze({
  'city.choose': '选择城市',
  'city.placeholder': '请选择城市',
  'city.byCity': '按城市',
  'city.byProvince': '按省份',
  'city.search': '搜索城市',
  'city.failed': '城市数据加载失败，请重新打开重试',
  'city.loading': '正在加载城市…',
})
const ENGLISH = Object.freeze({
  'city.choose': 'Choose a city',
  'city.placeholder': 'Choose a city',
  'city.byCity': 'By city',
  'city.byProvince': 'By province',
  'city.search': 'Search cities',
  'city.failed': 'Failed to load cities. Reopen to retry.',
  'city.loading': 'Loading cities…',
})

export const useCityLocale = () => useScopedComponentLocale(CHINESE, ENGLISH)
