<template>
  <C_Form
    v-model="model"
    :options="options"
    :config="config"
    @submit="handleSubmit"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  C_Form,
  defineFormConfig,
  defineFormOptions,
  type SubmitEventPayload,
} from '@robot-admin/naive-ui-components'

interface EmployeeForm {
  id: string
  profile: {
    name: string
  }
}

const model = ref<EmployeeForm>({
  id: '',
  profile: { name: '' },
})

const options = defineFormOptions<EmployeeForm>([
  { type: 'input', prop: 'id' },
  { type: 'input', prop: 'profile.name' },
])

const config = defineFormConfig<EmployeeForm>({
  onSubmit: payload => {
    payload.model.profile.name.toUpperCase()
  },
})

const handleSubmit = (payload: SubmitEventPayload<EmployeeForm>): void => {
  payload.model.id.toUpperCase()
}
</script>
