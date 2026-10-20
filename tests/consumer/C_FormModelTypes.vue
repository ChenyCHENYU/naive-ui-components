<script setup lang="ts">
  import { ref } from 'vue'
  import {
    C_Form,
    defineFormOptions,
    useCForm,
    type FormOption,
  } from '@robot-admin/naive-ui-components/C_Form'

  interface Department {
    name: string
    count: number
    parent?: Department
    children?: Department[]
  }
  const initialValues: Department = { name: '', count: 0, children: [] }
  const options = defineFormOptions<Department>([
    {
      type: 'input',
      prop: 'name',
      value: '',
      valueWhen: model => model.name.trim(),
    },
    {
      type: 'inputNumber',
      prop: 'count',
      value: 0,
      valueWhen: model => model.count + 1,
    },
    { type: 'input', prop: 'children.0.name', value: '' },
    { type: 'custom-field', prop: 'parent.name', value: '' },
  ])
  const { model, formRef, bindings } = useCForm({ initialValues, options })
  const number: number = model.value.count
  void number
  void formRef.value?.setFieldValue('children.0.name', 'Engineering')

  // @ts-expect-error 数字字段初值不能变成字符串。
  const badInitial: FormOption<Department> = {
    type: 'inputNumber',
    prop: 'count',
    value: 'wrong',
  }
  // @ts-expect-error 数字字段联动函数必须返回数字。
  const badDerived: FormOption<Department> = {
    type: 'inputNumber',
    prop: 'count',
    valueWhen: () => 'wrong',
  }
  const badField: FormOption<Department> = {
    type: 'input',
    // @ts-expect-error 即使模型递归，也不能接受拼错的字段。
    prop: 'children.0.nmae',
  }
  // 动态模型和自定义控件继续兼容未知数据。
  const dynamic: FormOption = {
    type: 'application-control',
    prop: 'custom',
    value: { arbitrary: true },
  }
  const dynamicModel = ref({})
  const dynamicOptions: FormOption[] = [dynamic]
  void [badInitial, badDerived, badField, dynamic]
</script>
<template>
  <C_Form
    ref="formRef"
    v-bind="bindings"
  />
  <C_Form
    v-model="dynamicModel"
    :options="dynamicOptions"
  />
</template>
