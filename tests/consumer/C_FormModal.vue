<template>
  <C_FormModal
    :editor="editor"
    :options="options"
    :config="config"
  />
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue'
  import {
    C_FormModal,
    defineFormConfig,
    defineFormOptions,
    type FormModalEditor,
  } from '@robot-admin/naive-ui-components'

  interface RecordForm {
    id: string
    name: string
  }

  const model = ref<RecordForm | null>(null)
  const editor: FormModalEditor<RecordForm> = {
    visible: ref(false),
    mode: ref('create'),
    model,
    title: ref('Create record'),
    loading: computed(() => false),
    setModel: value => {
      model.value = value
    },
    close: () => undefined,
    submit: async () => true,
  }
  const options = defineFormOptions<RecordForm>([
    { type: 'input', prop: 'name', label: 'Name' },
  ])
  const config = defineFormConfig<RecordForm>({ layout: 'grid' })
</script>
