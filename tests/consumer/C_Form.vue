<template>
  <C_Form
    v-model="model"
    :options="options"
    :config="config"
    @submit="handleSubmit"
  >
    <template #action-extra="{ model: draft, submitting }">
      <button :disabled="submitting">{{
        draft.profile.name.toUpperCase()
      }}</button>
    </template>
    <template #tab-actions="{ currentTab, validateTab }">
      <button @click="validateTab">{{ currentTab.toUpperCase() }}</button>
    </template>
    <template #step-actions="{ currentStep, goToStep, submit, submitting }">
      <button
        :disabled="submitting"
        @click="goToStep(currentStep + 1)"
        >{{ currentStep }}</button
      >
      <button
        :disabled="submitting"
        @click="submit"
        >Submit</button
      >
    </template>
  </C_Form>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import {
    C_Form,
    defineFormConfig,
    defineFormOptions,
    PRESET_RULES,
    SPEC_RULES,
    type SubmitEventPayload,
  } from '@robot-admin/naive-ui-components/C_Form'

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
    {
      type: 'input',
      prop: 'id',
      rules: [PRESET_RULES.optional(PRESET_RULES.email('邮箱'))],
    },
    {
      type: 'input',
      prop: 'profile.name',
      rules: [PRESET_RULES.required('名称'), SPEC_RULES.length('名称', 2, 20)],
    },
  ])

  const config = defineFormConfig<EmployeeForm>({
    submitSuccessText: 'Saved',
    onSubmit: (payload, context) => {
      payload.model.profile.name.toUpperCase()
      context?.signal.throwIfAborted()
    },
  })

  const handleSubmit = (payload: SubmitEventPayload<EmployeeForm>): void => {
    payload.model.id.toUpperCase()
  }
</script>
