import { expect, test } from 'bun:test'
import { computed, reactive } from 'vue'
import { useFormDirty } from '../src/components/C_Form/composables/useFormDirty'

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
