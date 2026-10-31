import { expect, test } from 'bun:test'
import { computed, markRaw, reactive, ref, shallowReactive } from 'vue'
import { useFormDirty } from '../src/components/C_Form/composables/useFormDirty'

test.each(['rows', 'detail.rows'])(
  'sparse array changes invalidate cached dirty state for %s',
  field => {
    const rows: { value: string }[] = []
    rows.length = 2
    rows[1] = { value: 'last' }
    const model = reactive({ rows, detail: { rows } })
    const dirty = useFormDirty(model, [field])
    const fieldDirty = computed(() => dirty.isFieldDirty(field))
    dirty.markAsClean()
    expect(dirty.isDirty.value).toBe(false)
    expect(fieldDirty.value).toBe(false)
    model.rows[0] = { value: 'filled' }
    expect(dirty.isDirty.value).toBe(true)
    expect(fieldDirty.value).toBe(true)
    expect(dirty.getChangedFields()).toEqual([field])
    delete model.rows[0]
    expect(dirty.isDirty.value).toBe(false)
    expect(fieldDirty.value).toBe(false)
    expect(dirty.getChangedFields()).toEqual([])
    model.rows.push({ value: 'appended' })
    expect(dirty.isDirty.value).toBe(true)
    dirty.markAsClean()
    expect(dirty.isDirty.value).toBe(false)
    delete model.rows[2]
    expect(dirty.isDirty.value).toBe(true)
    model.rows[2] = { value: 'appended' }
    expect(dirty.isDirty.value).toBe(false)
  }
)

test('boolean dirty checks stop at the first changed field while full reports still inspect every field', () => {
  let detailReads = 0
  const detail = Object.defineProperty({}, 'value', {
    enumerable: true,
    get() {
      detailReads++
      return 'unchanged large detail'
    },
  })
  const model = reactive({ name: 'before', detail })
  const dirty = useFormDirty(model, () => ['name', 'detail'])
  dirty.markAsClean()
  model.name = 'after'
  detailReads = 0
  expect(dirty.isDirty.value).toBe(true)
  expect(detailReads).toBe(0)
  expect(dirty.getChangedFields()).toEqual(['name'])
  expect(detailReads).toBeGreaterThan(0)
  model.name = 'before'
  expect(dirty.isDirty.value).toBe(false)
})

test('field dirty checks inside computed track nested Map and Set changes and clean snapshots', () => {
  const model = reactive({
    selections: new Map([['row', { tags: new Set(['initial']) }]]),
  })
  const dirty = useFormDirty(model)
  dirty.markAsClean()
  const selectionDirty = computed(() => dirty.isFieldDirty('selections'))
  expect(selectionDirty.value).toBe(false)
  model.selections.get('row')!.tags.add('added')
  expect(selectionDirty.value).toBe(true)
  model.selections.get('row')!.tags.delete('added')
  expect(selectionDirty.value).toBe(false)
  model.selections.set('other', { tags: new Set(['other']) })
  expect(selectionDirty.value).toBe(true)
  dirty.markAsClean()
  expect(selectionDirty.value).toBe(false)
})

test('large forms reuse unchanged field comparisons across edits and complete dirty reports', () => {
  const reads = Array.from({ length: 1_000 }, () => 0)
  const model = reactive(
    Object.fromEntries(
      reads.map((_, index) => [
        `field${index}`,
        {
          detail: {
            get value() {
              reads[index]++
              return index
            },
          },
          edited: false,
        },
      ])
    )
  )
  const dirty = useFormDirty(model)
  dirty.markAsClean()
  expect(dirty.isDirty.value).toBe(false)
  reads.fill(0)

  model.field999.edited = true
  expect(dirty.isDirty.value).toBe(true)
  expect(dirty.getChangedFields()).toEqual(['field999'])
  expect(reads.slice(0, 999).reduce((sum, count) => sum + count, 0)).toBe(0)

  model.field999.edited = false
  expect(dirty.isDirty.value).toBe(false)
  model.field5.detail = { value: 42 }
  expect(dirty.getChangedFields()).toEqual(['field5'])
  dirty.markAsClean()
  expect(dirty.isDirty.value).toBe(false)
})

test('field comparison caches follow dynamic field lists, missing keys and nested replacements', () => {
  const model = reactive({
    profile: { name: 'Ada' },
    optional: undefined as string | undefined,
  })
  const fields = ref(['profile.name'])
  const dirty = useFormDirty(model, fields)
  dirty.markAsClean()
  expect(dirty.isDirty.value).toBe(false)
  model.profile = { name: 'Grace' }
  expect(dirty.isFieldDirty('profile.name')).toBe(true)
  fields.value = ['optional']
  expect(dirty.isDirty.value).toBe(false)
  model.optional = 'present'
  expect(dirty.getChangedFields()).toEqual(['optional'])
  fields.value = ['profile.name']
  expect(dirty.getChangedFields()).toEqual(['profile.name'])
  // A caller may inspect a field outside the configured list without retaining it.
  expect(dirty.isFieldDirty('optional')).toBe(true)
  model.optional = undefined
  expect(dirty.isFieldDirty('optional')).toBe(false)
})

test('explicit dirty reports still inspect in-place Date and raw-object mutations', () => {
  const model = reactive({ date: new Date(0), raw: markRaw({ name: 'Ada' }) })
  const dirty = useFormDirty(model)
  dirty.markAsClean()
  expect(dirty.getChangedFields()).toEqual([])
  model.date.setTime(1_000)
  model.raw.name = 'Grace'
  expect(dirty.getChangedFields()).toEqual(['date', 'raw'])
  model.date.setTime(0)
  model.raw.name = 'Ada'
  expect(dirty.getChangedFields()).toEqual([])
})

test('nested raw containers, shallow models and plain dynamic field arrays stay live', () => {
  for (const model of [
    reactive({ profile: markRaw({ name: 'Ada' }), extra: '' }),
    shallowReactive({ profile: { name: 'Ada' }, extra: '' }),
  ]) {
    const fields = ['profile.name']
    const dirty = useFormDirty(model, fields)
    dirty.markAsClean()
    expect(dirty.getChangedFields()).toEqual([])
    model.profile.name = 'Grace'
    model.extra = 'added'
    fields.push('extra')
    expect(dirty.getChangedFields()).toEqual(['profile.name', 'extra'])
  }
})

test('adding and removing literal dotted keys invalidates the nested-path comparison', () => {
  const model = reactive<Record<string, unknown>>({ profile: { name: 'Ada' } })
  const dirty = useFormDirty(model, ['profile.name'])
  dirty.markAsClean()
  expect(dirty.getChangedFields()).toEqual([])
  model['profile.name'] = 'Grace'
  expect(dirty.getChangedFields()).toEqual(['profile.name'])
  delete model['profile.name']
  expect(dirty.getChangedFields()).toEqual([])
})
