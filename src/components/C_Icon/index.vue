<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-06
 * @Description: 多来源图标，具备请求取消、真实加载状态及离线错误回退
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
-->
<template>
  <span
    ref="iconRef"
    class="c-icon"
    :class="[
      `c-icon--${type}`,
      {
        'c-icon--clickable': clickable,
        'c-icon--loading': loading || pending,
        'c-icon--error': hasError,
      },
    ]"
    :style="rootStyle"
    :title="title || (hasError ? errorMessage : undefined)"
    :aria-label="ariaLabel || iconDisplayName"
    :aria-busy="loading || pending || undefined"
    :role="clickable ? 'button' : 'img'"
    :tabindex="clickable ? 0 : undefined"
    @click="handleClick"
    @keydown="handleKeydown"
  >
    <Icon
      v-if="type === 'iconify' && !hasError"
      :icon="iconData || OFFLINE_ICON"
      :style="iconStyle"
      :color="color"
    />
    <span
      v-else-if="type === 'unocss' && !hasError"
      ref="unoRef"
      :class="[name, customClass]"
      :style="iconStyle"
    />
    <component
      :is="resolvedComponent"
      v-else-if="type === 'component' && resolvedComponent && !hasError"
      :style="iconStyle"
      v-bind="componentProps"
    />
    <svg
      v-else-if="type === 'svg' && !hasError"
      :viewBox="viewBox"
      :style="iconStyle"
      :fill="color"
      aria-hidden="true"
    >
      <path :d="svgPath" />
    </svg>
    <img
      v-else-if="type === 'image' && imageSrc && !hasError"
      :key="imageSrc"
      :src="imageSrc"
      :alt="alt || iconDisplayName"
      :style="iconStyle"
      @error="fail('image', '图片图标加载失败')"
      @load="complete"
    />
    <Icon
      v-else
      :icon="fallbackData || OFFLINE_ICON"
      :style="iconStyle"
      :color="color"
    />
    <span
      v-if="loading"
      class="c-icon__loading"
      :style="iconStyle"
      aria-hidden="true"
    >
      <span class="c-icon__spinner" />
    </span>
  </span>
</template>

<script lang="ts" setup>
  import { Icon, getIcon, loadIcons, type IconifyIcon } from '@iconify/vue'
  import { useImage } from '../../hooks/useImage'
  import {
    computed,
    nextTick,
    onBeforeUnmount,
    onMounted,
    readonly,
    ref,
    shallowRef,
    watch,
  } from 'vue'
  import { normalizeIconSize, OFFLINE_ICON } from './core'
  import type { IconProps } from './types'

  defineOptions({ name: 'C_Icon' })
  const props = withDefaults(defineProps<IconProps>(), {
    type: 'iconify',
    color: 'currentColor',
    size: 18,
    svgPath: '',
    viewBox: '0 0 24 24',
    alt: '',
    clickable: false,
    loading: false,
    fallbackIcon: '',
    loadTimeout: 5000,
    title: '',
    ariaLabel: '',
    customClass: '',
    rotate: 0,
    flip: undefined,
    componentProps: () => ({}),
  })
  const emit = defineEmits<{
    click: [event: MouseEvent | KeyboardEvent]
    error: [type: string, error?: unknown]
    load: []
  }>()
  const iconRef = ref<HTMLElement>()
  const unoRef = ref<HTMLElement>()
  const iconData = shallowRef<IconifyIcon | null>(null)
  const fallbackData = shallowRef<IconifyIcon | null>(null)
  const hasError = ref(false)
  const errorMessage = ref('')
  const imageSrc = ref('')
  const pending = ref(false)
  let mounted = false
  let generation = 0
  let imageTimer: ReturnType<typeof setTimeout> | undefined
  const cleanups = new Set<() => void>()
  const cssSize = computed(() => normalizeIconSize(props.size))
  const rootStyle = computed(() => ({
    fontSize: cssSize.value,
    color: props.color,
    width: cssSize.value,
    height: cssSize.value,
  }))
  const iconStyle = computed(() => ({
    display: 'inline-flex',
    width: cssSize.value,
    height: cssSize.value,
    transform:
      [
        props.rotate ? `rotate(${props.rotate}deg)` : '',
        props.flip
          ? `scaleX(${props.flip === 'horizontal' || props.flip === 'both' ? -1 : 1}) scaleY(${props.flip === 'vertical' || props.flip === 'both' ? -1 : 1})`
          : '',
      ]
        .filter(Boolean)
        .join(' ') || undefined,
  }))
  const iconDisplayName = computed(() => {
    if (typeof props.name === 'string') return props.name
    const component = props.name as
      { __name?: string; name?: string } | undefined
    return (
      component?.__name ||
      component?.name ||
      (props.type === 'svg' ? 'SVG Icon' : 'Icon')
    )
  })
  const resolvedComponent = computed(() =>
    props.type === 'component' && typeof props.name !== 'string'
      ? props.name
      : null
  )

  /** 清理回调与定时器；已发出的共享 Iconify 网络请求由 Iconify 自己去重。 */
  const cancel = () => {
    generation++
    clearTimeout(imageTimer)
    for (const cleanup of cleanups) cleanup()
    cleanups.clear()
  }

  /** 加载真实图标数据，处理不存在的名称、超时以及旧请求晚到。 */
  const requestIcon = (
    name: string,
    onSuccess: (icon: IconifyIcon) => void,
    onFailure: () => void
  ) => {
    const current = generation
    const cached = getIcon(name)
    if (cached) {
      onSuccess(cached)
      return
    }
    let finished = false
    const cleanup = () => {
      finished = true
      clearTimeout(timer)
      abort?.()
      cleanups.delete(cleanup)
    }
    const finish = (icon?: IconifyIcon | null) => {
      if (finished || current !== generation) return
      cleanup()
      if (icon) onSuccess(icon)
      else onFailure()
    }
    const timer = setTimeout(() => finish(), Math.max(100, props.loadTimeout))
    cleanups.add(cleanup)
    const abort = loadIcons([name], (_loaded, _missing, waiting) => {
      if (waiting.length === 0) finish(getIcon(name))
    })
  }

  /** 错误始终进入回退分支；回退也失败时保留内置离线图形。 */
  const fail = (type: string, message: string, error?: unknown) => {
    if (hasError.value) return
    clearTimeout(imageTimer)
    pending.value = false
    hasError.value = true
    errorMessage.value = message
    emit('error', type, error)
    if (props.fallbackIcon)
      requestIcon(
        props.fallbackIcon.replace(/^i-([^:-]+)[:-]/, '$1:'),
        icon => {
          fallbackData.value = icon
        },
        () => {}
      )
  }
  const complete = () => {
    if (hasError.value) return
    clearTimeout(imageTimer)
    pending.value = false
    emit('load')
  }

  /** UnoCSS 由宿主静态生成；检查实际 CSS，短暂 HMR 延迟允许有界重试。 */
  const checkUnoStyle = async () => {
    const current = generation
    await nextTick()
    const check = (attempt: number) => {
      if (current !== generation || !unoRef.value) return
      const style = getComputedStyle(unoRef.value)
      const mask =
        style.maskImage || style.getPropertyValue('-webkit-mask-image')
      if (
        (mask && mask !== 'none') ||
        (style.backgroundImage && style.backgroundImage !== 'none')
      ) {
        complete()
        return
      }
      if (attempt === 3) {
        fail('unocss', 'UnoCSS 图标样式未生成')
        return
      }
      const timer = setTimeout(() => {
        cleanups.delete(cleanup)
        check(attempt + 1)
      }, [50, 150, 400][attempt])
      const cleanup = () => clearTimeout(timer)
      cleanups.add(cleanup)
    }
    check(0)
  }

  /** 图标数据由共享缓存去重，实际成功后才通知宿主。 */
  const validateIconify = (name: string) => {
    iconData.value = getIcon(name) || null
    if (!mounted) return
    pending.value = !iconData.value
    requestIcon(
      name,
      icon => {
        iconData.value = icon
        complete()
      },
      () => fail('iconify', 'Iconify 图标不存在或请求超时')
    )
  }

  /** 图片路径异步解析后，只允许当前来源更新视图。 */
  const validateImage = async (name: string) => {
    const current = generation
    pending.value = true
    imageTimer = setTimeout(
      () => {
        if (current === generation) fail('image', '图片图标加载超时')
      },
      Math.max(100, props.loadTimeout)
    )
    try {
      const source = await useImage(name)
      if (current !== generation || hasError.value) return
      if (source) imageSrc.value = source
      else fail('image', '图片路径解析失败')
    } catch (error) {
      if (current === generation) fail('image', '图片路径解析失败', error)
    }
  }

  /** 根据字符串来源调用对应校验器。 */
  const validateNamedSource = (name: string) => {
    if (props.type === 'iconify') validateIconify(name)
    else if (props.type === 'unocss') {
      if (!name.startsWith('i-')) fail('unocss', 'UnoCSS 图标名称应以 i- 开头')
      else if (mounted) void checkUnoStyle()
    } else if (props.type === 'image') void validateImage(name)
    else fail('type', '不支持的图标类型')
  }

  /** 重置并验证当前来源。异步结果只允许写入当前配置。 */
  const validateProps = () => {
    cancel()
    hasError.value = false
    errorMessage.value = ''
    iconData.value = null
    fallbackData.value = null
    imageSrc.value = ''
    pending.value = false
    if (props.type === 'svg') {
      if (!props.svgPath) fail('svg', 'SVG 路径不能为空')
      else if (mounted) complete()
      return
    }
    if (!props.name) {
      fail('validation', '图标名称不能为空')
      return
    }
    if (props.type === 'component') {
      if (!resolvedComponent.value) fail('component', '无法解析图标组件')
      else if (mounted) complete()
      return
    }
    if (typeof props.name !== 'string') {
      fail(props.type, '图标名称必须为字符串')
      return
    }
    validateNamedSource(props.name)
  }
  const handleClick = (event: MouseEvent) => {
    if (props.clickable && !props.loading) emit('click', event)
  }
  const handleKeydown = (event: KeyboardEvent) => {
    if (
      props.clickable &&
      !props.loading &&
      (event.key === 'Enter' || event.key === ' ')
    ) {
      event.preventDefault()
      emit('click', event)
    }
  }
  watch(
    () => [
      props.name,
      props.type,
      props.svgPath,
      props.fallbackIcon,
      props.loadTimeout,
    ],
    () => {
      void validateProps()
    },
    { immediate: true }
  )
  onMounted(() => {
    mounted = true
    void validateProps()
  })
  onBeforeUnmount(cancel)
  defineExpose({
    validate: validateProps,
    hasError: readonly(hasError),
    errorMessage: readonly(errorMessage),
    el: iconRef,
  })
</script>

<style lang="scss" scoped>
  @use './index.scss';
</style>
