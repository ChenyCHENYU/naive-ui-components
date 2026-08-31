/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-27
 * @Description: WebSocket 连接管理
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */

import { ref, readonly, onBeforeUnmount } from 'vue'
import type {
  NotificationWSConfig,
  WSConnectionStatus,
  WSNotificationPayload,
} from '../types'
import {
  DEFAULT_WS_RECONNECT_INTERVAL,
  DEFAULT_WS_MAX_RECONNECT,
  DEFAULT_WS_HEARTBEAT_INTERVAL,
  DEFAULT_WS_HEARTBEAT_MESSAGE,
} from '../constants'

/**
 * WebSocket 连接管理
 *
 * 管理 WebSocket 的建连、重连、心跳保活、消息解析。
 * 支持自动重连、鉴权 token、心跳检测。
 */
export function useNotificationWS(
  onMessage: (payload: WSNotificationPayload) => void,
  onStatusChange?: (status: WSConnectionStatus) => void
) {
  /** 连接状态 */
  const status = ref<WSConnectionStatus>('disconnected')

  /** WebSocket 实例 */
  let ws: WebSocket | null = null
  /** 重连计数器 */
  let reconnectCount = 0
  /** 重连定时器 */
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  /** 心跳定时器 */
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null
  /** 当前配置 */
  let currentConfig: NotificationWSConfig | null = null
  /** 连接代次，用于忽略旧 socket 的延迟事件 */
  let connectionVersion = 0

  /**
   * 更新连接状态
   */
  function setStatus(s: WSConnectionStatus) {
    status.value = s
    onStatusChange?.(s)
  }

  /**
   * 建立连接
   */
  function connect(config: NotificationWSConfig) {
    currentConfig = config
    reconnectCount = 0
    createConnection(config)
  }

  /**
   * 创建 WebSocket 连接
   */
  function createConnection(config: NotificationWSConfig) {
    const version = ++connectionVersion
    cleanup()

    const url = buildUrl(config)
    setStatus('connecting')

    try {
      ws = new WebSocket(url)
    } catch {
      setStatus('disconnected')
      scheduleReconnect(config)
      return
    }

    const socket = ws
    socket.addEventListener('open', () => {
      if (version !== connectionVersion || socket !== ws) return
      setStatus('connected')
      reconnectCount = 0
      startHeartbeat(config)
    })

    socket.addEventListener('message', event => {
      if (version !== connectionVersion || socket !== ws) return
      handleMessage(event.data)
    })

    socket.addEventListener('close', () => {
      if (version !== connectionVersion || socket !== ws) return
      ws = null
      stopHeartbeat()
      setStatus('disconnected')

      if (config.autoReconnect !== false) {
        scheduleReconnect(config)
      }
    })

    socket.addEventListener('error', () => {
      /* error 事件后通常紧接 close 事件，交由 close 处理重连 */
    })
  }

  /**
   * 构建带 token 的 WebSocket URL
   */
  function buildUrl(config: NotificationWSConfig): string {
    const token = config.getToken?.()
    if (token) {
      const separator = config.url.includes('?') ? '&' : '?'
      return `${config.url}${separator}token=${encodeURIComponent(token)}`
    }
    return config.url
  }

  /**
   * 处理接收到的消息
   */
  function handleMessage(raw: string | ArrayBuffer | Blob) {
    if (typeof raw !== 'string') return

    /* 过滤心跳响应 */
    if (raw === 'pong') return

    try {
      const payload: unknown = JSON.parse(raw)
      if (
        payload &&
        typeof payload === 'object' &&
        ['new_message', 'read_sync', 'count_update'].includes(
          String((payload as Record<string, unknown>).type)
        ) &&
        'data' in payload
      ) {
        onMessage(payload as WSNotificationPayload)
      }
    } catch {
      /* 非标准 JSON 消息，忽略 */
    }
  }

  /**
   * 调度重连
   */
  function scheduleReconnect(config: NotificationWSConfig) {
    if (currentConfig !== config || reconnectTimer) return
    const maxAttempts = Math.max(
      0,
      Math.trunc(config.maxReconnectAttempts ?? DEFAULT_WS_MAX_RECONNECT)
    )
    if (reconnectCount >= maxAttempts) return

    reconnectCount++
    setStatus('reconnecting')

    const baseInterval = Math.max(
      0,
      config.reconnectInterval ?? DEFAULT_WS_RECONNECT_INTERVAL
    )
    const interval = Math.min(60_000, baseInterval * 2 ** (reconnectCount - 1))
    const version = connectionVersion
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      if (version !== connectionVersion || currentConfig !== config) return
      createConnection(config)
    }, interval)
  }

  /**
   * 启动心跳
   */
  function startHeartbeat(config: NotificationWSConfig) {
    stopHeartbeat()
    const interval = config.heartbeatInterval ?? DEFAULT_WS_HEARTBEAT_INTERVAL
    if (interval <= 0) return

    const message = config.heartbeatMessage ?? DEFAULT_WS_HEARTBEAT_MESSAGE
    heartbeatTimer = setInterval(() => {
      if (ws?.readyState === WebSocket.OPEN) {
        try {
          ws.send(message)
        } catch {
          ws.close()
        }
      }
    }, interval)
  }

  /**
   * 停止心跳
   */
  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
  }

  /**
   * 清理资源
   */
  function cleanup() {
    stopHeartbeat()
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    if (ws) {
      ws.close()
      ws = null
    }
  }

  /**
   * 断开连接
   */
  function disconnect() {
    currentConfig = null
    connectionVersion++
    reconnectCount = 0
    cleanup()
    setStatus('disconnected')
  }

  /**
   * 手动重新连接
   */
  function reconnect() {
    if (currentConfig) {
      reconnectCount = 0
      createConnection(currentConfig)
    }
  }

  /* 组件卸载时自动清理 */
  onBeforeUnmount(() => {
    currentConfig = null
    connectionVersion++
    cleanup()
  })

  return {
    /** WebSocket 连接状态 */
    status: readonly(status),
    connect,
    disconnect,
    reconnect,
  }
}
