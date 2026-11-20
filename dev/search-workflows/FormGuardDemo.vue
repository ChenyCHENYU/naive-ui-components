<script setup lang="ts">
  import { ref, shallowRef } from 'vue'
  import { NModal } from 'naive-ui'
  import type { FormOption } from '@robot-admin/naive-ui-components/C_Form'
  import {
    C_FormModal,
    type FormModalBeforeCloseContext,
    type FormModalEditor,
  } from '@robot-admin/naive-ui-components/C_FormModal'
  import '@robot-admin/naive-ui-components/C_FormModal/style.css'

  interface Draft {
    note: string
  }

  const savedNote = ref('按计划装车')
  const visible = ref(false)
  const model = ref<Draft | null>(null)
  const options: FormOption<Draft>[] = [
    { prop: 'note', type: 'input', label: '发运备注' },
  ]
  const editor: FormModalEditor<Draft> = {
    visible,
    model,
    title: ref('编辑发运备注'),
    mode: ref('edit'),
    loading: ref(false),
    setModel(draft) {
      model.value = draft
    },
    close() {
      visible.value = false
      model.value = null
    },
    async submit(draft) {
      if (!draft) return false
      savedNote.value = draft.note
      editor.close()
      return true
    },
  }

  function open() {
    model.value = { note: savedNote.value }
    visible.value = true
  }

  const confirm = shallowRef<(discard: boolean) => void>()
  function beforeClose({ signal }: FormModalBeforeCloseContext) {
    return new Promise<boolean>(resolve => {
      const settle = (discard: boolean) => {
        signal.removeEventListener('abort', cancel)
        confirm.value = undefined
        resolve(discard)
      }
      const cancel = () => settle(false)
      confirm.value = settle
      signal.addEventListener('abort', cancel, { once: true })
    })
  }
</script>

<template>
  <section>
    <h2>发运备注</h2>
    <button
      type="button"
      @click="open"
      >编辑发运备注</button
    >
    <C_FormModal
      :editor="editor"
      :options="options"
      :before-close="beforeClose"
    />
    <NModal
      :show="Boolean(confirm)"
      preset="dialog"
      type="warning"
      title="放弃未保存修改？"
      aria-label="放弃未保存修改？"
      content="关闭后，本次发运备注的修改会丢失。"
      negative-text="继续编辑"
      positive-text="放弃修改"
      @negative-click="confirm?.(false)"
      @positive-click="confirm?.(true)"
      @update:show="!$event && confirm?.(false)"
    />
  </section>
</template>
