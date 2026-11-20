import { computed, shallowRef, watch } from 'vue'
import { useDataResource } from '../../composables/useDataResource'
import type { ApprovalViewerProps, ApprovalViewerSource } from './types'

interface ListScope {
  businessKey: string
  source: ApprovalViewerSource
}

interface Session {
  scope: ListScope
  requestedId?: string
}

/** 将实例列表和所选详情绑定到当前弹窗会话，共用请求取消和结果归属机制。 */
export function useApprovalViewer(props: ApprovalViewerProps) {
  const session = shallowRef<Session>()
  const choice = shallowRef<{ session: Session; id: string }>()

  // 同批更新的单据、数据源和直达 ID 一起生效，避免请求新单据的旧实例。
  watch(
    () =>
      [props.show, props.businessKey, props.source, props.instanceId] as const,
    ([show, businessKey, source, requestedId]) => {
      const previous = session.value?.scope
      const scope =
        previous?.businessKey === businessKey && previous.source === source
          ? previous
          : { businessKey, source }
      session.value =
        show && businessKey.trim() ? { scope, requestedId } : undefined
      choice.value = undefined
    },
    { immediate: true }
  )

  const listScope = computed(() => session.value?.scope)
  const list = useDataResource({
    key: listScope,
    async load({ key, signal }) {
      const instances = await key.source.listInstances(key.businessKey, signal)
      if (!Array.isArray(instances))
        throw new TypeError('Invalid approval list')
      return {
        scope: key,
        instances: [...instances].sort((a, b) => b.startedAt - a.startedAt),
      }
    },
    isEmpty: result => result.instances.length === 0,
  })
  const instances = computed(() => {
    const result = list.data.value
    return result && result.scope === listScope.value ? result.instances : []
  })
  const directOption = computed(() => {
    const id = session.value?.requestedId
    return id && !instances.value.some(instance => instance.id === id)
      ? id
      : undefined
  })
  const activeId = computed(() => {
    const current = session.value
    if (!current) return undefined
    if (choice.value?.session === current) return choice.value.id
    return current.requestedId || instances.value[0]?.id
  })
  const detailScope = computed(() => {
    const scope = listScope.value
    const id = activeId.value
    return scope && id ? { scope, id } : undefined
  })
  const detail = useDataResource({
    key: detailScope,
    async load({ key, signal }) {
      const instance = await key.scope.source.getInstance(key.id, signal)
      if (instance?.id !== key.id || !Array.isArray(instance.history))
        throw new TypeError('Invalid approval detail')
      return {
        ...instance,
        history: [...instance.history].sort(
          (a, b) => a.occurredAt - b.occurredAt
        ),
      }
    },
  })

  function select(id: string) {
    const current = session.value
    if (
      current &&
      (id === directOption.value ||
        instances.value.some(instance => instance.id === id))
    )
      choice.value = { session: current, id }
  }

  return { activeId, detail, directOption, instances, list, select }
}
