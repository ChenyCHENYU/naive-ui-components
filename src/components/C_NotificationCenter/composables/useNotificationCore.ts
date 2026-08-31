/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-27
 * @Description: 通知中心核心状态管理
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */

import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import type {
  NotificationMessage,
  NotificationCategory,
  NotificationCenterProps,
  WSNotificationPayload,
  WSConnectionStatus,
} from '../types'
import {
  DEFAULT_PAGE_SIZE,
  DEFAULT_POLLING_INTERVAL,
  DEFAULT_STORAGE_KEY,
  MOCK_MESSAGES,
} from '../constants'
import { useNotificationWS } from './useNotificationWS'
import { setItem, getItem } from '../../../utils/storage'

/** 缓存数据结构 */
interface CachedState {
  unreadIds: string[]
  lastFetchTime: number
}

/** 防抖持久化延迟（ms） */
const PERSIST_DEBOUNCE = 300

function isNotificationMessage(value: unknown): value is NotificationMessage {
  if (!value || typeof value !== 'object') return false
  const message = value as Partial<NotificationMessage>
  return (
    typeof message.id === 'string' &&
    typeof message.title === 'string' &&
    typeof message.summary === 'string' &&
    typeof message.timestamp === 'string' &&
    ['system', 'business', 'alarm'].includes(String(message.category)) &&
    ['low', 'normal', 'high', 'urgent'].includes(String(message.priority)) &&
    ['read', 'unread', 'archived'].includes(String(message.status))
  )
}

/**
 * 通知中心核心状态管理
 *
 * 统一管理消息列表、未读数、分类过滤、已读标记、
 * API 交互、WebSocket 桥接、轮询调度和本地缓存。
 */
export function useNotificationCore(props: NotificationCenterProps) {
  /* ─── 响应式状态 ─────────────────────────────── */

  /** 消息列表 */
  const messages = ref<NotificationMessage[]>([])
  /** 当前选中分类 */
  const activeCategory = ref<NotificationCategory | 'all'>('all')
  /** 是否正在加载 */
  const loading = ref(false)
  /** 总条数 */
  const total = ref(0)
  /** 当前页码 */
  const page = ref(1)
  /** 选中的消息（详情展示） */
  const selectedMessage = ref<NotificationMessage | null>(null)
  /** Popover 展开状态 */
  const popoverVisible = ref(false)
  /** WebSocket 连接状态 */
  const wsStatus = ref<WSConnectionStatus>('disconnected')
  let fetchVersion = 0

  /* ─── 计算属性 ───────────────────────────────── */

  /** 未读消息总数 */
  const unreadCount = computed(
    () => messages.value.filter(m => m.status === 'unread').length
  )

  /** 各分类未读数 */
  const unreadByCategory = computed(() => {
    const counts: Record<string, number> = { system: 0, business: 0, alarm: 0 }
    for (const m of messages.value) {
      if (m.status === 'unread' && m.category in counts) {
        counts[m.category]++
      }
    }
    return counts
  })

  /** 当前分类下的消息列表 */
  const filteredMessages = computed(() => {
    if (activeCategory.value === 'all') return messages.value
    return messages.value.filter(m => m.category === activeCategory.value)
  })

  /** 是否有更多消息可加载 */
  const hasMore = computed(() => messages.value.length < total.value)

  /* ─── 缓存管理 ───────────────────────────────── */

  /** 缓存 key */
  const storageKey = computed(() => props.storageKey ?? DEFAULT_STORAGE_KEY)

  /**
   * 从缓存恢复未读状态
   */
  function restoreFromCache() {
    const cached = getItem<CachedState>(storageKey.value)
    if (Array.isArray(cached?.unreadIds)) {
      const idSet = new Set(
        cached.unreadIds.filter((id): id is string => typeof id === 'string')
      )
      for (const msg of messages.value) {
        if (idSet.has(msg.id)) {
          msg.status = 'unread'
        }
      }
    }
  }

  /** 防抖持久化定时器 */
  let persistTimer: ReturnType<typeof setTimeout> | null = null

  /**
   * 持久化未读状态到本地缓存（防抖）
   */
  function persistToCache() {
    if (persistTimer) clearTimeout(persistTimer)
    persistTimer = setTimeout(() => {
      const unreadIds = messages.value
        .filter(m => m.status === 'unread')
        .map(m => m.id)
      setItem<CachedState>(storageKey.value, {
        unreadIds,
        lastFetchTime: Date.now(),
      })
      persistTimer = null
    }, PERSIST_DEBOUNCE)
  }

  /* ─── API 交互 ───────────────────────────────── */

  /**
   * 拉取消息列表
   */
  // eslint-disable-next-line complexity -- 请求版本、分页和回滚在一个原子状态流程中处理。
  async function fetchMessages(reset = false) {
    const version = ++fetchVersion
    if (reset) {
      page.value = 1
    }

    loading.value = true
    try {
      if (props.fetchNotifications) {
        const categoryParam =
          activeCategory.value === 'all' ? undefined : activeCategory.value
        const pageSize = props.pageSize ?? DEFAULT_PAGE_SIZE
        const result = await props.fetchNotifications({
          category: categoryParam,
          page: page.value,
          pageSize,
        })
        if (version !== fetchVersion) return
        const list = Array.isArray(result.list) ? result.list : []
        if (reset) {
          messages.value = list
        } else {
          const existingIds = new Set(messages.value.map(message => message.id))
          messages.value.push(
            ...list.filter(message => !existingIds.has(message.id))
          )
        }
        total.value = Math.max(messages.value.length, Number(result.total) || 0)
      } else {
        /* 未配置 API 接口 → 使用模拟数据（全量加载，客户端过滤） */
        loadMockData()
      }

      if (version === fetchVersion) restoreFromCache()
    } catch (error) {
      if (version === fetchVersion) props.onError?.(error, 'fetch')
      throw error
    } finally {
      if (version === fetchVersion) loading.value = false
    }
  }

  /**
   * 加载模拟数据（全量加载，filteredMessages 负责客户端过滤）
   */
  function loadMockData() {
    messages.value = MOCK_MESSAGES.map(m => ({ ...m }))
    total.value = MOCK_MESSAGES.length
  }

  /**
   * 加载更多
   */
  async function loadMore() {
    if (!hasMore.value || loading.value) return
    const previousPage = page.value
    page.value++
    try {
      await fetchMessages()
    } catch (error) {
      page.value = previousPage
      throw error
    }
  }

  /**
   * 标记指定消息为已读
   */
  async function markAsRead(ids: string[]) {
    const idSet = new Set(ids)
    const previousStatuses = new Map(
      messages.value
        .filter(message => idSet.has(message.id))
        .map(message => [message.id, message.status] as const)
    )

    /* 乐观更新 */
    for (const msg of messages.value) {
      if (idSet.has(msg.id)) {
        msg.status = 'read'
      }
    }
    persistToCache()

    /* 如果配置了 API → 同步到服务端 */
    if (props.markAsRead) {
      try {
        await props.markAsRead(ids)
      } catch (error) {
        /* 回滚 */
        for (const msg of messages.value) {
          const previousStatus = previousStatuses.get(msg.id)
          if (previousStatus) msg.status = previousStatus
        }
        persistToCache()
        props.onError?.(error, 'mark-as-read')
        throw error
      }
    }
  }

  /**
   * 标记全部已读
   */
  async function markAllAsRead(category?: NotificationCategory) {
    const targetMessages = category
      ? messages.value.filter(
          m => m.category === category && m.status === 'unread'
        )
      : messages.value.filter(m => m.status === 'unread')

    /* 乐观更新 */
    for (const msg of targetMessages) {
      msg.status = 'read'
    }
    persistToCache()

    if (props.markAllRead) {
      try {
        await props.markAllRead(category)
      } catch (error) {
        /* 回滚 */
        for (const msg of targetMessages) {
          msg.status = 'unread'
        }
        persistToCache()
        props.onError?.(error, 'mark-all-as-read')
        throw error
      }
    }
  }

  /**
   * 删除消息
   */
  async function deleteMessages(ids: string[]) {
    const idSet = new Set(ids)
    const backup = [...messages.value]
    const backupTotal = total.value

    /* 乐观更新 */
    messages.value = messages.value.filter(m => !idSet.has(m.id))
    total.value = Math.max(
      0,
      total.value - (backup.length - messages.value.length)
    )
    persistToCache()

    if (props.deleteNotification) {
      try {
        await props.deleteNotification(ids)
      } catch (error) {
        messages.value = backup
        total.value = backupTotal
        persistToCache()
        props.onError?.(error, 'delete')
        throw error
      }
    }
  }

  /**
   * 清空消息
   */
  async function clearMessages(category?: NotificationCategory) {
    const backup = [...messages.value]
    const backupTotal = total.value

    if (category) {
      messages.value = messages.value.filter(m => m.category !== category)
    } else {
      messages.value = []
    }
    total.value = messages.value.length
    persistToCache()

    if (props.clearNotifications) {
      try {
        await props.clearNotifications(category)
      } catch (error) {
        messages.value = backup
        total.value = backupTotal
        persistToCache()
        props.onError?.(error, 'clear')
        throw error
      }
    }
  }

  /* ─── WebSocket 桥接 ─────────────────────────── */

  /**
   * 处理 WebSocket 推送消息
   */
  function handleWSMessage(payload: WSNotificationPayload) {
    switch (payload.type) {
      case 'new_message': {
        const msg = payload.data as NotificationMessage
        if (!isNotificationMessage(msg)) return
        /* 去重后插入到列表头部 */
        if (!messages.value.some(m => m.id === msg.id)) {
          messages.value.unshift(msg)
          total.value++
          persistToCache()
          showDesktopNotification(msg)
        }
        break
      }
      case 'read_sync': {
        if (!Array.isArray(payload.data)) return
        const syncMessages = payload.data.filter(isNotificationMessage)
        const readIds = new Set(syncMessages.map(m => m.id))
        for (const msg of messages.value) {
          if (readIds.has(msg.id)) msg.status = 'read'
        }
        persistToCache()
        break
      }
      case 'count_update': {
        /* 服务端推送的未读数可用于校准 */
        break
      }
    }
  }

  /** WebSocket 连接状态变更回调 */
  function handleWSStatusChange(s: WSConnectionStatus) {
    wsStatus.value = s
  }

  const { connect: wsConnect, disconnect: wsDisconnect } = useNotificationWS(
    handleWSMessage,
    handleWSStatusChange
  )

  /* ─── 桌面通知 ──────────────────────────────── */

  /**
   * 发送桌面通知
   */
  function showDesktopNotification(msg: NotificationMessage) {
    if (!props.desktopNotification) return
    if (typeof window === 'undefined' || !('Notification' in window)) return

    if (Notification.permission === 'granted') {
      createDesktopNotification(msg)
    }
  }

  async function requestDesktopPermission(): Promise<
    NotificationPermission | 'unsupported'
  > {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported'
    }
    return Notification.requestPermission()
  }

  /**
   * 创建桌面通知实例
   */
  function createDesktopNotification(msg: NotificationMessage) {
    const n = new Notification(msg.title, {
      body: msg.summary,
      icon: msg.sender?.avatar || '/robot-avatar.png',
      tag: msg.id,
    })

    n.addEventListener('click', () => {
      window.focus()
      selectMessage(msg)
      n.close()
    })

    /* 5 秒后自动关闭 */
    setTimeout(() => n.close(), 5000)
  }

  /* ─── 轮询 ──────────────────────────────────── */

  let pollingTimer: ReturnType<typeof setInterval> | null = null

  /**
   * 启动轮询
   */
  function startPolling() {
    stopPolling()
    const interval = props.pollingInterval ?? DEFAULT_POLLING_INTERVAL
    if (interval <= 0) return

    pollingTimer = setInterval(() => {
      if (!loading.value) void fetchMessages(true).catch(() => undefined)
    }, interval)
  }

  /**
   * 停止轮询
   */
  function stopPolling() {
    if (pollingTimer) {
      clearInterval(pollingTimer)
      pollingTimer = null
    }
  }

  /* ─── 交互 ──────────────────────────────────── */

  /**
   * 选中/查看消息
   */
  function selectMessage(msg: NotificationMessage) {
    selectedMessage.value = msg
    /* 自动标记为已读 */
    if (msg.status === 'unread') {
      void markAsRead([msg.id]).catch(() => undefined)
    }
  }

  /**
   * 返回列表
   */
  function clearSelection() {
    selectedMessage.value = null
  }

  /**
   * 切换分类
   *
   * 纯客户端过滤（Mock / 已加载数据）直接切换，
   * API 模式则重新拉取对应分类数据。
   */
  function switchCategory(category: NotificationCategory | 'all') {
    activeCategory.value = category
    selectedMessage.value = null

    /* 仅 API 模式需要重新拉取 */
    if (props.fetchNotifications) {
      void fetchMessages(true).catch(() => undefined)
    }
  }

  /* ─── 初始化 & 清理 ─────────────────────────── */

  /**
   * 初始化
   */
  function init() {
    void fetchMessages(true).catch(() => undefined)
    startPolling()

    /* 如果配置了 WebSocket → 建连 */
    if (props.wsConfig) wsConnect(props.wsConfig)
  }

  /**
   * 销毁
   */
  function destroy() {
    fetchVersion++
    stopPolling()
    wsDisconnect()
    if (persistTimer) {
      clearTimeout(persistTimer)
      persistTimer = null
    }
  }

  onMounted(init)
  onBeforeUnmount(destroy)

  return {
    /* 状态 */
    messages,
    activeCategory,
    loading,
    total,
    page,
    selectedMessage,
    popoverVisible,
    wsStatus,

    /* 计算 */
    unreadCount,
    unreadByCategory,
    filteredMessages,
    hasMore,

    /* 操作 */
    fetchMessages,
    loadMore,
    markAsRead,
    markAllAsRead,
    deleteMessages,
    clearMessages,
    selectMessage,
    clearSelection,
    switchCategory,
    requestDesktopPermission,

    /* WebSocket */
    connectWS: wsConnect,
    disconnectWS: wsDisconnect,
  }
}
