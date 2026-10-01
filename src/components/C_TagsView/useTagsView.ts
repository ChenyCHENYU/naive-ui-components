import { ref, type Ref } from 'vue'
import type { TagItem } from '../_shared/public'

export interface UseTagsViewOptions {
  /** localStorage 持久化 key，传空字符串则不持久化 */
  persistKey?: string
  /** 首页路径，用于 removeAll 后的回退 */
  homePath?: string
}

const STORAGE_KEY_DEFAULT = '__tags_view_list__'

type StoredTag = Record<string, unknown> & { path: string; title: string }

const isStoredTag = (value: unknown): value is StoredTag => {
  if (!value || typeof value !== 'object') return false
  const tag = value as Record<string, unknown>
  return (
    typeof tag.path === 'string' &&
    tag.path.startsWith('/') &&
    !tag.path.startsWith('//') &&
    typeof tag.title === 'string'
  )
}

const safeStoredMeta = (value: unknown): TagItem['meta'] | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return
  return Object.fromEntries(
    Object.entries(value).filter(
      ([key, entry]) =>
        !['__proto__', 'prototype', 'constructor'].includes(key) &&
        (key !== 'affix' || typeof entry === 'boolean')
    )
  )
}

/** Treat persisted tags as untrusted data before they enter navigation state. */
export function parseStoredTags(raw: string | null): TagItem[] {
  if (!raw) return []
  try {
    const value: unknown = JSON.parse(raw)
    if (!Array.isArray(value)) return []
    return value.flatMap(item => {
      if (!isStoredTag(item)) return []
      return [
        {
          path: item.path,
          title: item.title,
          originalTitle:
            typeof item.originalTitle === 'string'
              ? item.originalTitle
              : undefined,
          icon: typeof item.icon === 'string' ? item.icon : undefined,
          meta: safeStoredMeta(item.meta),
        },
      ]
    })
  } catch {
    return []
  }
}

/**
 * 标签页管理 composable
 *
 * 独立于组件使用 — 可在任何地方管理标签状态
 *
 * @example 独立使用
 * ```ts
 * const tags = useTagsView({ persistKey: 'my-tags' })
 * tags.addTag({ path: '/home', title: '首页', meta: { affix: true } })
 * ```
 */
export function useTagsView(options: UseTagsViewOptions = {}) {
  const { persistKey = STORAGE_KEY_DEFAULT, homePath = '/home' } = options

  // ====== 持久化 ======
  const loadPersistedTags = (): TagItem[] => {
    if (!persistKey) return []
    try {
      const raw = localStorage.getItem(persistKey)
      return parseStoredTags(raw)
    } catch {
      return []
    }
  }

  const persistTags = (tags: TagItem[]) => {
    if (!persistKey) return
    try {
      localStorage.setItem(persistKey, JSON.stringify(tags))
    } catch {
      /* silently fail */
    }
  }

  // ====== State ======
  const tagsViewList: Ref<TagItem[]> = ref(loadPersistedTags())
  const activeTag = ref('')

  const syncPersist = () => persistTags(tagsViewList.value)

  // ====== Actions ======

  const initTags = (tags?: TagItem[]) => {
    if (tags) {
      tagsViewList.value = tags
    } else {
      // 去重
      tagsViewList.value = [
        ...new Map(tagsViewList.value.map(tag => [tag.path, tag])).values(),
      ]
    }
    syncPersist()
  }

  const setActiveTag = (path: string) => {
    activeTag.value = path
  }

  const addTag = (tag: TagItem) => {
    const existingIndex = tagsViewList.value.findIndex(
      item => item.path === tag.path
    )

    if (existingIndex === -1) {
      tagsViewList.value.push(tag)
    } else {
      const existing = tagsViewList.value[existingIndex]
      if (existing.title !== tag.title || !existing.originalTitle) {
        existing.title = tag.title
        existing.originalTitle = tag.originalTitle || existing.originalTitle
      }
    }

    setActiveTag(tag.path)
    syncPersist()
  }

  const removeTag = (index: number): string | null => {
    if (index >= 0 && index < tagsViewList.value.length) {
      const removed = tagsViewList.value.splice(index, 1)[0]?.path ?? null
      syncPersist()
      return removed
    }
    return null
  }

  const removeOtherTags = (index: number) => {
    if (index === 0) {
      tagsViewList.value = [tagsViewList.value[0]].filter(Boolean)
    } else {
      tagsViewList.value = [
        tagsViewList.value[0],
        tagsViewList.value[index],
      ].filter(Boolean)
    }
    syncPersist()
  }

  const removeLeftTags = (index: number) => {
    tagsViewList.value = [
      tagsViewList.value[0],
      ...tagsViewList.value.slice(index),
    ]
    syncPersist()
  }

  const removeRightTags = (index: number) => {
    tagsViewList.value = tagsViewList.value.slice(0, index + 1)
    syncPersist()
  }

  const removeAllTags = () => {
    tagsViewList.value = tagsViewList.value.filter(tag => tag.meta?.affix)
    syncPersist()
  }

  return {
    tagsViewList,
    activeTag,
    homePath,
    initTags,
    setActiveTag,
    addTag,
    removeTag,
    removeOtherTags,
    removeLeftTags,
    removeRightTags,
    removeAllTags,
  }
}
