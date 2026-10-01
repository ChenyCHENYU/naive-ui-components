<template>
  <C_Icon name="mdi:home" />
  <C_Icon
    :name="CustomIcon"
    type="component"
  />
</template>

<script setup lang="ts">
  import { defineComponent } from 'vue'
  import {
    C_Icon,
    type IconProps,
  } from '@robot-admin/naive-ui-components/C_Icon'

  const CustomIcon = defineComponent({ render: () => null })
  const icon: IconProps = { name: 'mdi:home' }
  void icon
</script>
