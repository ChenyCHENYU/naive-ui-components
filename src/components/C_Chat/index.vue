<!--
 * @Description: C_Chat — 通用聊天组件
 *
 * 支持联系人列表 + 消息气泡 + 输入框，可用于 IM、客服、AI 对话等场景。
 * 通过 CSS 变量可完全自定义主题风格。
 *
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
-->
<template>
  <div class="c-chat">
    <!-- ===== 联系人侧栏 ===== -->
    <aside
      v-if="mergedProps.showContacts && contactList.length"
      class="c-chat__sidebar"
    >
      <div class="c-chat__sidebar-header">
        <C_Icon
          name="mdi:chat-outline"
          :size="20"
        />
        {{ t('chat.sessions') }}
      </div>

      <!-- 搜索框 -->
      <div class="c-chat__search">
        <NInput
          v-model:value="searchKeyword"
          :placeholder="t('chat.search')"
          clearable
          size="small"
        >
          <template #prefix>
            <C_Icon
              name="mdi:magnify"
              :size="16"
            />
          </template>
        </NInput>
      </div>

      <VVirtualList
        v-if="virtualContacts"
        class="c-chat__contact-list"
        :items="filteredContacts"
        key-field="id"
        :item-size="56"
        item-resizable
      >
        <template #default="{ index }">
          <ChatContactItem
            :contact="filteredContacts[index]"
            :active="filteredContacts[index].id === currentId"
            @select="handleSelectContact"
          />
        </template>
      </VVirtualList>
      <div
        v-else
        class="c-chat__contact-list"
      >
        <ChatContactItem
          v-for="contact in filteredContacts"
          :key="contact.id"
          :contact="contact"
          :active="contact.id === currentId"
          @select="handleSelectContact"
        />
      </div>
    </aside>

    <!-- ===== 主聊天区域 ===== -->
    <div
      v-if="currentContact || !mergedProps.showContacts"
      class="c-chat__main"
    >
      <!-- 顶栏 -->
      <div class="c-chat__header">
        <slot name="header">
          <span>{{ currentContact?.name || mergedProps.title }}</span>
          <span
            v-if="currentContact?.online"
            class="c-chat__header-status"
          >
            {{ t('chat.online') }}
          </span>
        </slot>
      </div>

      <VVirtualList
        v-if="virtualMessages"
        :key="currentId"
        ref="virtualMessagesRef"
        class="c-chat__messages c-chat__messages--virtual"
        :items="messageList"
        key-field="id"
        :item-size="32"
        item-resizable
        :padding-top="16"
        :padding-bottom="16"
        :items-style="{ paddingLeft: '20px', paddingRight: '20px' }"
        @scroll="handleMessagesScroll"
        @wheel="handleScrollIntent"
        @pointerdown="handleScrollIntent"
        @keydown="handleScrollIntent"
      >
        <template #default="{ index }">
          <div>
            <div
              v-if="index === 0 && mergedProps.loadingHistory"
              class="c-chat__load-more"
              ><NSpin size="small"
            /></div>
            <ChatMessageItem
              :msg="messageList[index]"
              :previous="messageList[index - 1]"
              :self-avatar="selfAvatar"
              :self-name="selfName"
              :show-timestamp="mergedProps.showTimestamp"
              @image-preview="emit('image-preview', $event)"
              @file-click="emit('file-click', $event)"
              @resend="emit('resend', $event)"
            />
          </div>
        </template>
      </VVirtualList>
      <div
        v-else
        ref="messagesRef"
        class="c-chat__messages"
        @scroll="handleMessagesScroll"
        @wheel="handleScrollIntent"
        @pointerdown="handleScrollIntent"
        @keydown="handleScrollIntent"
      >
        <div class="c-chat__message-items">
          <div
            v-if="mergedProps.loadingHistory"
            class="c-chat__load-more"
            ><NSpin size="small"
          /></div>
          <div
            v-if="!messageList.length && !mergedProps.loadingHistory"
            class="c-chat__empty"
            >{{ t('chat.empty') }}</div
          >
          <ChatMessageItem
            v-for="(msg, index) in messageList"
            :key="msg.id"
            :msg="msg"
            :previous="messageList[index - 1]"
            :self-avatar="selfAvatar"
            :self-name="selfName"
            :show-timestamp="mergedProps.showTimestamp"
            @image-preview="emit('image-preview', $event)"
            @file-click="emit('file-click', $event)"
            @resend="emit('resend', $event)"
          />
        </div>
      </div>

      <!-- 输入区域 -->
      <div class="c-chat__input-area">
        <div class="c-chat__input-actions">
          <slot name="input-actions">
            <NButton
              quaternary
              circle
              size="small"
              :aria-label="t('chat.emoji')"
              @click="emit('emoji-click')"
            >
              <template #icon>
                <C_Icon
                  name="mdi:emoticon-happy-outline"
                  :size="18"
                />
              </template>
            </NButton>
            <NButton
              quaternary
              circle
              size="small"
              :aria-label="t('chat.attach')"
              @click="emit('file-upload')"
            >
              <template #icon>
                <C_Icon
                  name="mdi:paperclip"
                  :size="18"
                />
              </template>
            </NButton>
          </slot>
        </div>

        <div class="c-chat__input-wrap">
          <NInput
            v-model:value="inputText"
            :placeholder="mergedProps.placeholder"
            type="textarea"
            :autosize="{ minRows: 1, maxRows: 4 }"
            @keydown.enter.exact="handleSend"
          />
        </div>

        <NButton
          v-if="mergedProps.showSendBtn"
          type="primary"
          :disabled="!inputText.trim()"
          class="c-chat__send-btn"
          :aria-label="t('chat.send')"
          @click="handleSend"
        >
          <template #icon>
            <C_Icon
              name="mdi:send"
              :size="16"
            />
          </template>
        </NButton>
      </div>
    </div>

    <!-- ===== 未选中联系人空态 ===== -->
    <div
      v-else
      class="c-chat__main c-chat__no-chat"
    >
      <C_Icon
        name="mdi:chat-processing-outline"
        :size="48"
        class="c-chat__no-chat-icon"
      />
      <span>{{ t('chat.choose') }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { useComponentLocale } from '../../config'
  import { computed, ref, watch } from 'vue'
  import { VVirtualList, type VirtualListInst } from 'vueuc'
  import ChatMessageItem from './components/ChatMessageItem.vue'
  import ChatContactItem from './components/ChatContactItem.vue'
  import { useChatScroll } from './composables/useChatScroll'
  import C_Icon from '../C_Icon/index.vue'
  import {
    DEFAULT_CHAT_PROPS,
    type ChatProps,
    type ChatMessage,
    type ChatContact,
  } from './types'

  // ===== Props & Emits =====
  const { t } = useComponentLocale()
  const props = withDefaults(defineProps<ChatProps>(), {
    contacts: () => [],
    messages: () => [],
    currentContactId: '',
    showContacts: DEFAULT_CHAT_PROPS.showContacts,
    showTimestamp: DEFAULT_CHAT_PROPS.showTimestamp,
    showSendBtn: DEFAULT_CHAT_PROPS.showSendBtn,
    loadingHistory: DEFAULT_CHAT_PROPS.loadingHistory,
    selfAvatar: '',
    selfName: '',
    virtualScroll: true,
  })

  const emit = defineEmits<{
    (e: 'send', content: string): void
    (e: 'select-contact', id: string): void
    (e: 'load-more'): void
    (e: 'image-preview', url: string): void
    (e: 'file-click', msg: ChatMessage): void
    (e: 'file-upload'): void
    (e: 'emoji-click'): void
    (e: 'resend', msg: ChatMessage): void
  }>()

  // ===== 合并 Props =====
  const mergedProps = computed(() => ({
    ...DEFAULT_CHAT_PROPS,
    ...props,
    placeholder: props.placeholder ?? t('chat.placeholder'),
    title: props.title ?? t('chat.title'),
  }))

  // ===== 内部状态 =====
  const inputText = ref('')
  const searchKeyword = ref('')
  const messagesRef = ref<HTMLElement | null>(null)
  const virtualMessagesRef = ref<VirtualListInst | null>(null)

  // ===== 计算属性 =====
  const contactList = computed<ChatContact[]>(() => props.contacts ?? [])
  const messageList = computed<ChatMessage[]>(() => props.messages ?? [])

  const currentId = computed(
    () => props.currentContactId || contactList.value[0]?.id || ''
  )

  // 草稿属于会话；移除的联系人与空草稿及时释放，缓存最多保留最近 50 个会话。
  const drafts = new Map<string, string>()
  watch(
    currentId,
    (id, previous) => {
      const text = inputText.value
      const targetDraft = drafts.get(id) ?? ''
      drafts.delete(id)
      drafts.delete(previous)
      if (
        text &&
        (props.contacts?.some(contact => contact.id === previous) ||
          !props.showContacts)
      )
        drafts.set(previous, text)
      while (drafts.size > 50) drafts.delete(drafts.keys().next().value!)
      inputText.value = targetDraft
    },
    { flush: 'sync' }
  )
  watch(
    () => props.contacts?.map(contact => contact.id),
    ids => {
      if (!props.showContacts) return
      const present = new Set(ids)
      if (!present.has(currentId.value)) inputText.value = ''
      for (const id of drafts.keys()) if (!present.has(id)) drafts.delete(id)
    }
  )

  const currentContact = computed(() =>
    contactList.value.find(c => c.id === currentId.value)
  )

  const filteredContacts = computed(() => {
    if (!searchKeyword.value) return contactList.value
    const kw = searchKeyword.value.toLowerCase()
    return contactList.value.filter(c => c.name.toLowerCase().includes(kw))
  })

  const virtualMessages = computed(
    () => props.virtualScroll && messageList.value.length >= 200
  )
  const virtualContacts = computed(
    () => props.virtualScroll && filteredContacts.value.length >= 100
  )

  // ===== 方法 =====
  const handleSelectContact = (id: string) => {
    emit('select-contact', id)
  }

  const handleSend = (event?: KeyboardEvent | MouseEvent) => {
    if (
      event instanceof KeyboardEvent &&
      (event.isComposing || event.keyCode === 229)
    )
      return
    event?.preventDefault()
    const text = inputText.value.trim()
    if (!text) return
    emit('send', text)
    inputText.value = ''
  }

  const { scrollToBottom, handleMessagesScroll, handleScrollIntent } =
    useChatScroll({
      messages: messageList,
      contactId: currentId,
      virtual: virtualMessages,
      loadingHistory: computed(() => mergedProps.value.loadingHistory),
      normalRef: messagesRef,
      virtualRef: virtualMessagesRef,
      onLoadMore: () => emit('load-more'),
    })

  // ===== 暴露方法 =====
  defineExpose({ scrollToBottom })
</script>

<style scoped lang="scss">
  @use './index.scss';
</style>
