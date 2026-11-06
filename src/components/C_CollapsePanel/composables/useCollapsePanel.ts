import { ref, computed, watch, type Ref } from 'vue'
import type { CollapsePanelItem } from '../types'

interface UseCollapsePanelOptions {
  /** 面板项配置 */
  items: Ref<CollapsePanelItem[]>
  /** 外部 v-model activeKeys */
  activeKeys: Ref<string[] | undefined>
  /** 非受控时的默认激活 key */
  defaultActiveKeys: string[]
  /** 是否手风琴模式 */
  accordion: Ref<boolean>
  /** localStorage 持久化 key */
  persistKey: Ref<string | undefined>
  /** 请求更新 activeKeys，受控模式由外部确认 */
  onUpdate?: (keys: string[]) => void
  /** 已生效的 activeKeys 变化回调 */
  onChange?: (keys: string[]) => void
  /** 单面板展开回调 */
  onExpand?: (key: string) => void
  /** 单面板折叠回调 */
  onCollapse?: (key: string) => void
}

/** Decode persisted keys without trusting localStorage JSON shape. */
export function parseStoredCollapseKeys(raw: string | null): string[] | null {
  if (!raw) return null
  try {
    const value: unknown = JSON.parse(raw)
    return Array.isArray(value)
      ? value.filter((key): key is string => typeof key === 'string')
      : null
  } catch {
    return null
  }
}

/**
 * 折叠面板展开/折叠核心逻辑
 */
export function useCollapsePanel(options: UseCollapsePanelOptions) {
  const {
    items,
    activeKeys: externalKeys,
    defaultActiveKeys,
    accordion,
    persistKey,
    onUpdate,
    onChange,
    onExpand,
    onCollapse,
  } = options

  /* ─── 持久化读取 ──────────────────────────────── */
  const loadPersistedKeys = (): string[] | null => {
    if (!persistKey.value) return null
    try {
      const raw = localStorage.getItem(`collapse-panel:${persistKey.value}`)
      return parseStoredCollapseKeys(raw)
    } catch {
      return null
    }
  }

  const savePersistedKeys = (keys: string[]) => {
    if (!persistKey.value) return
    try {
      localStorage.setItem(
        `collapse-panel:${persistKey.value}`,
        JSON.stringify(keys)
      )
    } catch {
      /* 静默失败 */
    }
  }

  /* ─── 内部状态 ────────────────────────────────── */
  const resolveInitialKeys = (): string[] => {
    /* 优先级：外部 v-model > 持久化 > 默认值 */
    if (externalKeys.value !== undefined) return [...externalKeys.value]
    const persisted = loadPersistedKeys()
    if (persisted) return persisted
    return [...defaultActiveKeys]
  }

  const internalKeys = ref<string[]>(resolveInitialKeys())

  /** 懒渲染追踪：记录哪些面板曾被展开过 */
  const renderedOnce = ref<Set<string>>(new Set(internalKeys.value))

  /* ─── 计算属性 ────────────────────────────────── */
  /** 当前激活的 key 数组（兼容受控 / 非受控） */
  const currentKeys = computed(() => externalKeys.value ?? internalKeys.value)

  /**
   * 判断面板是否展开
   */
  const isExpanded = (key: string): boolean => {
    return currentKeys.value.includes(key)
  }

  /**
   * 判断面板是否应该渲染内容
   * - lazy 面板只有被展开过至少一次后才渲染
   * - destroyOnCollapse 面板在折叠后销毁 DOM
   */
  const shouldRender = (item: CollapsePanelItem): boolean => {
    const expanded = isExpanded(item.key)

    if (item.destroyOnCollapse) return expanded
    if (item.lazy) return renderedOnce.value.has(item.key)
    return true
  }

  /* ─── 操作方法 ────────────────────────────────── */
  const commitKeys = (newKeys: string[], local = false) => {
    const previous = internalKeys.value
    if (
      previous.length === newKeys.length &&
      previous.every((key, index) => key === newKeys[index])
    )
      return

    internalKeys.value = [...newKeys]
    const next = new Set(newKeys)
    const before = new Set(previous)
    next.forEach(key => renderedOnce.value.add(key))
    savePersistedKeys(newKeys)
    if (local) onUpdate?.([...newKeys])
    onChange?.([...newKeys])
    before.forEach(key => {
      if (!next.has(key)) onCollapse?.(key)
    })
    next.forEach(key => {
      if (!before.has(key)) onExpand?.(key)
    })
  }

  const updateKeys = (newKeys: string[]) => {
    if (externalKeys.value === undefined) commitKeys(newKeys, true)
    else onUpdate?.(newKeys)
  }

  const toggle = (key: string) => {
    const item = items.value.find(i => i.key === key)
    if (!item || item.disabled) return

    if (isExpanded(key)) {
      updateKeys(currentKeys.value.filter(k => k !== key))
    } else {
      updateKeys(accordion.value ? [key] : [...currentKeys.value, key])
    }
  }

  const expandAll = () => {
    if (accordion.value) return /* 手风琴模式不支持全展开 */

    updateKeys(items.value.filter(i => !i.disabled).map(i => i.key))
  }

  const collapseAll = () => {
    updateKeys([])
  }

  const getActiveKeys = (): string[] => {
    return [...currentKeys.value]
  }

  /* ─── 键盘导航 ────────────────────────────────── */
  const handleKeyDown = (e: KeyboardEvent, key: string) => {
    if (['Enter', ' '].includes(e.key)) {
      e.preventDefault()
      toggle(key)
    }
  }

  /* ─── 同步外部 v-model 变化 ───────────────────── */
  watch(
    () => externalKeys.value?.slice(),
    newVal => {
      // 仅确认后的键会触发懒挂载、变更事件和持久化。
      if (newVal !== undefined) commitKeys(newVal)
    }
  )

  return {
    currentKeys,
    renderedOnce,
    isExpanded,
    shouldRender,
    toggle,
    expandAll,
    collapseAll,
    getActiveKeys,
    handleKeyDown,
  }
}
