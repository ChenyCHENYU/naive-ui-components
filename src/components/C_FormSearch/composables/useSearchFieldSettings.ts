import { computed, onMounted, ref, watch } from 'vue'
import type {
  FormSearchRuntimeProps,
  SearchFieldSettings,
  SearchFormItem,
} from '../types'

/** 偏好仅接受带版本的字符串键列表，旧字段由调用方白名单过滤。 */
function readSavedKeys(
  key: string,
  version: string | number
): readonly string[] | undefined {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(key) ?? 'null')
    if (!saved || typeof saved !== 'object') return
    const record = saved as Record<string, unknown>
    if (record.version !== version || !Array.isArray(record.keys)) return
    return record.keys.every(key => typeof key === 'string')
      ? record.keys
      : undefined
  } catch {
    // 损坏或不可用的存储不阻断当前查询。
    return undefined
  }
}

/** 用户偏好只控制原本可见的字段；业务隐藏、固定条件和模型值仍由调用方管理。 */
export function useSearchFieldSettings<T extends object>(
  props: FormSearchRuntimeProps<T>,
  publish: (keys: Extract<keyof T, string>[]) => void
) {
  type Key = Extract<keyof T, string>
  const settings = computed<SearchFieldSettings<Key> | undefined>(() => {
    const config = props.config?.fieldSettings
    return config ? (config === true ? {} : config) : undefined
  })
  const choices = computed(() =>
    props.formItemList
      .filter(field => field.show !== false && field.type !== 'spacer')
      .map(field => ({
        key: field.prop,
        label: field.label || field.prop,
        locked:
          field.fixed === true ||
          settings.value?.lockedKeys?.includes(field.prop) === true,
      }))
  )
  const normalize = (keys: readonly string[]): Key[] => {
    const chosen = new Set(keys)
    return choices.value
      .filter(field => field.locked || chosen.has(field.key))
      .map(field => field.key)
  }
  const defaults = computed(() =>
    normalize(
      settings.value?.defaultVisibleKeys ??
        choices.value.map(field => field.key)
    )
  )
  const localKeys = ref<readonly string[]>()
  const keys = computed(() =>
    settings.value
      ? normalize(props.visibleFields ?? localKeys.value ?? defaults.value)
      : choices.value.map(field => field.key)
  )
  const fields = computed<SearchFormItem<T>[]>(() => {
    if (!settings.value) return props.formItemList
    const selected = new Set<string>(keys.value)
    return props.formItemList.map(field =>
      field.type === 'spacer' || field.show === false
        ? field
        : { ...field, show: selected.has(field.prop) }
    )
  })
  const storageKey = computed(() =>
    settings.value?.persistKey
      ? `c-search-fields:${JSON.stringify([settings.value.persistKey, settings.value.scope ?? null])}`
      : undefined
  )
  let mounted = false
  function restore() {
    localKeys.value = undefined
    if (
      props.visibleFields !== undefined ||
      !storageKey.value ||
      typeof localStorage === 'undefined'
    )
      return
    localKeys.value = readSavedKeys(
      storageKey.value,
      settings.value?.version ?? 1
    )
  }

  function update(next: readonly string[]) {
    const normalized = normalize(next)
    if (props.visibleFields === undefined) localKeys.value = normalized
    publish(normalized)
    if (!storageKey.value || typeof localStorage === 'undefined') return
    try {
      localStorage.setItem(
        storageKey.value,
        JSON.stringify({
          version: settings.value?.version ?? 1,
          keys: normalized,
        })
      )
    } catch {
      /* 隐私模式/存储已满仍保留本次可用的内存状态。 */
    }
  }
  watch(
    () => [storageKey.value, settings.value?.version],
    () => {
      if (mounted) restore()
    }
  )
  onMounted(() => {
    mounted = true
    restore()
  })
  return {
    enabled: computed(() => settings.value !== undefined),
    choices,
    keys,
    fields,
    update,
    reset: () => update(defaults.value),
  }
}
