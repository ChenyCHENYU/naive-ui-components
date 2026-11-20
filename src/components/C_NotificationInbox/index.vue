<template>
  <section
    class="c-notification-inbox"
    :style="theme"
  >
    <div class="c-notification-inbox__header">
      <div
        class="c-notification-inbox__views"
        role="group"
        :aria-label="t('inbox.views')"
      >
        <NButton
          v-for="view in views"
          :key="view.key"
          :aria-pressed="activeView === view.key"
          :type="activeView === view.key ? 'primary' : 'default'"
          :disabled="view.disabled"
          size="small"
          secondary
          @click="selectView(view.key)"
        >
          {{ view.label }}
          <span
            v-if="view.count !== undefined"
            class="c-notification-inbox__count"
          >
            {{ view.count }}
          </span>
        </NButton>
      </div>
      <slot name="toolbar" />
    </div>
    <div
      v-if="error"
      role="alert"
      class="c-notification-inbox__state"
    >
      {{ error }}
      <NButton
        text
        size="small"
        :disabled="loading"
        @click="emit('retry')"
      >
        {{ t('common.retry') }}
      </NButton>
    </div>
    <div :aria-busy="loading">
      <ol
        v-if="entries.size"
        role="list"
        :start="offset + 1"
        class="c-notification-inbox__items"
      >
        <li
          v-for="(
            { item, actions: itemActions, badges: itemBadges }, index
          ) in rows"
          :key="item.id"
          :aria-current="selectedId === item.id || undefined"
          class="c-notification-inbox__row"
        >
          <span
            aria-hidden="true"
            class="c-notification-inbox__index"
            >{{ offset + index + 1 }}</span
          >
          <NotificationItem
            :message="item"
            @click="selectItem(item)"
          >
            <template #badges>
              <NTag
                v-for="(badge, badgeIndex) in itemBadges"
                :key="badgeIndex"
                :type="badge.type"
                :bordered="false"
                size="tiny"
                round
                >{{ badge.label }}</NTag
              >
            </template>
            <template #actions>
              <NButton
                v-for="action in itemActions"
                :key="action.key"
                :type="action.type"
                :disabled="loading || pending.has(item.id) || action.disabled"
                size="tiny"
                secondary
                @click="dispatch(action.key, item)"
                >{{ action.label }}</NButton
              >
            </template>
          </NotificationItem>
        </li>
      </ol>
      <div
        v-else-if="loading"
        class="c-notification-inbox__state"
        role="status"
      >
        {{ t('notification.loading') }}
      </div>
      <div
        v-else-if="!error"
        class="c-notification-inbox__state"
      >
        <slot name="empty">{{ emptyText ?? t('notification.empty') }}</slot>
      </div>
    </div>
    <div
      v-if="$slots.footer"
      class="c-notification-inbox__footer"
    >
      <slot name="footer" />
    </div>
  </section>
</template>

<script
  setup
  lang="ts"
  generic="T extends NotificationMessage, V extends string, A extends string"
>
  import { computed, inject, provide } from 'vue'
  import { NButton, NTag } from 'naive-ui'
  import { useComponentTheme } from '../../composables/useComponentTheme'
  import { COMPONENT_LOCALE_KEY } from '../../context'
  import NotificationItem from '../C_NotificationCenter/components/NotificationItem.vue'
  import type { NotificationMessage } from '../C_NotificationCenter/types'
  import type { NotificationInboxEmits, NotificationInboxProps } from './types'
  import { useInboxLocale } from './locale'

  defineOptions({ name: 'C_NotificationInbox' })
  const props = defineProps<NotificationInboxProps<T, V, A>>()
  const emit = defineEmits<NotificationInboxEmits<T, V, A>>()
  const { t } = useInboxLocale(() => props.locale)
  const applicationLocale = inject(COMPONENT_LOCALE_KEY, {})
  const messages = computed(() => ({
    ...applicationLocale.messages,
    ...props.locale?.messages,
  }))
  provide(COMPONENT_LOCALE_KEY, {
    get locale() {
      return props.locale?.locale ?? applicationLocale.locale
    },
    get messages() {
      return messages.value
    },
    get t() {
      return props.locale?.t ?? applicationLocale.t
    },
  })
  const theme = useComponentTheme()
  const pending = computed(() => new Set(props.pendingIds))
  const offset = computed(() =>
    props.startIndex !== undefined && Number.isSafeInteger(props.startIndex)
      ? Math.max(0, props.startIndex)
      : 0
  )
  const entries = computed(
    () =>
      new Map(
        props.items.map(item => [
          item.id,
          {
            item,
            actions: props.actions?.(item),
            badges: props.badges?.(item),
          },
        ])
      )
  )
  const rows = computed(() => [...entries.value.values()])

  function selectView(key: V) {
    if (key === props.activeView) return
    if (props.views.some(view => view.key === key && !view.disabled))
      emit('update:activeView', key)
  }
  function selectItem(item: T) {
    if (entries.value.get(item.id)?.item === item) emit('select', item)
  }
  function dispatch(key: A, item: T) {
    if (props.loading || pending.value.has(item.id)) return
    const entry = entries.value.get(item.id)
    if (
      entry?.item !== item ||
      !entry.actions?.some(action => action.key === key && !action.disabled)
    )
      return
    emit('action', key, item)
  }
</script>

<style scoped lang="scss">
  @use './index.scss';
</style>
