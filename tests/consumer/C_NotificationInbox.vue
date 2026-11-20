<script setup lang="ts">
  import { ref } from 'vue'
  import { C_NotificationInbox } from '@robot-admin/naive-ui-components/C_NotificationInbox'
  import type { NotificationMessage } from '@robot-admin/naive-ui-components/C_NotificationCenter'

  const views = [
    { key: 'todo', label: 'To do' },
    { key: 'done', label: 'Done' },
  ] as const
  const activeView = ref<(typeof views)[number]['key']>('todo')
  const items: (NotificationMessage & { taskReference: number })[] = []
  function complete(key: 'complete', id: number) {
    void key
    void id
  }
</script>

<template>
  <C_NotificationInbox
    v-model:active-view="activeView"
    :views="views"
    :items="items"
    :actions="
      item => [{ key: 'complete' as const, label: String(item.taskReference) }]
    "
    @action="(key, item) => complete(key, item.taskReference)"
  />
</template>
