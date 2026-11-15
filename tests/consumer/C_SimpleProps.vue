<script setup lang="ts">
  import {
    C_Barcode,
    C_Progress,
    C_Steps,
    C_Code,
    C_Editor,
    C_Markdown,
    type BarcodeProps,
    type ProgressProps,
    type StepsProps,
    type CodeProps,
    type EditorProps,
    type MarkdownProps,
  } from '@robot-admin/naive-ui-components'
  import type { BarcodeProps as BarcodeInput } from '@robot-admin/naive-ui-components/C_Barcode'
  import type { ProgressProps as ProgressInput } from '@robot-admin/naive-ui-components/C_Progress'
  import type { StepsProps as StepsInput } from '@robot-admin/naive-ui-components/C_Steps'
  import type { CodeProps as CodeInput } from '@robot-admin/naive-ui-components/C_Code'
  import type { EditorProps as EditorInput } from '@robot-admin/naive-ui-components/C_Editor'
  import type { MarkdownProps as MarkdownInput } from '@robot-admin/naive-ui-components/C_Markdown'

  const barcode = { value: '12345', format: 'CODE128' } satisfies BarcodeProps
  const progress = {
    percentage: 12.5,
    isAnimation: true,
  } satisfies ProgressProps
  const steps = {
    steps: [{ title: 'Start' }, { title: 'Confirm' }] as const,
  } satisfies StepsProps
  const code = {
    code: 'const value = 1',
    language: 'typescript',
  } satisfies CodeProps
  const editor = {
    modelValue: '<p>Text</p>',
    readonly: false,
  } satisfies EditorProps
  const markdown = {
    modelValue: '# Text',
    mode: 'preview',
  } satisfies MarkdownProps
  const subpaths: [
    BarcodeInput,
    ProgressInput,
    StepsInput,
    CodeInput,
    EditorInput,
    MarkdownInput,
  ] = [barcode, progress, steps, code, editor, markdown]
  void subpaths
  // @ts-expect-error Public props preserve the actual percentage value type.
  const invalidProgress: ProgressProps = { percentage: '12.5' }
  // @ts-expect-error Public props preserve the supported editor mode.
  const invalidMarkdown: MarkdownProps = { mode: 'source-only' }
  void invalidProgress
  void invalidMarkdown
</script>

<template>
  <C_Barcode v-bind="barcode" />
  <C_Progress v-bind="progress" />
  <C_Steps v-bind="steps" />
  <C_Code v-bind="code" />
  <C_Editor v-bind="editor" />
  <C_Markdown v-bind="markdown" />
</template>
