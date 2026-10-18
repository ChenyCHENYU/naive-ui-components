/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-27
 * @Description: 通知中心类型定义
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */

/* ─── 消息基础类型 ─────────────────────────────── */

import type { Ref } from 'vue'

/** 远程模式缺少接口时明确报错，不回退演示数据。 */
export type NotificationDataMode = 'demo' | 'remote'

/** 未返回的分类计数保持未知，避免把当前页误当成完整统计。 */
export type NotificationUnreadByCategory = Partial<
  Record<NotificationCategory, number>
>

/** 消息类别 */
export type NotificationCategory = 'system' | 'business' | 'alarm'

/** 消息优先级 */
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'

/** 消息状态 */
export type NotificationStatus = 'unread' | 'read' | 'archived'

/** 单条通知消息 */
export interface NotificationMessage {
  /** 消息唯一 ID */
  id: string
  /** 消息标题 */
  title: string
  /** 消息摘要（列表中展示） */
  summary: string
  /** 消息详情（富文本 / 纯文本） */
  content?: string
  /** 消息类别 */
  category: NotificationCategory
  /** 优先级 */
  priority: NotificationPriority
  /** 消息状态 */
  status: NotificationStatus
  /** 发送时间（ISO 8601） */
  timestamp: string
  /** 发送者信息 */
  sender?: NotificationSender
  /** 关联操作链接 */
  actionUrl?: string
  /** 关联操作按钮文本 */
  actionText?: string
  /** 附加数据（业务扩展） */
  extra?: Record<string, unknown>
}

/** 发送者信息 */
export interface NotificationSender {
  /** 发送者名称 */
  name: string
  /** 发送者头像 URL */
  avatar?: string
}

/* ─── API 函数签名 ─────────────────────────────── */

/** 拉取消息列表函数 */
export interface FetchNotificationsResult {
  list: NotificationMessage[]
  total: number
  /** 全局未读总数，与当前分类和页码无关。 */
  unreadCount: number
  unreadByCategory?: NotificationUnreadByCategory
}

export type FetchNotificationsFn = (params: {
  category?: NotificationCategory
  status?: NotificationStatus
  page?: number
  pageSize?: number
}) => Promise<FetchNotificationsResult>

/** 标记已读函数 */
export type MarkAsReadFn = (ids: string[]) => Promise<void>

/** 标记全部已读函数 */
export type MarkAllReadFn = (category?: NotificationCategory) => Promise<void>

/** 删除消息函数 */
export type DeleteNotificationFn = (ids: string[]) => Promise<void>

/** 清空消息函数 */
export type ClearNotificationsFn = (
  category?: NotificationCategory
) => Promise<void>

/* ─── WebSocket 类型 ──────────────────────────── */

/** WebSocket 配置 */
export interface NotificationWSConfig {
  /** WebSocket 地址（ws:// 或 wss://） */
  url: string
  /** 自动重连 */
  autoReconnect?: boolean
  /** 重连间隔（ms） */
  reconnectInterval?: number
  /** 最大重连次数 */
  maxReconnectAttempts?: number
  /** 心跳间隔（ms），0 表示不发心跳 */
  heartbeatInterval?: number
  /** 心跳消息内容 */
  heartbeatMessage?: string
  /** 等待 pong 的超时（ms）；0 保持仅发送心跳的兼容行为。 */
  heartbeatTimeout?: number
  /** 鉴权 token 获取函数 */
  getToken?: () => string | undefined
}

/** WebSocket 连接状态 */
export type WSConnectionStatus =
  'connecting' | 'connected' | 'disconnected' | 'reconnecting'

/** WebSocket 推送消息负载 */
export interface WSNotificationPayload {
  /** 事件类型 */
  type: 'new_message' | 'read_sync' | 'count_update'
  /** 推送的消息数据 */
  data:
    | NotificationMessage
    | NotificationMessage[]
    | { unreadCount: number; unreadByCategory?: NotificationUnreadByCategory }
}

/**
 * 可共享的通知数据源。组件只消费状态与操作，不拥有外部控制器的生命周期。
 * Ref 支持 computed 投影，便于应用将顶部消息与完整消息中心接到同一 Store。
 */
export interface NotificationCenterController {
  messages: Readonly<Ref<NotificationMessage[]>>
  activeCategory: Ref<NotificationCategory | 'all'>
  loading: Readonly<Ref<boolean>>
  total: Readonly<Ref<number>>
  page: Readonly<Ref<number>>
  selectedMessage: Ref<NotificationMessage | null>
  popoverVisible: Ref<boolean>
  wsStatus: Readonly<Ref<WSConnectionStatus>>
  unreadCount: Readonly<Ref<number>>
  unreadByCategory: Readonly<Ref<NotificationUnreadByCategory>>
  filteredMessages: Readonly<Ref<NotificationMessage[]>>
  hasMore: Readonly<Ref<boolean>>
  error: Readonly<Ref<string | null>>
  busy: Readonly<Ref<boolean>>
  pendingIds: Readonly<Ref<readonly string[]>>
  fetchMessages: (reset?: boolean) => Promise<void>
  loadMore: () => Promise<void>
  markAsRead: (ids: string[]) => Promise<void>
  markAllAsRead: (category?: NotificationCategory) => Promise<void>
  deleteMessages: (ids: string[]) => Promise<void>
  clearMessages: (category?: NotificationCategory) => Promise<void>
  selectMessage: (message: NotificationMessage) => void
  clearSelection: () => void
  switchCategory: (category: NotificationCategory | 'all') => void
  clearError: () => void
  /** 重试最近失败的操作；未实现时组件退回刷新列表。 */
  retry?: () => Promise<void>
  connectWS: (config?: NotificationWSConfig) => void
  disconnectWS: () => void
  requestDesktopPermission: () => Promise<
    NotificationPermission | 'unsupported'
  >
}

/* ─── 组件 Props / Emits / Expose ──────────────── */

/** 组件 Props */
export interface NotificationCenterProps {
  /** 不传时根据 fetchNotifications 推断，保留无接口演示兼容性。 */
  dataMode?: NotificationDataMode
  /** 外部共享控制器；传入后不再初始化本地数据、轮询或 WebSocket。 */
  controller?: NotificationCenterController
  /** 独立 core 是否自动初始化，默认 true。 */
  autoStart?: boolean
  /** 拉取消息列表 */
  fetchNotifications?: FetchNotificationsFn
  /** 标记已读 */
  markAsRead?: MarkAsReadFn
  /** 标记全部已读 */
  markAllRead?: MarkAllReadFn
  /** 删除消息 */
  deleteNotification?: DeleteNotificationFn
  /** 清空消息 */
  clearNotifications?: ClearNotificationsFn
  /** WebSocket 配置 */
  wsConfig?: NotificationWSConfig
  /** 是否启用桌面通知 */
  desktopNotification?: boolean
  /** 角标最大显示数 */
  maxBadgeCount?: number
  /** 自动轮询间隔（ms），0 表示不轮询 */
  pollingInterval?: number
  /** 每页条数 */
  pageSize?: number
  /** 消息持久化缓存 key */
  storageKey?: string
  /** 异步操作失败回调 */
  onError?: (error: unknown, operation: string) => void
}

/** 组件 Emits */
export interface NotificationCenterEmits {
  viewAll: []
  /** 点击消息 */
  itemClick: [message: NotificationMessage]
  /** 消息已读 */
  read: [ids: string[]]
  /** 全部已读 */
  allRead: [category?: NotificationCategory]
  /** 删除消息 */
  delete: [ids: string[]]
  /** 未读数变化 */
  unreadChange: [count: number]
  /** WebSocket 连接状态变化 */
  wsStatusChange: [status: WSConnectionStatus]
  /** 收到新消息 */
  newMessage: [message: NotificationMessage]
}

/** 组件 Expose */
export interface NotificationCenterExpose {
  /** 刷新消息列表 */
  refresh: () => Promise<void>
  /** 手动连接 WebSocket */
  connectWS: () => void
  /** 手动断开 WebSocket */
  disconnectWS: () => void
  /** 获取未读数 */
  getUnreadCount: () => number
  /** 获取当前消息列表 */
  getMessages: () => NotificationMessage[]
  /** 手动标记已读 */
  markRead: (ids: string[]) => Promise<void>
  /** 手动标记全部已读 */
  markAllAsRead: (category?: NotificationCategory) => Promise<void>
  /** 由用户手势主动申请桌面通知权限 */
  requestDesktopPermission: () => Promise<
    NotificationPermission | 'unsupported'
  >
}
