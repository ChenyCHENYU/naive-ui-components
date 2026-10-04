<script setup lang="ts">
  import { ref } from 'vue'
  import { C_Login } from '@robot-admin/naive-ui-components/C_Login'
  const account = ref('')
</script>

<template>
  <C_Login
    :submit-disabled="!account"
    @username-change="account = $event"
  >
    <template #password-fields="{ username, loading }">
      <span :aria-busy="loading">{{ username }}</span>
    </template>
  </C_Login>
</template>
