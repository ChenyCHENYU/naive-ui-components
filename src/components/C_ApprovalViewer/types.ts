import type { ComponentLocale } from '../../core/contracts'

/** 由应用数据源将审批引擎的状态映射为此展示状态。 */
export type ApprovalInstanceStatus =
  | 'pending'
  | 'running'
  | 'approved'
  | 'rejected'
  | 'withdrawn'
  | 'cancelled'
  | 'terminated'

export interface ApprovalInstanceSummary {
  /** 单次审批的稳定标识，同一单据重提后使用新的 ID。 */
  id: string
  status: ApprovalInstanceStatus
  /** Unix 时间戳，单位毫秒。 */
  startedAt: number
  label?: string
  initiator?: string
  currentHandler?: string
  finishedAt?: number
}

export interface ApprovalHistoryEvent {
  id: string
  title: string
  /** Unix 时间戳，单位毫秒。 */
  occurredAt: number
  actor?: string
  /** 审批意见，按纯文本展示。 */
  comment?: string
}

export interface ApprovalInstanceDetail extends ApprovalInstanceSummary {
  history: readonly ApprovalHistoryEvent[]
}

export interface ApprovalViewerSource {
  listInstances(
    businessKey: string,
    signal: AbortSignal
  ): Promise<readonly ApprovalInstanceSummary[]>
  getInstance(
    instanceId: string,
    signal: AbortSignal
  ): Promise<ApprovalInstanceDetail>
}

export interface ApprovalViewerProps {
  show?: boolean
  businessKey: string
  source: ApprovalViewerSource
  /** 可直达指定实例；未提供时按发起时间选中最新实例。 */
  instanceId?: string
  title?: string
  locale?: ComponentLocale
}
