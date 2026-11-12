<script setup lang="ts">
  import { ref } from 'vue'
  import {
    C_Form,
    createSelectField,
    createAutoCompleteField,
    type FormOption,
  } from '@robot-admin/naive-ui-components/C_Form'
  import {
    C_FormSearch,
    type SearchFormItem,
  } from '@robot-admin/naive-ui-components/C_FormSearch'
  import { createDataPickerField } from '@robot-admin/naive-ui-components/C_DataPicker'
  import type { OptionSource } from '@robot-admin/naive-ui-components/C_Select'

  interface Location {
    id: number
    code: string
    address: string
  }
  interface Model {
    warehouse: string
    location: number | null
    text: string
    address: string
  }
  const model = ref<Model>({
    warehouse: 'A',
    location: null,
    text: '',
    address: '',
  })
  const locations: OptionSource<Location, number, { warehouse: string }> = {
    request: async ({ search, filters, signal }) => ({
      rows: signal.aborted
        ? []
        : [
            {
              id: 0,
              code: `${filters?.warehouse ?? ''}${search}`,
              address: '仓库',
            },
          ],
      total: 1,
    }),
    value: row => row.id,
    label: row => row.code,
  }
  const fields: FormOption<Model>[] = [
    { type: 'input', prop: 'warehouse' },
    {
      type: 'select',
      prop: 'location',
      source: values => ({
        ...locations,
        filters: { warehouse: values.warehouse },
      }),
    },
    { type: 'autocomplete', prop: 'text', source: locations },
  ]
  const searchFields: SearchFormItem<Model>[] = [
    {
      type: 'select',
      prop: 'location',
      source: values => ({
        ...locations,
        filters: { warehouse: values.warehouse },
      }),
    },
    { type: 'autocomplete', prop: 'text', source: locations },
  ]
  const renderers = {
    location: createSelectField({
      source: locations,
      onSelect: row => {
        model.value.address = row?.address ?? ''
        // @ts-expect-error The selected row is Location.
        void row?.missing
      },
    }),
    suggestion: createAutoCompleteField({
      source: locations,
      onSelect: row => {
        model.value.location = row.id
        model.value.address = row.address
        // @ts-expect-error The selected row is Location.
        void row.missing
      },
    }),
  }
  createSelectField({
    source: locations,
    multiple: true,
    onSelect: rows => rows.map(row => row.address),
  })
  createSelectField({
    source: locations,
    // @ts-expect-error A callback cannot change the source record type.
    onSelect: (row: { other: string } | null) => {
      void row?.other
    },
  })
  createAutoCompleteField({
    source: locations,
    // @ts-expect-error A callback cannot change the source record type.
    onSelect: (row: { other: string }) => {
      void row.other
    },
  })
  createDataPickerField({
    source: { ...locations, rowKey: 'id' },
    columns: [],
    onSelect: rows => rows.map(row => row.address),
    'onUpdate:modelValue': value => String(value),
    presentation: 'popover',
  })
  createDataPickerField({
    source: { ...locations, rowKey: 'id' },
    columns: [],
    // @ts-expect-error A picker callback receives Location records.
    onSelect: (rows: Array<{ other: string }>) => rows.map(row => row.other),
  })
</script>

<template>
  <C_Form
    v-model="model"
    :options="fields"
    :renderers="renderers"
  />
  <C_FormSearch
    v-model="model"
    :form-item-list="searchFields"
  />
</template>
