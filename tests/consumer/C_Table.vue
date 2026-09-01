<template>
  <C_Table :crud="crud" />
</template>

<script setup lang="ts">
import {
  C_Table,
  type CrudBinding,
} from '@robot-admin/naive-ui-components'

interface EmployeeRow {
  id: number
  profile: {
    name: string
  }
}

declare const crud: CrudBinding<EmployeeRow>
</script>
