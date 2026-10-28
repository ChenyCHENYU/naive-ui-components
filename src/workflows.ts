/** 可选组合工作流入口；普通表格与表单不会因此挂载资源或监听器。 */
export { useDataResource } from './composables/useDataResource'
export type {
  DataResourceOptions,
  DataResourceStatus,
} from './composables/useDataResource'
export { useValidationScope } from './composables/useValidationScope'
export type { ValidationParticipant } from './composables/useValidationScope'
export { useFormArray } from './composables/useFormArray'
export type { FormArrayEntry } from './composables/useFormArray'
