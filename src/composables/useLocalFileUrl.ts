import {
  onActivated,
  onDeactivated,
  onMounted,
  readonly,
  ref,
  watchEffect,
} from 'vue'

/** 将本地文件地址绑定到当前预览的活动生命周期。 */
export function useLocalFileUrl(source: () => File | undefined) {
  const active = ref(false)
  const url = ref<string>()
  const activate = () => {
    active.value = true
  }
  onMounted(activate)
  onActivated(activate)
  onDeactivated(() => {
    active.value = false
  })
  watchEffect(onCleanup => {
    const file = active.value ? source() : undefined
    if (!file) {
      url.value = undefined
      return
    }
    const objectUrl = URL.createObjectURL(file)
    url.value = objectUrl
    onCleanup(() => URL.revokeObjectURL(objectUrl))
  })
  return readonly(url)
}
