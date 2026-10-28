/** 无 UI 的值语义入口；不加载 Vue、Naive UI 或请求库。 */
export { createNumberCodec } from './core/numberCodec'
export type { NumberCodecOptions, ValueCodec } from './core/numberCodec'
export { collectValidationIssues } from './core/validation'
export type { ValidationIssue, ValidationTarget } from './core/validation'
export { createBatchPatch, getRetryableKeys } from './core/batchPatch'
export type {
  BatchFieldChange,
  BatchOperationResult,
  PatchScalar,
} from './core/batchPatch'
export {
  createDictionaryLabelResolver,
  getDictionaryLabel,
  parseDictionaryValue,
} from './core/dictionary'
export type {
  DictionaryBinding,
  DictionarySource,
  DictionaryProvider,
  DictionaryOption,
  DictionaryValue,
  DictionaryParseResult,
} from './core/dictionary'
