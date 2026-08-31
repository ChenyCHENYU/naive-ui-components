/**
 * 核心上传逻辑
 */

import { ref, computed, reactive, onBeforeUnmount } from 'vue'
import type { UploadFileItem, UploadProps, ChunkProgress } from '../types'
import { DEFAULT_CHUNK_SIZE, DEFAULT_CONCURRENCY } from '../constants'
import { useFileHash } from './useFileHash'
import { useChunkUpload } from './useChunkUpload'
import { useUploadQueue } from './useUploadQueue'

/**
 * 核心上传逻辑
 *
 * 统一调度文件校验、hash 计算、秒传检查、分片/普通上传、
 * 进度汇总和状态管理。
 */
export function useUploadCore(props: UploadProps) {
  // ─── 响应式 Props 引用 ────────────────────────

  const action = computed(() => props.action ?? '')
  const headers = computed(() => props.headers ?? {})
  const data = computed(() => props.data ?? {})
  const chunkSize = computed(() => {
    const value = Math.trunc(Number(props.chunkSize))
    return Number.isFinite(value) && value > 0 ? value : DEFAULT_CHUNK_SIZE
  })
  const concurrency = computed(() => {
    const value = Math.trunc(Number(props.concurrency))
    return Number.isFinite(value) && value > 0 ? value : DEFAULT_CONCURRENCY
  })
  const customRequest = computed(() => props.customRequest)
  const instantCheck = computed(() => props.instantCheck)
  const uploadedChunksQuery = computed(() => props.uploadedChunksQuery)
  const mergeChunks = computed(() => props.mergeChunks)

  // ─── 文件列表 ────────────────────────────────

  const fileList = ref<UploadFileItem[]>([...(props.defaultFileList ?? [])])
  const pausedSet = reactive(new Set<string>())
  const operationVersions = new Map<string, symbol>()
  const ownedObjectUrls = new Set<string>()

  // ─── 子 composable ───────────────────────────

  const { hashing, hashProgress, calculateHash } = useFileHash(chunkSize)

  const chunkUploader = useChunkUpload({
    chunkSize,
    concurrency,
    action,
    headers,
    data,
    customRequest,
    uploadedChunksQuery,
    mergeChunks,
  })

  const uploadQueue = useUploadQueue({
    concurrency,
    action,
    headers,
    data,
    customRequest,
  })

  // ─── 总进度 ──────────────────────────────────

  const totalPercent = computed(() => {
    const list = fileList.value
    if (list.length === 0) return 0
    const total = list.reduce((sum, f) => sum + f.percent, 0)
    return Math.round(total / list.length)
  })

  // ─── 文件操作 ────────────────────────────────

  /** 生成唯一 ID */
  function generateUid(): string {
    return typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? `upload-${crypto.randomUUID()}`
      : `upload-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  }

  /** 创建缩略图 */
  function createThumbnail(file: File): string | undefined {
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file)
      ownedObjectUrls.add(url)
      return url
    }
    return undefined
  }

  /** 添加文件到列表 */
  function addFiles(files: File[]): UploadFileItem[] {
    const items: UploadFileItem[] = []

    for (const file of files) {
      // 数量限制
      if (
        Number.isFinite(props.maxCount) &&
        (props.maxCount ?? 0) > 0 &&
        fileList.value.length + items.length >= Math.trunc(props.maxCount!)
      ) {
        break
      }

      const item: UploadFileItem = {
        uid: generateUid(),
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'pending',
        percent: 0,
        raw: file,
        thumbUrl: createThumbnail(file),
      }

      items.push(item)
    }

    fileList.value.push(...items)
    return items
  }

  /** 更新文件状态 */
  function updateFile(uid: string, patch: Partial<UploadFileItem>) {
    const file = fileList.value.find(f => f.uid === uid)
    if (file) Object.assign(file, patch)
  }

  /** 移除文件 */
  function removeFile(uid: string) {
    operationVersions.set(uid, Symbol(uid))
    chunkUploader.abortUpload(uid)
    uploadQueue.abort(uid)
    pausedSet.delete(uid)

    const idx = fileList.value.findIndex(f => f.uid === uid)
    if (idx !== -1) {
      const file = fileList.value[idx]
      revokeOwnedObjectUrl(file.thumbUrl)
      fileList.value.splice(idx, 1)
    }
  }

  /** 清空所有 */
  function clearAll() {
    chunkUploader.abortAll()
    uploadQueue.abortAll()
    pausedSet.clear()

    fileList.value.forEach(f => {
      revokeOwnedObjectUrl(f.thumbUrl)
    })
    fileList.value = []
    operationVersions.clear()
  }

  // ─── 上传流程 ────────────────────────────────

  /** 校验单文件 */
  async function validateFile(file: File): Promise<File | null> {
    // 大小校验
    if ((props.maxSize ?? 0) > 0 && file.size > props.maxSize!) {
      return null
    }

    // 自定义 beforeUpload
    if (props.beforeUpload) {
      const result = await props.beforeUpload(file)
      if (result === false) return null
      if (result instanceof File) {
        if ((props.maxSize ?? 0) > 0 && result.size > props.maxSize!)
          return null
        return result
      }
    }

    return file
  }

  function revokeOwnedObjectUrl(url: string | undefined) {
    if (!url || !ownedObjectUrls.has(url)) return
    URL.revokeObjectURL(url)
    ownedObjectUrls.delete(url)
  }

  function isOperationCurrent(uid: string, version: symbol): boolean {
    return (
      operationVersions.get(uid) === version &&
      !pausedSet.has(uid) &&
      fileList.value.some(file => file.uid === uid)
    )
  }

  /** 上传单个文件 */
  // eslint-disable-next-line complexity -- 单文件状态机集中保证校验、秒传、分片及取消的原子性。
  async function processFile(item: UploadFileItem) {
    if (!item.raw) return
    const version = Symbol(item.uid)
    operationVersions.set(item.uid, version)
    updateFile(item.uid, { status: 'validating', error: undefined })

    // 前置校验
    let preparedFile: File | null
    try {
      preparedFile = await validateFile(item.raw)
    } catch (error) {
      if (isOperationCurrent(item.uid, version)) {
        updateFile(item.uid, {
          status: 'error',
          error: error instanceof Error ? error.message : '文件校验失败',
        })
      }
      return
    }
    if (!isOperationCurrent(item.uid, version)) return
    if (!preparedFile) {
      updateFile(item.uid, { status: 'error', error: '文件校验未通过' })
      return
    }
    if (preparedFile !== item.raw) {
      revokeOwnedObjectUrl(item.thumbUrl)
      Object.assign(item, {
        raw: preparedFile,
        name: preparedFile.name,
        size: preparedFile.size,
        type: preparedFile.type,
        thumbUrl: createThumbnail(preparedFile),
      })
    }

    if (!customRequest.value && !action.value.trim()) {
      updateFile(item.uid, { status: 'error', error: '未配置上传地址' })
      return
    }

    // 秒传检查（所有模式均支持，只要提供了 instantCheck）
    if (instantCheck.value && !item.hash) {
      updateFile(item.uid, { status: 'hashing' })
      try {
        const hash = await calculateHash(item.raw)
        if (!isOperationCurrent(item.uid, version)) return
        updateFile(item.uid, { hash })
        const result = await instantCheck.value(hash, item.raw.name)
        if (!isOperationCurrent(item.uid, version)) return
        if (result.exists) {
          updateFile(item.uid, {
            status: 'instant',
            percent: 100,
            url: result.url,
          })
          return
        }
      } catch {
        if (!isOperationCurrent(item.uid, version)) return
        // 秒传检查失败，继续正常上传
      }
    }

    // 分片模式
    if (props.chunked && item.raw.size > chunkSize.value) {
      await processChunkedUpload(item, version)
    } else {
      processNormalUpload(item, version)
    }
  }

  /** 分片上传流程 */
  async function processChunkedUpload(item: UploadFileItem, version: symbol) {
    const file = item.raw!

    // 1. 计算 hash（如果秒传检查已计算则复用）
    let { hash } = item
    if (!hash) {
      updateFile(item.uid, { status: 'hashing' })
      try {
        hash = await calculateHash(file)
        if (!isOperationCurrent(item.uid, version)) return
        updateFile(item.uid, { hash })
      } catch {
        if (isOperationCurrent(item.uid, version)) {
          updateFile(item.uid, { status: 'error', error: 'Hash 计算失败' })
        }
        return
      }
    }

    // 2. 分片上传
    updateFile(item.uid, { status: 'uploading' })

    await chunkUploader.uploadChunks({
      uid: item.uid,
      file,
      hash,
      onProgress: (progress: ChunkProgress) => {
        if (!isOperationCurrent(item.uid, version)) return
        const percent = Math.round(
          (progress.uploadedBytes / progress.totalBytes) * 100
        )
        updateFile(item.uid, { percent, chunkProgress: progress })
      },
      onSuccess: (response: unknown) => {
        if (!isOperationCurrent(item.uid, version)) return
        updateFile(item.uid, { status: 'success', percent: 100, response })
      },
      onError: (error: Error) => {
        if (!isOperationCurrent(item.uid, version)) return
        updateFile(item.uid, { status: 'error', error: error.message })
      },
      isPaused: () => pausedSet.has(item.uid),
    })
  }

  /** 普通上传 */
  function processNormalUpload(item: UploadFileItem, version: symbol) {
    updateFile(item.uid, { status: 'uploading' })

    uploadQueue.enqueue(
      item,
      (uid, percent) => {
        if (!isOperationCurrent(uid, version)) return
        updateFile(uid, { percent })
      },
      (uid, response) => {
        if (!isOperationCurrent(uid, version)) return
        updateFile(uid, { status: 'success', percent: 100, response })
      },
      (uid, error) => {
        if (!isOperationCurrent(uid, version)) return
        updateFile(uid, { status: 'error', error: error.message })
      }
    )
  }

  /** 开始上传（上传所有 pending 文件） */
  function startUpload() {
    const pending = fileList.value.filter(f => f.status === 'pending')
    pending.forEach(file => void processFile(file))
  }

  /** 暂停所有 */
  function pauseAll() {
    fileList.value.forEach(f => {
      if (
        f.status === 'uploading' ||
        f.status === 'hashing' ||
        f.status === 'validating'
      ) {
        pausedSet.add(f.uid)
        operationVersions.set(f.uid, Symbol(f.uid))
        chunkUploader.abortUpload(f.uid)
        uploadQueue.abort(f.uid)
        updateFile(f.uid, { status: 'paused' })
      }
    })
  }

  /** 恢复所有 */
  function resumeAll() {
    fileList.value.forEach(f => {
      if (f.status === 'paused') {
        pausedSet.delete(f.uid)
        updateFile(f.uid, { status: 'pending' })
      }
    })
    startUpload()
  }

  /** 重试单个文件 */
  function retryFile(uid: string) {
    const file = fileList.value.find(f => f.uid === uid)
    if (file && file.status === 'error') {
      updateFile(uid, { status: 'pending', percent: 0, error: undefined })
      void processFile(file)
    }
  }

  /** 获取成功列表 */
  function getSuccessList(): UploadFileItem[] {
    return fileList.value.filter(
      f => f.status === 'success' || f.status === 'instant'
    )
  }

  // 清理 ObjectURL
  onBeforeUnmount(() => {
    chunkUploader.abortAll()
    uploadQueue.abortAll()
    operationVersions.clear()
    fileList.value.forEach(f => {
      revokeOwnedObjectUrl(f.thumbUrl)
    })
  })

  return {
    /** 文件列表 */
    fileList,
    /** 总进度 */
    totalPercent,
    /** 正在计算 hash */
    hashing,
    /** hash 进度 */
    hashProgress,

    /** 添加文件 */
    addFiles,
    /** 移除文件 */
    removeFile,
    /** 清空所有 */
    clearAll,
    /** 开始上传 */
    startUpload,
    /** 暂停所有 */
    pauseAll,
    /** 恢复所有 */
    resumeAll,
    /** 重试 */
    retryFile,
    /** 处理单文件 */
    processFile,
    /** 获取成功列表 */
    getSuccessList,
  }
}
