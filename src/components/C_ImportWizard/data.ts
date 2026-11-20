import { computed, onBeforeUnmount, shallowRef, watch } from 'vue'
import type { BatchOperationResult } from '../../core/batchPatch'
import type {
  ImportColumnMapping,
  ImportWizardAdapter,
  ImportWizardDraft,
  ImportWizardField,
  ImportWizardPhase,
  ImportWizardPreview,
  ImportWizardProps,
  ImportWizardSheet,
} from './types'

interface FileSession<K extends string, Plan> {
  file: File
  sheets: readonly ImportWizardSheet[]
  adapter: ImportWizardAdapter<K, Plan>
}

function suggestMapping<K extends string>(
  fields: readonly ImportWizardField<K>[],
  sheet: ImportWizardSheet
): ImportColumnMapping<K>[] {
  const columns = new Set(sheet.columns.map(column => column.key))
  const candidates = new Map<string, string | null>()
  for (const { key, label } of sheet.columns) {
    const trimmed = label.trim()
    if (trimmed) candidates.set(trimmed, candidates.has(trimmed) ? null : key)
  }
  const used = new Set<string>(
    fields.filter(field => columns.has(field.key)).map(field => field.key)
  )
  const mapping: ImportColumnMapping<K>[] = []
  for (const field of fields) {
    if (columns.has(field.key)) {
      mapping.push({ field: field.key, column: field.key })
      continue
    }
    const column = candidates.get(field.label.trim())
    if (!column || used.has(column)) continue
    used.add(column)
    mapping.push({ field: field.key, column })
  }
  return mapping
}

function validateSheets(sheets: readonly ImportWizardSheet[]) {
  return (
    sheets.length > 0 &&
    new Set(sheets.map(sheet => sheet.key)).size === sheets.length &&
    sheets.every(
      sheet =>
        sheet.key &&
        sheet.columns.every(column => column.key) &&
        new Set(sheet.columns.map(column => column.key)).size ===
          sheet.columns.length
    )
  )
}

/** Keep the preview and commit ownership bound to the file and its adapter. */
export function useImportWizard<K extends string, Plan>(
  props: Readonly<ImportWizardProps<K, Plan>>,
  onCompleted: (results: readonly BatchOperationResult[]) => void,
  onFailure: (phase: ImportWizardPhase, cause: unknown) => void
) {
  const session = shallowRef<FileSession<K, Plan>>()
  const sheetKey = shallowRef<string>()
  const mapping = shallowRef<readonly ImportColumnMapping<K>[]>([])
  const review = shallowRef<ImportWizardPreview<Plan>>()
  const results = shallowRef<readonly BatchOperationResult[]>()
  const active = shallowRef<{
    phase: ImportWizardPhase
    controller: AbortController
  }>()
  const failedPhase = shallowRef<ImportWizardPhase>()
  const phase = computed(() => active.value?.phase)
  const sheet = computed(() =>
    session.value?.sheets.find(item => item.key === sheetKey.value)
  )
  const fields = computed(() => {
    const indexed = new Map<K, ImportWizardField<K>>()
    for (const field of props.fields)
      if (field.key && !indexed.has(field.key)) indexed.set(field.key, field)
    return [...indexed.values()]
  })
  const selected = computed(
    () => new Map(mapping.value.map(item => [item.field, item.column]))
  )
  const canPreview = computed(() => {
    if (!sheet.value || !mapping.value.length || props.disabled || active.value)
      return false
    return fields.value.every(
      field => !field.required || selected.value.has(field.key)
    )
  })
  const canCommit = computed(() => {
    const preview = review.value
    return Boolean(
      !props.disabled &&
      !active.value &&
      preview?.rowCount &&
      failedPhase.value !== 'commit' &&
      results.value === undefined &&
      !preview.issues?.some(issue => issue.level === 'error')
    )
  })

  const abort = () => {
    const previous = active.value
    active.value = undefined
    previous?.controller.abort()
  }
  const clearReview = () => {
    abort()
    review.value = undefined
    failedPhase.value = undefined
  }
  const reset = () => {
    clearReview()
    session.value = undefined
    sheetKey.value = undefined
    mapping.value = []
    results.value = undefined
  }
  watch(() => props.scope, reset, { flush: 'sync' })
  watch(
    () =>
      JSON.stringify(
        fields.value.map(({ key, required }) => [key, Boolean(required)])
      ),
    () => {
      if (
        phase.value !== 'commit' &&
        results.value === undefined &&
        failedPhase.value !== 'commit'
      )
        reset()
    },
    { flush: 'sync' }
  )
  onBeforeUnmount(abort)

  const run = async <T>(
    phase: ImportWizardPhase,
    load: (signal: AbortSignal) => Promise<T>,
    apply: (value: T) => void
  ) => {
    const task = { phase, controller: new AbortController() }
    active.value = task
    failedPhase.value = undefined
    try {
      const value = await load(task.controller.signal)
      if (active.value === task) apply(value)
    } catch (cause) {
      if (active.value !== task) return
      failedPhase.value = phase
      onFailure(phase, cause)
    } finally {
      if (active.value === task) active.value = undefined
    }
  }

  const chooseSheet = (key: string) => {
    const next = session.value?.sheets.find(item => item.key === key)
    if (!next) return
    sheetKey.value = next.key
    mapping.value = suggestMapping(fields.value, next)
  }
  const loadFile = async (file: File) => {
    if (props.disabled || phase.value === 'commit') return
    reset()
    const { adapter } = props
    await run(
      'read',
      signal => adapter.read(file, signal),
      sheets => {
        if (!validateSheets(sheets))
          throw new TypeError('Invalid import workbook')
        session.value = { file, sheets, adapter }
        chooseSheet(sheets[0].key)
      }
    )
  }
  const chooseMapping = (field: K, column: string | null) => {
    if (
      props.disabled ||
      active.value ||
      review.value ||
      !fields.value.some(item => item.key === field)
    )
      return
    const withoutField = mapping.value.filter(item => item.field !== field)
    if (column === null) {
      mapping.value = withoutField
      return
    }
    const sourceColumn = sheet.value?.columns.find(item => item.key === column)
    if (sourceColumn && !withoutField.some(item => item.column === column)) {
      mapping.value = [...withoutField, { field, column }]
    }
  }
  const preview = async () => {
    const current = session.value
    if (!current || !sheetKey.value || !canPreview.value || review.value) return
    const draft: ImportWizardDraft<K> = {
      file: current.file,
      sheetKey: sheetKey.value,
      mapping: mapping.value.map(item => ({ ...item })),
    }
    await run(
      'preview',
      signal => current.adapter.preview(draft, signal),
      value => {
        if (!Number.isSafeInteger(value.rowCount) || value.rowCount < 0) {
          throw new TypeError('Invalid import preview row count')
        }
        review.value = value
      }
    )
  }
  const commit = async () => {
    const current = session.value
    const snapshot = review.value
    if (!current || !snapshot || !canCommit.value) return
    await run(
      'commit',
      signal => current.adapter.commit(snapshot.plan, signal),
      value => {
        if (!Array.isArray(value)) throw new TypeError('Invalid import result')
        results.value = [...value]
        onCompleted(results.value)
      }
    )
  }
  const cancel = () => {
    if (!props.disabled && phase.value !== 'commit') reset()
  }
  const editMapping = () => {
    if (
      props.disabled ||
      phase.value === 'commit' ||
      failedPhase.value === 'commit' ||
      results.value
    )
      return
    clearReview()
  }
  const selectSheet = (key: string) => {
    if (
      !props.disabled &&
      !active.value &&
      !review.value &&
      key !== sheetKey.value
    )
      chooseSheet(key)
  }
  return {
    session,
    sheetKey,
    sheet,
    fields,
    selected,
    review,
    results,
    phase,
    failedPhase,
    canPreview,
    canCommit,
    loadFile,
    chooseMapping,
    preview,
    commit,
    cancel,
    editMapping,
    selectSheet,
  }
}
