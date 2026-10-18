/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-27
 * @Description: 通知数据、操作日志与连接生命周期；不依赖具体业务后端
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */
import {
  ref,
  shallowRef,
  computed,
  watch,
  getCurrentInstance,
  getCurrentScope,
  onMounted,
  onScopeDispose,
} from 'vue'
import type {
  NotificationMessage,
  NotificationCategory,
  NotificationCenterProps,
  NotificationCenterController,
  NotificationUnreadByCategory,
  WSNotificationPayload,
  WSConnectionStatus,
  FetchNotificationsResult,
} from '../types'
import {
  DEFAULT_PAGE_SIZE,
  DEFAULT_POLLING_INTERVAL,
  DEFAULT_STORAGE_KEY,
  MOCK_MESSAGES,
} from '../constants'
import { useNotificationWS } from './useNotificationWS'
import { setItem, getItem } from '../../../utils/storage'

interface NotificationCoreEvents {
  onNewMessage?: (message: NotificationMessage) => void
  onWSStatusChange?: (status: WSConnectionStatus) => void
}
interface Snapshot {
  list: NotificationMessage[]
  /** 跨查询页的已知状态，避免切分类丢失进行中的操作对象。 */
  known: Map<string, NotificationMessage>
  total: number
  unread: number
  categories: NotificationUnreadByCategory
  statisticsVersion: number
  queryCategory: NotificationCategory | 'all'
}
interface Operation {
  id: number
  kind: 'read' | 'delete' | 'read-all' | 'clear'
  ids: string[]
  category?: NotificationCategory
  unknownUnread: number
  unknownCategories: NotificationUnreadByCategory
  unknownTotal: number
  statisticsVersion: number
  queryCategory: NotificationCategory | 'all'
}
type Change =
  | { version: number; operation: Operation }
  | { version: number; message: NotificationMessage }
  | {
      version: number
      counts: {
        unreadCount: number
        unreadByCategory?: NotificationUnreadByCategory
      }
    }
const categories: NotificationCategory[] = ['system', 'business', 'alarm']
const emptySnapshot = (): Snapshot => ({
  list: [],
  known: new Map(),
  total: 0,
  unread: 0,
  categories: {},
  statisticsVersion: 0,
  queryCategory: 'all',
})

/** 验证查询与推送中的消息边界，拒绝畸形事件。 */
// eslint-disable-next-line complexity -- 单一消息协议的字段与枚举校验。
export function isNotificationMessage(
  value: unknown
): value is NotificationMessage {
  if (!value || typeof value !== 'object') return false
  const message = value as Partial<NotificationMessage>
  return (
    typeof message.id === 'string' &&
    message.id.length > 0 &&
    typeof message.title === 'string' &&
    typeof message.summary === 'string' &&
    typeof message.timestamp === 'string' &&
    Number.isFinite(Date.parse(message.timestamp)) &&
    categories.includes(message.category as NotificationCategory) &&
    ['low', 'normal', 'high', 'urgent'].includes(String(message.priority)) &&
    ['read', 'unread', 'archived'].includes(String(message.status))
  )
}
function cloneMessage(message: NotificationMessage): NotificationMessage {
  return {
    ...message,
    ...(message.sender ? { sender: { ...message.sender } } : {}),
    ...(message.extra ? { extra: { ...message.extra } } : {}),
  }
}
function countRows(list: NotificationMessage[]) {
  const result = { system: 0, business: 0, alarm: 0 }
  for (const message of list)
    if (message.status === 'unread') result[message.category]++
  return result
}
function validCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}
function normalizeCategories(value: unknown): NotificationUnreadByCategory {
  const result: NotificationUnreadByCategory = {}
  if (value && typeof value === 'object') {
    for (const key of categories) {
      const count = (value as NotificationUnreadByCategory)[key]
      if (validCount(count)) result[key] = count
    }
  }
  return result
}

function updateKnownRecords(
  previous: Map<string, NotificationMessage>,
  targets: NotificationMessage[],
  removed: boolean
) {
  const known = new Map(previous)
  for (const message of targets) {
    if (removed) known.delete(message.id)
    else if (message.status === 'unread')
      known.set(message.id, { ...message, status: 'read' })
  }
  return known
}

function operationTotal(
  state: Snapshot,
  operation: Operation,
  visibleTargets: number
) {
  if (operation.kind !== 'delete' && operation.kind !== 'clear')
    return state.total
  const unknown =
    state.queryCategory === operation.queryCategory ? operation.unknownTotal : 0
  return Math.max(0, state.total - visibleTargets - unknown)
}

/** 乐观操作只叠加自己的变更，失败时移除该操作；不恢复整表快照。 */
function applyOperation(state: Snapshot, operation: Operation): Snapshot {
  const ids = new Set(operation.ids)
  const targets = [...state.known.values()].filter(message =>
    ids.has(message.id)
  )
  const visibleTargets = state.list.filter(message => ids.has(message.id))
  const unreadTargets = targets.filter(message => message.status === 'unread')
  const removed = operation.kind === 'delete' || operation.kind === 'clear'
  const list = removed
    ? state.list.filter(message => !ids.has(message.id))
    : state.list.map(message =>
        ids.has(message.id) && message.status === 'unread'
          ? { ...message, status: 'read' as const }
          : message
      )
  const nextCategories = { ...state.categories }
  const known = updateKnownRecords(state.known, targets, removed)
  const adjustStatistics =
    state.statisticsVersion === operation.statisticsVersion
  for (const category of categories) {
    const previous = nextCategories[category]
    if (previous === undefined || !adjustStatistics) continue
    const known = unreadTargets.filter(
      message => message.category === category
    ).length
    nextCategories[category] = Math.max(
      0,
      previous - known - (operation.unknownCategories[category] ?? 0)
    )
  }
  return {
    list,
    known,
    total: operationTotal(state, operation, visibleTargets.length),
    unread: adjustStatistics
      ? Math.max(
          0,
          state.unread - unreadTargets.length - operation.unknownUnread
        )
      : state.unread,
    categories: nextCategories,
    statisticsVersion: state.statisticsVersion,
    queryCategory: state.queryCategory,
  }
}

function snapshotFromResult(
  result: FetchNotificationsResult,
  previous: Snapshot,
  reset: boolean,
  queryCategory: NotificationCategory | 'all'
): Snapshot {
  if (
    !Array.isArray(result?.list) ||
    !result.list.every(isNotificationMessage) ||
    !validCount(result.total) ||
    !validCount(result.unreadCount)
  ) {
    throw new Error('消息接口返回的数据或统计无效')
  }
  const unique = new Map<string, NotificationMessage>()
  const known = new Map(previous.known)
  if (!reset)
    for (const message of previous.list) unique.set(message.id, message)
  for (const message of result.list) {
    const record = cloneMessage(message)
    unique.set(message.id, record)
    known.set(message.id, record)
  }
  return {
    list: [...unique.values()],
    known,
    total: result.total,
    unread: result.unreadCount,
    categories: normalizeCategories(result.unreadByCategory),
    statisticsVersion: previous.statisticsVersion,
    queryCategory,
  }
}

function unknownCounts(
  state: Snapshot,
  known: NotificationMessage[],
  category?: NotificationCategory
) {
  const knownCounts = countRows(known)
  const unknownCategories: NotificationUnreadByCategory = {}
  const keys = category ? [category] : categories
  for (const key of keys) {
    const count = state.categories[key]
    if (count !== undefined)
      unknownCategories[key] = Math.max(0, count - knownCounts[key])
  }
  const scopeUnread = category ? state.categories[category] : state.unread
  return {
    unknownCategories,
    unknownUnread:
      scopeUnread === undefined
        ? 0
        : Math.max(
            0,
            scopeUnread -
              known.filter(message => message.status === 'unread').length
          ),
  }
}

/**
 * 独立组件与应用 Store 共用的无后端依赖控制器。
 * 未指定模式时兼容旧接入：有查询接口为 remote，否则为 demo。
 */
export function useNotificationCore(
  props: NotificationCenterProps,
  events: NotificationCoreEvents = {}
): NotificationCenterController & {
  initialize: () => void
  dispose: () => void
} {
  const mode = computed(
    () => props.dataMode ?? (props.fetchNotifications ? 'remote' : 'demo')
  )
  const base = shallowRef<Snapshot>(emptySnapshot())
  const operations = shallowRef<Operation[]>([])
  const view = computed(() =>
    operations.value.reduce(applyOperation, base.value)
  )
  const messages = computed(() => view.value.list)
  const activeCategory = ref<NotificationCategory | 'all'>('all')
  const loading = ref(false)
  const page = ref(1)
  const selectedMessage = ref<NotificationMessage | null>(null)
  const popoverVisible = ref(false)
  const wsStatus = ref<WSConnectionStatus>('disconnected')
  const error = ref<string | null>(null)
  const unreadCount = computed(() => view.value.unread)
  const unreadByCategory = computed(() => view.value.categories)
  const filteredMessages = computed(() =>
    activeCategory.value === 'all'
      ? messages.value
      : messages.value.filter(
          message => message.category === activeCategory.value
        )
  )
  const total = computed(() =>
    mode.value === 'demo' ? filteredMessages.value.length : view.value.total
  )
  const hasMore = computed(
    () => mode.value === 'remote' && filteredMessages.value.length < total.value
  )
  const busy = computed(() => operations.value.length > 0)
  const pendingIds = computed(() => [
    ...new Set(operations.value.flatMap(operation => operation.ids)),
  ])
  let fetchVersion = 0
  let changeVersion = 0
  let operationId = 0
  let scopeVersion = 0
  let initialized = false
  let disposed = false
  let changes: Change[] = []
  let pollingTimer: ReturnType<typeof setInterval> | null = null
  let hadConnection = false
  let retryAction: (() => Promise<void>) | undefined
  const desktopTimers = new Set<ReturnType<typeof setTimeout>>()

  function report(cause: unknown, operation: string) {
    error.value =
      cause instanceof Error ? cause.message : '消息操作失败，请重试'
    props.onError?.(cause, operation)
  }
  function clearError() {
    error.value = null
  }
  function pruneKnownRecords(state: Snapshot): Snapshot {
    // 可见数据和进行中命令始终保留；额外跨页索引只保留最近 256 条。
    const protectedIds = new Set([
      ...state.list.map(message => message.id),
      ...operations.value.flatMap(operation => operation.ids),
    ])
    const retained = new Map<string, NotificationMessage>()
    let extra = 0
    for (const [id, message] of [...state.known].reverse()) {
      const protectedRecord = protectedIds.has(id)
      if (protectedRecord || extra < 256) {
        retained.set(id, message)
        if (!protectedRecord) extra++
      }
    }
    return { ...state, known: new Map([...retained].reverse()) }
  }
  function demoSnapshot(list: NotificationMessage[]): Snapshot {
    const counts = countRows(list)
    return {
      list,
      known: new Map(list.map(message => [message.id, message])),
      total: list.length,
      unread: Object.values(counts).reduce((a, b) => a + b, 0),
      categories: counts,
      statisticsVersion: 0,
      queryCategory: 'all',
    }
  }
  function loadDemo() {
    const cached = getItem<{
      version?: number
      messages?: unknown
      readIds?: string[]
    }>(props.storageKey ?? DEFAULT_STORAGE_KEY)
    if (cached?.version === 2 && Array.isArray(cached.messages)) {
      base.value = demoSnapshot(
        cached.messages.filter(isNotificationMessage).map(cloneMessage)
      )
      return
    }
    const readIds = new Set(
      Array.isArray(cached?.readIds) ? cached.readIds : []
    )
    base.value = demoSnapshot(
      MOCK_MESSAGES.map(message => ({
        ...cloneMessage(message),
        status: readIds.has(message.id) ? 'read' : message.status,
      }))
    )
  }
  function persist() {
    if (mode.value !== 'demo') return
    // 即时持久化提交后的状态；清空 [] 与无缓存严格区分，卸载不会丢最后一次操作。
    setItem(props.storageKey ?? DEFAULT_STORAGE_KEY, {
      version: 2,
      messages: base.value.list.map(cloneMessage),
    })
  }
  function appendChange(
    change:
      | Omit<Extract<Change, { operation: Operation }>, 'version'>
      | Omit<Extract<Change, { message: NotificationMessage }>, 'version'>
      | Omit<Extract<Change, { counts: unknown }>, 'version'>
  ) {
    const version = ++changeVersion
    if (loading.value) changes.push({ ...change, version } as Change)
  }
  function matchesActiveCategory(message: NotificationMessage) {
    return (
      mode.value === 'demo' ||
      activeCategory.value === 'all' ||
      activeCategory.value === message.category
    )
  }
  function addMessage(
    state: Snapshot,
    message: NotificationMessage,
    replay = false
  ): Snapshot {
    if (state.list.some(item => item.id === message.id)) return state
    if (!replay && state.known.has(message.id)) return state
    const matches = matchesActiveCategory(message)
    const counts = { ...state.categories }
    if (message.status === 'unread' && counts[message.category] !== undefined)
      counts[message.category]!++
    return {
      list: matches ? [cloneMessage(message), ...state.list] : state.list,
      known: new Map([...state.known, [message.id, cloneMessage(message)]]),
      total: state.total + (matches ? 1 : 0),
      unread: state.unread + (message.status === 'unread' ? 1 : 0),
      categories: counts,
      statisticsVersion: state.statisticsVersion,
      queryCategory: state.queryCategory,
    }
  }
  function applyChange(state: Snapshot, change: Change): Snapshot {
    if ('operation' in change)
      return applyOperation(state, {
        ...change.operation,
        statisticsVersion: state.statisticsVersion,
      })
    if ('message' in change) return addMessage(state, change.message, true)
    return {
      ...state,
      unread: change.counts.unreadCount,
      categories: {
        ...state.categories,
        ...normalizeCategories(change.counts.unreadByCategory),
      },
      statisticsVersion: state.statisticsVersion + 1,
    }
  }
  function currentRequest(version: number, scope: number) {
    return !disposed && scope === scopeVersion && version === fetchVersion
  }
  async function requestPage(
    targetPage: number,
    category: NotificationCategory | 'all'
  ) {
    if (!props.fetchNotifications)
      throw new Error('远程消息模式未配置 fetchNotifications')
    return props.fetchNotifications({
      category: category === 'all' ? undefined : category,
      page: targetPage,
      pageSize: props.pageSize ?? DEFAULT_PAGE_SIZE,
    })
  }
  function changesSince(state: Snapshot, started: number) {
    let next = state
    for (const change of changes)
      if (change.version > started) next = applyChange(next, change)
    return next
  }
  async function fetchPage(targetPage: number, reset: boolean) {
    const version = ++fetchVersion
    const started = changeVersion
    const category = activeCategory.value
    const scope = scopeVersion
    loading.value = true
    clearError()
    try {
      if (mode.value === 'demo') {
        loadDemo()
        page.value = 1
        return
      }
      const result = await requestPage(targetPage, category)
      if (!currentRequest(version, scope)) return
      const next = snapshotFromResult(result, base.value, reset, category)
      // 请求开始后的成功操作与推送不能被较旧的查询结果覆盖。
      base.value = pruneKnownRecords(changesSince(next, started))
      page.value = targetPage
    } catch (cause) {
      if (currentRequest(version, scope)) {
        retryAction = () => fetchPage(targetPage, reset)
        report(cause, 'fetch')
      }
      throw cause
    } finally {
      if (currentRequest(version, scope)) {
        loading.value = false
        changes = []
      }
    }
  }
  async function fetchMessages(reset = false) {
    await fetchPage(reset ? 1 : page.value, reset)
  }
  async function loadMore() {
    if (loading.value || !hasMore.value) return
    await fetchPage(page.value + 1, false)
  }
  function createOperation(
    kind: Operation['kind'],
    ids: string[],
    category?: NotificationCategory
  ): Operation {
    const operation: Operation = {
      id: ++operationId,
      kind,
      ids: [...new Set(ids)],
      category,
      unknownUnread: 0,
      unknownCategories: {},
      unknownTotal: 0,
      statisticsVersion: base.value.statisticsVersion,
      queryCategory: activeCategory.value,
    }
    if (kind !== 'read-all' && kind !== 'clear') return operation
    const known = [...base.value.known.values()].filter(
      message => !category || message.category === category
    )
    Object.assign(operation, unknownCounts(base.value, known, category))
    const queryMatches = !category || activeCategory.value === category
    if (kind === 'clear' && queryMatches)
      operation.unknownTotal = Math.max(
        0,
        base.value.total -
          base.value.list.filter(
            message => !category || message.category === category
          ).length
      )
    return operation
  }
  async function execute(
    operation: Operation,
    adapter: (() => Promise<void>) | undefined,
    name: string
  ) {
    clearError()
    if (mode.value === 'remote' && !adapter) {
      const cause = new Error('远程消息模式未配置 ' + name + ' 接口')
      retryAction = () => execute(operation, adapter, name)
      report(cause, name)
      throw cause
    }
    const scope = scopeVersion
    operations.value = [...operations.value, operation]
    try {
      if (mode.value === 'remote') await adapter!()
      if (disposed || scope !== scopeVersion) {
        const cancelled = new Error('消息作用域已失效')
        cancelled.name = 'AbortError'
        throw cancelled
      }
      base.value = applyOperation(base.value, operation)
      appendChange({ operation })
      persist()
    } catch (cause) {
      if (!disposed && scope === scopeVersion) {
        retryAction = () => execute(operation, adapter, name)
        report(cause, name)
      }
      throw cause
    } finally {
      if (scope === scopeVersion) {
        operations.value = operations.value.filter(
          item => item.id !== operation.id
        )
        base.value = pruneKnownRecords(base.value)
      }
    }
  }
  async function markAsRead(ids: string[]) {
    await execute(
      createOperation('read', ids),
      props.markAsRead ? () => props.markAsRead!(ids) : undefined,
      'mark-as-read'
    )
  }
  async function markAllAsRead(category?: NotificationCategory) {
    const ids = [...base.value.known.values()]
      .filter(message => !category || message.category === category)
      .map(message => message.id)
    await execute(
      createOperation('read-all', ids, category),
      props.markAllRead ? () => props.markAllRead!(category) : undefined,
      'mark-all-as-read'
    )
  }
  async function deleteMessages(ids: string[]) {
    await execute(
      createOperation('delete', ids),
      props.deleteNotification
        ? () => props.deleteNotification!(ids)
        : undefined,
      'delete'
    )
    if (selectedMessage.value && ids.includes(selectedMessage.value.id))
      clearSelection()
  }
  async function clearMessages(category?: NotificationCategory) {
    const ids = [...base.value.known.values()]
      .filter(message => !category || message.category === category)
      .map(message => message.id)
    await execute(
      createOperation('clear', ids, category),
      props.clearNotifications
        ? () => props.clearNotifications!(category)
        : undefined,
      'clear'
    )
    if (
      selectedMessage.value &&
      (!category || selectedMessage.value.category === category)
    )
      clearSelection()
  }
  const seenPushes = new Set<string>()
  function handleNewMessage(data: WSNotificationPayload['data']) {
    if (!isNotificationMessage(data)) return
    const message = data
    if (seenPushes.has(message.id) || base.value.known.has(message.id)) return
    seenPushes.add(message.id)
    if (seenPushes.size > 2_000)
      seenPushes.delete(seenPushes.values().next().value!)
    base.value = addMessage(base.value, message)
    appendChange({ message: cloneMessage(message) })
    persist()
    events.onNewMessage?.(message)
    showDesktopNotification(message)
  }
  function handleReadSync(data: WSNotificationPayload['data']) {
    if (!Array.isArray(data)) return
    const ids = data.filter(isNotificationMessage).map(message => message.id)
    const operation = createOperation('read', ids)
    base.value = applyOperation(base.value, operation)
    appendChange({ operation })
    persist()
  }
  function handleCountUpdate(data: WSNotificationPayload['data']) {
    if (
      data &&
      typeof data === 'object' &&
      'unreadCount' in data &&
      validCount(data.unreadCount)
    ) {
      const counts = data as {
        unreadCount: number
        unreadByCategory?: NotificationUnreadByCategory
      }
      base.value = applyChange(base.value, { version: 0, counts })
      appendChange({ counts })
    }
  }
  function handleWSMessage(payload: WSNotificationPayload) {
    if (disposed) return
    switch (payload.type) {
      case 'new_message':
        handleNewMessage(payload.data)
        break
      case 'read_sync':
        handleReadSync(payload.data)
        break
      case 'count_update':
        handleCountUpdate(payload.data)
        break
    }
  }
  function handleWSStatusChange(status: WSConnectionStatus) {
    wsStatus.value = status
    events.onWSStatusChange?.(status)
    if (status === 'connected') {
      if (hadConnection && mode.value === 'remote')
        void fetchMessages(true).catch(() => undefined)
      hadConnection = true
    }
  }
  const ws = useNotificationWS(handleWSMessage, handleWSStatusChange)
  function connectWS(config = props.wsConfig) {
    if (config) ws.connect(config)
  }
  function disconnectWS() {
    ws.disconnect()
  }
  function showDesktopNotification(message: NotificationMessage) {
    if (
      !props.desktopNotification ||
      typeof window === 'undefined' ||
      !('Notification' in window) ||
      Notification.permission !== 'granted'
    )
      return
    const notification = new Notification(message.title, {
      body: message.summary,
      icon: message.sender?.avatar,
      tag: message.id,
    })
    notification.addEventListener('click', () => {
      window.focus()
      selectMessage(message)
      notification.close()
    })
    const timer = setTimeout(() => {
      notification.close()
      desktopTimers.delete(timer)
    }, 5_000)
    desktopTimers.add(timer)
  }
  async function requestDesktopPermission(): Promise<
    NotificationPermission | 'unsupported'
  > {
    if (typeof window === 'undefined' || !('Notification' in window))
      return 'unsupported'
    return Notification.requestPermission()
  }
  function selectMessage(message: NotificationMessage) {
    selectedMessage.value = message
    if (message.status === 'unread')
      void markAsRead([message.id]).catch(() => undefined)
  }
  function clearSelection() {
    selectedMessage.value = null
  }
  function switchCategory(category: NotificationCategory | 'all') {
    if (activeCategory.value === category) return
    activeCategory.value = category
    clearSelection()
    if (mode.value === 'remote') {
      base.value = {
        ...base.value,
        list: [],
        total: 0,
        queryCategory: category,
      }
      page.value = 1
      void fetchMessages(true).catch(() => undefined)
    }
  }
  function initialize() {
    if (initialized) return
    initialized = true
    disposed = false
    void fetchMessages(true).catch(() => undefined)
    const interval = props.pollingInterval ?? DEFAULT_POLLING_INTERVAL
    if (mode.value === 'remote' && interval > 0) {
      pollingTimer = setInterval(() => {
        if (!loading.value) void fetchMessages(true).catch(() => undefined)
      }, interval)
    }
    connectWS()
  }
  function dispose() {
    initialized = false
    disposed = true
    scopeVersion++
    fetchVersion++
    loading.value = false
    operations.value = []
    changes = []
    retryAction = undefined
    seenPushes.clear()
    hadConnection = false
    if (pollingTimer) clearInterval(pollingTimer)
    pollingTimer = null
    for (const timer of desktopTimers) clearTimeout(timer)
    desktopTimers.clear()
    disconnectWS()
  }
  async function retry() {
    if (retryAction) await retryAction()
    else await fetchMessages(true)
  }
  if (getCurrentScope()) onScopeDispose(dispose)
  if (props.autoStart !== false) {
    if (getCurrentInstance()) onMounted(initialize)
    else initialize()
  }
  watch(messages, list => {
    const id = selectedMessage.value?.id
    if (id)
      selectedMessage.value = list.find(message => message.id === id) ?? null
  })
  watch(
    () => [mode.value, props.storageKey],
    () => {
      const shouldStart = initialized
      dispose()
      base.value = emptySnapshot()
      activeCategory.value = 'all'
      selectedMessage.value = null
      popoverVisible.value = false
      error.value = null
      if (shouldStart) initialize()
    }
  )
  return {
    messages,
    activeCategory,
    loading,
    total,
    page,
    selectedMessage,
    popoverVisible,
    wsStatus,
    unreadCount,
    unreadByCategory,
    filteredMessages,
    hasMore,
    error,
    busy,
    pendingIds,
    fetchMessages,
    loadMore,
    markAsRead,
    markAllAsRead,
    deleteMessages,
    clearMessages,
    selectMessage,
    clearSelection,
    switchCategory,
    clearError,
    retry,
    requestDesktopPermission,
    connectWS,
    disconnectWS,
    initialize,
    dispose,
  }
}
