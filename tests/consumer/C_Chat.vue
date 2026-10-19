<script setup lang="ts">
  import {
    C_Chat,
    type ChatMessage,
    type ChatProps,
  } from '@robot-admin/naive-ui-components/C_Chat'
  const messages: ChatMessage[] = [
    {
      id: 'hello',
      type: 'text',
      sender: 'other',
      content: 'Hello',
      timestamp: Date.now(),
    },
  ]
  const config: ChatProps = {
    messages,
    showContacts: false,
    virtualScroll: false,
  }
  function handleImage(url: string) {
    void url
  }
  function handleFile(message: ChatMessage) {
    void message.id
  }
</script>
<template>
  <C_Chat
    v-bind="config"
    @image-preview="handleImage"
    @file-click="handleFile"
    @resend="handleFile"
  />
  <C_Chat
    :messages="messages"
    :show-contacts="false"
  />
</template>
