import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { ScanDecoder, ScanInputProps, ScanResult } from './types'

interface DetectedBarcode {
  rawValue: string
  format: string
}
type NativeDetector = new () => {
  detect(source: HTMLVideoElement | ImageBitmap): Promise<DetectedBarcode[]>
}
type InputMode = 'camera' | 'photo'

function detectorType() {
  return (
    globalThis as typeof globalThis & { BarcodeDetector?: NativeDetector }
  ).BarcodeDetector
}

function createDecoder(): ScanDecoder {
  const Detector = detectorType()
  if (!Detector) throw new Error('Barcode detection is unavailable')
  const detector = new Detector()
  return async source => {
    const [code] = await detector.detect(source)
    return code ? { value: code.rawValue, format: code.format } : null
  }
}

/** Own one cancellable scan session and its media resources at a time. */
export function useScanInput(
  props: ScanInputProps,
  onScan: (result: ScanResult, input: InputMode) => void,
  onError: (error: unknown, input: InputMode) => void
) {
  const video = ref<HTMLVideoElement>()
  const mode = ref<InputMode>()
  const message = ref<'found' | 'empty' | 'failed'>()
  const canDecode = computed(() => Boolean(props.decode || detectorType()))
  const canCamera = computed(
    () =>
      canDecode.value &&
      typeof navigator !== 'undefined' &&
      Boolean(navigator.mediaDevices?.getUserMedia)
  )
  const canPhoto = computed(
    () => canDecode.value && typeof createImageBitmap === 'function'
  )
  let session: AbortController | undefined
  let stream: MediaStream | undefined
  let timer: ReturnType<typeof setTimeout> | undefined

  function stop() {
    session?.abort()
    session = undefined
    if (timer !== undefined) clearTimeout(timer)
    timer = undefined
    if (video.value) video.value.srcObject = null
    stream?.getTracks().forEach(track => track.stop())
    stream = undefined
    mode.value = undefined
    message.value = undefined
  }

  function begin(input: InputMode) {
    stop()
    const controller = new AbortController()
    session = controller
    mode.value = input
    return controller.signal
  }

  function finish(result: ScanResult, input: InputMode) {
    stop()
    message.value = 'found'
    onScan(result, input)
  }

  function fail(error: unknown, input: InputMode) {
    stop()
    message.value = 'failed'
    onError(error, input)
  }

  function canStart(input: InputMode) {
    if (props.disabled) return false
    return input === 'camera'
      ? props.camera && canCamera.value && mode.value !== 'camera'
      : props.photo && canPhoto.value
  }

  async function openCamera() {
    if (!canStart('camera')) return
    const signal = begin('camera')
    try {
      const decode = props.decode ?? createDecoder()
      const media = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' } },
      })
      if (signal.aborted) {
        media.getTracks().forEach(track => track.stop())
        return
      }
      stream = media
      await nextTick()
      const element = video.value
      if (!element || signal.aborted) return
      element.srcObject = media
      await element.play()

      async function scanFrame() {
        if (signal.aborted || !element) return
        try {
          if (element.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            const result = await decode(element, signal)
            if (signal.aborted) return
            if (result?.value) {
              finish(result, 'camera')
              return
            }
          }
          timer = setTimeout(scanFrame, 180)
        } catch (error) {
          if (!signal.aborted) fail(error, 'camera')
        }
      }
      await scanFrame()
    } catch (error) {
      if (!signal.aborted) fail(error, 'camera')
    }
  }

  async function scanPhoto(file: File) {
    if (!canStart('photo')) return
    const signal = begin('photo')
    let image: ImageBitmap | undefined
    const releaseImage = () => {
      image?.close()
      image = undefined
    }
    try {
      const decode = props.decode ?? createDecoder()
      image = await createImageBitmap(file)
      if (signal.aborted) return
      signal.addEventListener('abort', releaseImage, { once: true })
      const result = await decode(image, signal)
      if (signal.aborted) return
      if (result?.value) finish(result, 'photo')
      else {
        stop()
        message.value = 'empty'
      }
    } catch (error) {
      if (!signal.aborted) fail(error, 'photo')
    } finally {
      signal.removeEventListener('abort', releaseImage)
      releaseImage()
    }
  }

  watch(
    () => [
      props.camera,
      props.photo,
      props.disabled,
      props.decode,
      props.scope,
    ],
    stop,
    { flush: 'sync' }
  )
  onBeforeUnmount(stop)
  return {
    video,
    mode,
    message,
    canCamera,
    canPhoto,
    openCamera,
    scanPhoto,
    stop,
  }
}
