import { useScopedComponentLocale } from '../_shared/useScopedComponentLocale'

const CHINESE = Object.freeze({
  'picker.batch.open': '批量粘贴',
  'picker.batch.input': '待匹配编码',
  'picker.batch.hint': '粘贴一列编码，支持换行、制表符、逗号或分号分隔',
  'picker.batch.lookup': '匹配编码',
  'picker.batch.results': '编码匹配结果',
  'picker.batch.add': '加入 {count} 项',
  'picker.batch.match': '可加入',
  'picker.batch.missing': '未匹配',
  'picker.batch.disabled': '不可选择',
  'picker.batch.selected': '已选择',
  'picker.batch.limit': '超过选择上限',
  'picker.batch.empty': '请输入要匹配的编码',
  'picker.batch.items': '单次最多匹配 {count} 个不同编码',
  'picker.batch.text': '粘贴内容过长，请分批匹配',
  'picker.batch.failed': '匹配失败，请重试',
})

const ENGLISH = Object.freeze({
  'picker.batch.open': 'Paste codes',
  'picker.batch.input': 'Codes to match',
  'picker.batch.hint':
    'Paste codes separated by newlines, tabs, commas or semicolons',
  'picker.batch.lookup': 'Match codes',
  'picker.batch.results': 'Code match results',
  'picker.batch.add': 'Add {count}',
  'picker.batch.match': 'Available',
  'picker.batch.missing': 'No match',
  'picker.batch.disabled': 'Unavailable',
  'picker.batch.selected': 'Already selected',
  'picker.batch.limit': 'Selection limit reached',
  'picker.batch.empty': 'Enter codes to match',
  'picker.batch.items': 'Match up to {count} unique codes per batch',
  'picker.batch.text': 'The pasted text is too long. Use smaller batches.',
  'picker.batch.failed': 'Matching failed. Please retry.',
})

export const useBatchLocale = () => useScopedComponentLocale(CHINESE, ENGLISH)
