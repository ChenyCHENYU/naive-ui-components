<template>
  <section
    class="c-image-annotator"
    :aria-label="resolvedTitle"
  >
    <header class="c-image-annotator__header">
      <strong>{{ resolvedTitle }}</strong>
      <NButton
        v-if="!readonly"
        attr-type="button"
        secondary
        type="primary"
        :size="size"
        :disabled="!canEdit"
        @click="edit()"
        >{{ t('imageAnnotator.add') }}</NButton
      >
    </header>

    <div class="c-image-annotator__content">
      <div class="c-image-annotator__preview">
        <div
          v-if="source && !loadFailed"
          class="c-image-annotator__canvas"
          :class="{ 'is-drawable': canEdit }"
          @pointerdown="start"
          @pointermove="move"
          @pointerup="finish"
          @pointercancel="cancelGesture"
          @lostpointercapture="cancelGesture"
        >
          <img
            :key="source"
            :src="source"
            :alt="alt"
            draggable="false"
            @load="loaded = true"
            @error="failImage"
          />
          <template v-if="loaded">
            <button
              v-for="(item, index) in visible"
              :key="item.id"
              type="button"
              tabindex="-1"
              class="c-image-annotator__box"
              :class="{ 'is-active': selectedId === item.id }"
              :style="areaStyle(item.box)"
              :aria-label="labelOf(item, index)"
              @pointerdown.stop
              @click="edit(item)"
            />
            <div
              v-if="drawingBox"
              class="c-image-annotator__box is-preview"
              :style="areaStyle(drawingBox)"
              aria-hidden="true"
            />
          </template>
        </div>
        <p
          v-if="source && !loaded && !loadFailed"
          class="c-image-annotator__placeholder"
          role="status"
          >{{ t('imageAnnotator.loading') }}</p
        >
        <div
          v-if="active && (!source || loadFailed)"
          class="c-image-annotator__placeholder"
          role="status"
        >
          {{
            t(
              loadFailed
                ? 'imageAnnotator.loadFailed'
                : 'imageAnnotator.unavailable'
            )
          }}
          <NButton
            v-if="loadFailed"
            attr-type="button"
            :size="size"
            @click="loadFailed = false"
            >{{ t('common.retry') }}</NButton
          >
        </div>
      </div>

      <aside class="c-image-annotator__panel">
        <ul
          v-if="visible.length"
          class="c-image-annotator__list"
          :aria-label="t('imageAnnotator.items')"
        >
          <li
            v-for="(item, index) in visible"
            :key="item.id"
          >
            <button
              type="button"
              :aria-current="selectedId === item.id ? 'true' : undefined"
              @click="edit(item)"
              >{{ labelOf(item, index) }}</button
            >
          </li>
        </ul>
        <span
          v-else
          class="c-image-annotator__placeholder"
          >{{ t('imageAnnotator.empty') }}</span
        >

        <div
          v-if="draft && canEdit"
          class="c-image-annotator__editor"
          role="group"
          :aria-label="t('imageAnnotator.editor')"
        >
          <div class="c-image-annotator__coordinates">
            <div
              v-for="axis in axes"
              :key="axis"
            >
              <label :for="`${editorId}-${axis}`">{{
                t(`imageAnnotator.${axis}`)
              }}</label>
              <NInputNumber
                v-model:value="draft.coordinates[axis]"
                :input-props="{ id: `${editorId}-${axis}` }"
                :size="size"
                :min="0"
                :max="100"
                :step="0.1"
                :show-button="false"
              />
            </div>
          </div>
          <label :for="`${editorId}-note`">{{
            t('imageAnnotator.note')
          }}</label>
          <NInput
            v-model:value="draft.note"
            type="textarea"
            :rows="2"
            :size="size"
            :input-props="{ id: `${editorId}-note` }"
          />
          <p
            v-if="error"
            class="c-image-annotator__error"
            role="alert"
            >{{ t(error) }}</p
          >
          <div class="c-image-annotator__actions">
            <NButton
              attr-type="button"
              :size="size"
              @click="draft = null"
              >{{ t('common.cancel') }}</NButton
            >
            <NButton
              v-if="draft.original"
              attr-type="button"
              :size="size"
              tertiary
              type="error"
              @click="remove"
              >{{ t('imageAnnotator.remove') }}</NButton
            >
            <NButton
              attr-type="button"
              type="primary"
              :size="size"
              @click="save"
              >{{ t('imageAnnotator.save') }}</NButton
            >
          </div>
        </div>
        <p
          v-else-if="selected?.note"
          class="c-image-annotator__note"
          >{{ selected.note }}</p
        >
      </aside>
    </div>
  </section>
</template>

<script setup lang="ts">
  import {
    computed,
    onActivated,
    onDeactivated,
    onMounted,
    ref,
    useId,
    watch,
  } from 'vue'
  import { NButton, NInput, NInputNumber } from 'naive-ui'
  import { useComponentDensity } from '../../composables/useComponentDensity'
  import { useImageAnnotatorLocale } from './locale'
  import { useLocalFileUrl } from '../../composables/useLocalFileUrl'
  import { resolveComponentDensity } from '../../core/density'
  import { resolvePreviewUrl } from '../C_FilePreview/fileUrl'
  import {
    boxFromPoints,
    imagePoint,
    isSameAnnotation,
    isValidBox,
    toNormalizedBox,
    toPercentBox,
    type PercentBox,
  } from './data'
  import type {
    ImageAnnotation,
    ImageAnnotationBox,
    ImageAnnotatorProps,
  } from './types'

  interface Draft {
    original?: ImageAnnotation
    coordinates: PercentBox
    note: string
  }
  type Point = Pick<ImageAnnotationBox, 'x' | 'y'>

  defineOptions({ name: 'C_ImageAnnotator' })
  const props = defineProps<ImageAnnotatorProps>()
  const annotations = defineModel<readonly ImageAnnotation[]>({
    default: () => [],
  })
  const { t } = useImageAnnotatorLocale(() => props.locale)
  const density = useComponentDensity(() => props.density)
  const size = computed(() => resolveComponentDensity(density.value).size)
  const resolvedTitle = computed(() => props.title ?? t('imageAnnotator.title'))
  const editorId = useId()
  const axes = ['x', 'y', 'width', 'height'] as const
  const active = ref(false)
  const loaded = ref(false)
  const loadFailed = ref(false)
  const draft = ref<Draft | null>(null)
  const selectedId = ref<string | null>(null)
  const error = ref('')
  const gesture = ref<{ id: number; start: Point; end: Point } | null>(null)
  let idSequence = 0

  const localUrl = useLocalFileUrl(() =>
    typeof props.src === 'string' ? undefined : props.src
  )
  const source = computed(() => {
    if (!active.value) return undefined
    if (typeof props.src !== 'string') return localUrl.value
    return resolvePreviewUrl(props.src, window.location.href) ?? undefined
  })
  const canEdit = computed(
    () => loaded.value && !loadFailed.value && !props.readonly
  )
  const visible = computed(() =>
    annotations.value.filter(item => isValidBox(item.box))
  )
  const selected = computed(() =>
    visible.value.find(item => item.id === selectedId.value)
  )
  const drawingBox = computed(() => {
    if (gesture.value)
      return boxFromPoints(gesture.value.start, gesture.value.end)
    const edited = draft.value
      ? toNormalizedBox(draft.value.coordinates)
      : undefined
    return edited && isValidBox(edited) ? edited : undefined
  })

  const activate = () => {
    active.value = true
  }
  onMounted(activate)
  onActivated(activate)
  onDeactivated(() => {
    active.value = false
  })
  watch(source, () => {
    loaded.value = false
    loadFailed.value = false
    selectedId.value = null
    draft.value = null
    gesture.value = null
  })
  watch(
    () => props.readonly,
    () => {
      draft.value = null
      gesture.value = null
    }
  )

  function labelOf(item: ImageAnnotation, index: number) {
    return item.note || t('imageAnnotator.item', { number: index + 1 })
  }
  function failImage() {
    loaded.value = false
    loadFailed.value = true
  }
  function areaStyle(box: ImageAnnotationBox) {
    return {
      left: `${box.x * 100}%`,
      top: `${box.y * 100}%`,
      width: `${box.width * 100}%`,
      height: `${box.height * 100}%`,
    }
  }
  function edit(item?: ImageAnnotation, box?: ImageAnnotationBox) {
    selectedId.value = item?.id ?? null
    if (!canEdit.value) return
    const initial = box ??
      item?.box ?? { x: 0.1, y: 0.1, width: 0.25, height: 0.25 }
    draft.value = {
      original: item ? { ...item, box: { ...item.box } } : undefined,
      coordinates: toPercentBox(initial),
      note: item?.note ?? '',
    }
    error.value = ''
  }
  function start(event: PointerEvent) {
    if (!canEdit.value || event.button !== 0 || gesture.value) return
    const point = imagePoint(event)
    if (!point) return
    gesture.value = { id: event.pointerId, start: point, end: point }
    const target = event.currentTarget as HTMLElement
    target.setPointerCapture?.(event.pointerId)
  }
  function move(event: PointerEvent) {
    if (gesture.value?.id !== event.pointerId) return
    const point = imagePoint(event)
    if (point) gesture.value.end = point
  }
  function finish(event: PointerEvent) {
    const current = gesture.value
    if (current?.id !== event.pointerId) return
    gesture.value = null
    const box = boxFromPoints(current.start, imagePoint(event) ?? current.end)
    if (isValidBox(box)) edit(undefined, box)
  }
  function cancelGesture(event: PointerEvent) {
    if (gesture.value?.id === event.pointerId) gesture.value = null
  }
  function editableIndex(original: ImageAnnotation) {
    const index = annotations.value.findIndex(item => item.id === original.id)
    const current = annotations.value[index]
    if (current && isSameAnnotation(original, current)) return index
    error.value = 'imageAnnotator.stale'
    return -1
  }
  function save() {
    if (!canEdit.value || !draft.value) return
    const { original, coordinates, note } = draft.value
    const box = toNormalizedBox(coordinates)
    if (!isValidBox(box)) {
      error.value = 'imageAnnotator.invalidBox'
      return
    }
    const next = [...annotations.value]
    if (original) {
      const index = editableIndex(original)
      if (index < 0) return
      next[index] = { id: original.id, box, note }
      selectedId.value = original.id
    } else {
      const id = nextId()
      next.push({ id, box, note })
      selectedId.value = id
    }
    annotations.value = next
    draft.value = null
  }
  function nextId() {
    let id: string
    do {
      id = `${editorId}-annotation-${++idSequence}`
    } while (annotations.value.some(item => item.id === id))
    return id
  }
  function remove() {
    const original = draft.value?.original
    if (!canEdit.value || !original) return
    const index = editableIndex(original)
    if (index < 0) return
    annotations.value = annotations.value.filter(
      (_, position) => position !== index
    )
    draft.value = null
    selectedId.value = null
  }
</script>

<style scoped lang="scss">
  @use './index.scss';
</style>
