import type { ComponentLocale } from '../../core/contracts'
import { useScopedComponentLocale } from '../_shared/useScopedComponentLocale'

const CHINESE = Object.freeze({
  'imageAnnotator.title': '图片标注',
  'imageAnnotator.add': '添加标注',
  'imageAnnotator.items': '标注列表',
  'imageAnnotator.item': '标注 {number}',
  'imageAnnotator.empty': '暂无标注',
  'imageAnnotator.editor': '编辑标注',
  'imageAnnotator.x': '左边距（%）',
  'imageAnnotator.y': '上边距（%）',
  'imageAnnotator.width': '宽度（%）',
  'imageAnnotator.height': '高度（%）',
  'imageAnnotator.note': '标注说明',
  'imageAnnotator.save': '保存标注',
  'imageAnnotator.remove': '删除标注',
  'imageAnnotator.loadFailed': '图片加载失败',
  'imageAnnotator.loading': '正在加载图片…',
  'imageAnnotator.unavailable': '暂无可用的图片预览',
  'imageAnnotator.invalidBox': '调整坐标和尺寸，使标注完整位于图片内',
  'imageAnnotator.stale': '该标注已更新，请重新打开后编辑',
})
const ENGLISH = Object.freeze({
  'imageAnnotator.title': 'Image annotations',
  'imageAnnotator.add': 'Add annotation',
  'imageAnnotator.items': 'Annotation list',
  'imageAnnotator.item': 'Annotation {number}',
  'imageAnnotator.empty': 'No annotations',
  'imageAnnotator.editor': 'Edit annotation',
  'imageAnnotator.x': 'Left (%)',
  'imageAnnotator.y': 'Top (%)',
  'imageAnnotator.width': 'Width (%)',
  'imageAnnotator.height': 'Height (%)',
  'imageAnnotator.note': 'Annotation note',
  'imageAnnotator.save': 'Save annotation',
  'imageAnnotator.remove': 'Delete annotation',
  'imageAnnotator.loadFailed': 'Could not load image',
  'imageAnnotator.loading': 'Loading image…',
  'imageAnnotator.unavailable': 'Image preview unavailable',
  'imageAnnotator.invalidBox':
    'Adjust the coordinates and size to fit the annotation within the image',
  'imageAnnotator.stale':
    'This annotation changed. Open it again before editing.',
})

export const useImageAnnotatorLocale = (
  local: () => ComponentLocale | undefined
) => useScopedComponentLocale(CHINESE, ENGLISH, local)
