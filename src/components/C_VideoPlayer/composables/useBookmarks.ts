/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-26
 * @Description: 书签笔记
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */

import { ref, type Ref } from 'vue'
import { getItem, setItem } from '../../../utils/storage'
import { STORAGE_KEYS } from '../constants'
import type { Bookmark } from '../types'

/**
 * 书签笔记 composable
 * - 添加 / 删除 / 更新书签
 * - localStorage 持久化
 * - 按时间排序
 */
export function useBookmarks(
  url: Ref<string>,
  currentTime: Ref<number>,
  seekFn: (time: number) => void,
  initialBookmarks: Bookmark[] = []
) {
  const bookmarks = ref<Bookmark[]>([...initialBookmarks])

  /** 存储 key */
  function getStorageKey(): string {
    return STORAGE_KEYS.BOOKMARKS + encodeURIComponent(url.value)
  }

  /** 从 localStorage 恢复书签 */
  function restoreBookmarks() {
    const stored = getItem<unknown>(getStorageKey())
    if (!Array.isArray(stored)) return
    bookmarks.value = stored.filter(
      (item): item is Bookmark =>
        typeof item === 'object' &&
        item !== null &&
        typeof item.id === 'string' &&
        typeof item.time === 'number' &&
        Number.isFinite(item.time) &&
        typeof item.note === 'string' &&
        typeof item.createdAt === 'number'
    )
    sortBookmarks()
  }

  /** 保存书签到 localStorage */
  function saveBookmarks() {
    setItem(getStorageKey(), bookmarks.value)
  }

  /** 排序（按时间升序） */
  function sortBookmarks() {
    bookmarks.value.sort((a, b) => a.time - b.time)
  }

  /** 添加书签 */
  function addBookmark(note: string = ''): Bookmark {
    const bookmark: Bookmark = {
      id:
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? `bm_${crypto.randomUUID()}`
          : `bm_${Date.now()}_${bookmarks.value.length}`,
      time: currentTime.value,
      note,
      createdAt: Date.now(),
    }
    bookmarks.value.push(bookmark)
    sortBookmarks()
    saveBookmarks()
    return bookmark
  }

  /** 删除书签 */
  function removeBookmark(id: string) {
    const index = bookmarks.value.findIndex(b => b.id === id)
    if (index !== -1) {
      bookmarks.value.splice(index, 1)
      saveBookmarks()
    }
  }

  /** 更新书签备注 */
  function updateBookmark(id: string, note: string) {
    const bookmark = bookmarks.value.find(b => b.id === id)
    if (bookmark) {
      bookmark.note = note
      saveBookmarks()
    }
  }

  /** 跳转到书签位置 */
  function goToBookmark(id: string) {
    const bookmark = bookmarks.value.find(b => b.id === id)
    if (bookmark) {
      seekFn(bookmark.time)
    }
  }

  /** 清空所有书签 */
  function clearBookmarks() {
    bookmarks.value = []
    saveBookmarks()
  }

  /* 初始化时恢复 */
  if (!initialBookmarks.length) {
    restoreBookmarks()
  }

  return {
    bookmarks,
    addBookmark,
    removeBookmark,
    updateBookmark,
    goToBookmark,
    clearBookmarks,
  }
}
