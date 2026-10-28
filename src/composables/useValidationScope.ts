/** 多区域校验协调；数据库事务和提交幂等继续由业务持有。 */
import { computed, getCurrentScope, onScopeDispose, shallowRef } from 'vue'
import {
  collectValidationIssues,
  validationIssueKey,
  type ValidationIssue,
} from '../core/validation'

export interface ValidationParticipant {
  id: string
  dirty?: () => boolean
  validate: (
    signal: AbortSignal
  ) =>
    | void
    | readonly ValidationIssue[]
    | Promise<void | readonly ValidationIssue[]>
  /** 先切 Tab/展开分区，再定位稳定 rowKey/field；返回 false 表示目标不存在。 */
  reveal?: (issue: ValidationIssue) => boolean | void | Promise<boolean | void>
}

function scopeIssue(source: string, issue: ValidationIssue): ValidationIssue {
  return {
    ...issue,
    source,
    key: validationIssueKey(source, issue.message, issue.target, issue.key),
    target: issue.target ? { ...issue.target } : undefined,
  }
}

/** 注册当前真实区域，不遍历整张业务单据的数据图。 */
export function useValidationScope() {
  const participants = shallowRef(new Map<string, ValidationParticipant>())
  const issues = shallowRef<readonly ValidationIssue[]>([])
  const validating = shallowRef(false)
  const navigationError = shallowRef<unknown>(null)
  let generation = 0
  let disposed = false
  let controller: AbortController | undefined
  let pending: Promise<boolean> | undefined
  let navigationGeneration = 0
  const cancel = () => {
    generation++
    const previous = controller
    controller = undefined
    pending = undefined
    previous?.abort()
    if (!controller && !pending) validating.value = false
  }
  const register = (participant: ValidationParticipant) => {
    if (disposed) throw new Error('校验区域已销毁')
    const { id } = participant
    if (!id || participants.value.has(id))
      throw new Error(`校验区域标识必须唯一：${id}`)
    cancel()
    if (disposed) throw new Error('校验区域已销毁')
    if (participants.value.has(id))
      throw new Error(`校验区域标识必须唯一：${id}`)
    participants.value = new Map(participants.value).set(id, participant)
    return () => {
      if (participants.value.get(id) !== participant) return
      cancel()
      if (disposed || participants.value.get(id) !== participant) return
      const previousIssues = new Set(
        issues.value.filter(issue => issue.source === id)
      )
      navigationGeneration++
      navigationError.value = null
      if (disposed || participants.value.get(id) !== participant) return
      const next = new Map(participants.value)
      next.delete(id)
      participants.value = next
      if (!disposed)
        issues.value = issues.value.filter(issue => !previousIssues.has(issue))
    }
  }
  const validate = (): Promise<boolean> => {
    if (disposed) return Promise.resolve(false)
    if (pending) return pending
    const version = generation
    const active = new AbortController()
    controller = active
    const ownsValidation = () =>
      !disposed &&
      version === generation &&
      controller === active &&
      !active.signal.aborted
    const task = Promise.resolve().then(async () => {
      if (disposed || version !== generation) return false
      const results = await Promise.all(
        [...participants.value].map(async ([id, participant]) => {
          if (!ownsValidation()) return []
          try {
            const result = await participant.validate(active.signal)
            if (!ownsValidation()) return []
            return (result ?? []).map(issue => scopeIssue(id, issue))
          } catch (error) {
            return ownsValidation() ? collectValidationIssues(error, id) : []
          }
        })
      )
      if (disposed || version !== generation) return false
      const byKey = new Map<string, ValidationIssue>()
      for (const result of results)
        for (const issue of result) byKey.set(issue.key, issue)
      const found = [...byKey.values()]
      issues.value = found
      return version === generation && !disposed && found.length === 0
    })
    const finalize = () => {
      if (controller === active) {
        controller = undefined
        pending = undefined
        validating.value = false
      }
    }
    const result = task.then(
      valid => {
        finalize()
        return !disposed && version === generation && valid
      },
      error => {
        finalize()
        throw error
      }
    )
    pending = result
    validating.value = true
    return result
  }
  const reveal = async (issue: ValidationIssue): Promise<boolean> => {
    if (disposed) return false
    const version = ++navigationGeneration
    const { source } = issue
    const participant = participants.value.get(source)
    const ownsNavigation = () =>
      !disposed &&
      version === navigationGeneration &&
      participants.value.get(source) === participant
    navigationError.value = null
    if (!ownsNavigation()) return false
    if (!participant?.reveal) return false
    try {
      const allowed = await participant.reveal({
        ...issue,
        target: issue.target ? { ...issue.target } : undefined,
      })
      return ownsNavigation() && allowed !== false
    } catch (error) {
      if (ownsNavigation()) navigationError.value = error
      return false
    }
  }
  const clear = () => {
    cancel()
    navigationGeneration++
    navigationError.value = null
    issues.value = []
  }
  const dispose = () => {
    if (disposed) return
    disposed = true
    clear()
    participants.value = new Map()
  }
  if (getCurrentScope()) onScopeDispose(dispose)
  return {
    issues,
    validating,
    navigationError,
    dirty: computed(() =>
      [...participants.value.values()].some(item => item.dirty?.())
    ),
    register,
    validate,
    reveal,
    clear,
    dispose,
  }
}
