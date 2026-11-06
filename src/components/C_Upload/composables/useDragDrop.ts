/**
 * 拖拽 & 粘贴上传
 */

import { ref, readonly, watch, onMounted, onBeforeUnmount, type Ref } from 'vue'

/**
 * 拖拽 & 粘贴上传
 *
 * 监听容器的 dragover / drop / paste 事件，
 * 提取文件（含目录遍历）后回调给上层。
 *
 * @param containerRef  容器 DOM
 * @param enabled       是否启用拖拽
 * @param pasteable     是否启用粘贴
 * @param accept        文件类型限制
 * @param onFiles       文件回调
 * @param directory     是否遍历目录；独立 composable 保留原有默认行为
 */
export function useDragDrop(
  containerRef: Ref<HTMLElement | undefined>,
  enabled: Ref<boolean>,
  pasteable: Ref<boolean>,
  accept: Ref<string>,
  onFiles: (files: File[]) => void,
  directory = ref(true)
) {
  /** 是否正在拖拽悬停 */
  const isDragOver = ref(false)
  let boundElement: HTMLElement | null = null
  let dropVersion = 0

  /** 换单后浏览器的目录回调仍可能返回，但不能再进入上传队列。 */
  function invalidatePendingDrop() {
    dropVersion++
    isDragOver.value = false
  }

  // ─── 拖拽事件 ─────────────────────────────────

  /** 处理拖入事件 */
  function handleDragEnter(e: DragEvent) {
    if (!enabled.value) return
    e.preventDefault()
    isDragOver.value = true
  }

  /** 处理拖拽经过事件 */
  function handleDragOver(e: DragEvent) {
    if (!enabled.value) return
    e.preventDefault()
    isDragOver.value = true
  }

  /** 处理拖离事件 */
  function handleDragLeave(e: DragEvent) {
    if (!enabled.value) return
    e.preventDefault()
    const container = containerRef.value
    if (container && !container.contains(e.relatedTarget as Node)) {
      isDragOver.value = false
    }
  }

  /** 处理放置事件 */
  async function handleDrop(e: DragEvent) {
    if (!enabled.value) return
    e.preventDefault()
    isDragOver.value = false

    const transfer = e.dataTransfer
    if (!transfer) return
    const version = dropVersion
    const isCurrent = () => version === dropVersion && enabled.value
    const files = await collectDropFiles(transfer, directory.value, isCurrent)
    if (!isCurrent()) return
    const filtered = filterByAccept(files, accept.value)
    if (filtered.length > 0) onFiles(filtered)
  }

  // ─── 粘贴事件 ─────────────────────────────────

  /** 粘贴事件 */
  function handlePaste(e: ClipboardEvent) {
    if (!pasteable.value) return

    const items = e.clipboardData?.items
    if (!items) return

    const files: File[] = []
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.kind === 'file') {
        const file = item.getAsFile()
        if (file) files.push(file)
      }
    }

    const filtered = filterByAccept(files, accept.value)
    if (filtered.length > 0) {
      e.preventDefault()
      onFiles(filtered)
    }
  }

  // ─── 生命周期绑定 ─────────────────────────────

  /** 绑定事件 */
  function bindEvents() {
    const el = containerRef.value
    if (!el || boundElement === el) return
    boundElement = el

    el.addEventListener('dragenter', handleDragEnter)
    el.addEventListener('dragover', handleDragOver)
    el.addEventListener('dragleave', handleDragLeave)
    el.addEventListener('drop', handleDrop)

    if (pasteable.value) {
      el.addEventListener('paste', handlePaste)
    }
  }

  /** 解绑事件 */
  function unbindEvents() {
    const el = boundElement
    if (el) {
      el.removeEventListener('dragenter', handleDragEnter)
      el.removeEventListener('dragover', handleDragOver)
      el.removeEventListener('dragleave', handleDragLeave)
      el.removeEventListener('drop', handleDrop)
    }
    el?.removeEventListener('paste', handlePaste)
    boundElement = null
  }

  onMounted(bindEvents)
  onBeforeUnmount(() => {
    invalidatePendingDrop()
    unbindEvents()
  })

  watch([containerRef, enabled, directory], invalidatePendingDrop, {
    flush: 'sync',
  })
  watch([containerRef, pasteable], () => {
    unbindEvents()
    bindEvents()
  })

  return {
    isDragOver: readonly(isDragOver),
    invalidatePendingDrop,
  }
}

// ─── 工具函数 ────────────────────────────────

/** 从 drop 事件收集文件（含目录遍历） */
async function collectDropFiles(
  transfer: DataTransfer,
  directory: boolean,
  isCurrent: () => boolean
): Promise<File[]> {
  const items = Array.from(transfer.items ?? [])
  const entries = items.map(item => item.webkitGetAsEntry?.())
  if (!entries.some(Boolean)) return Array.from(transfer.files ?? [])

  // 一个拖放可以同时带可遍历条目和普通文件，不能只保留其中一种。
  const results = await Promise.all(
    items.map((item, index) => {
      const entry = entries[index]
      if (entry) return readEntry(entry, directory, isCurrent)
      const file = item.getAsFile?.()
      return file ? [file] : []
    })
  )
  return results.flat()
}

/** 递归读取 FileSystemEntry */
async function readEntry(
  entry: FileSystemEntry,
  directory: boolean,
  isCurrent: () => boolean
): Promise<File[]> {
  if (!isCurrent()) return []
  if (entry.isFile) {
    return new Promise(resolve => {
      ;(entry as FileSystemFileEntry).file(
        file => resolve([file]),
        () => resolve([])
      )
    })
  }

  if (entry.isDirectory && directory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader()
    const entries: FileSystemEntry[] = []
    while (isCurrent()) {
      // eslint-disable-next-line no-await-in-loop -- FileSystem API 分批返回目录项，必须读至空批次。
      const batch = await new Promise<FileSystemEntry[]>(resolve => {
        reader.readEntries(
          result => resolve(result),
          () => resolve([])
        )
      })
      if (!isCurrent()) return []
      if (batch.length === 0) break
      entries.push(...batch)
    }
    const results = await Promise.all(
      entries.map(child => readEntry(child, directory, isCurrent))
    )
    return results.flat()
  }

  return []
}

/** 根据 accept 过滤文件 */
export function filterByAccept(files: File[], accept: string): File[] {
  if (!accept) return files

  const acceptTypes = accept
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
  if (acceptTypes.length === 0) return files

  return files.filter(file => {
    return acceptTypes.some(type => {
      if (type.startsWith('.')) {
        // 扩展名匹配
        return file.name.toLowerCase().endsWith(type)
      }
      if (type.endsWith('/*')) {
        // MIME 前缀匹配 (image/*, video/*)
        const prefix = type.replace('/*', '')
        return file.type.toLowerCase().startsWith(`${prefix}/`)
      }
      // 精确 MIME 匹配
      return file.type.toLowerCase() === type
    })
  })
}
