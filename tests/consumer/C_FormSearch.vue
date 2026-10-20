<script setup lang="ts">
  import { ref } from 'vue'
  import {
    C_FormSearch,
    type SearchFormParams,
    type SearchConfig,
    type ComponentDensity,
    type SearchFormItem,
    type FormSearchExpose,
    type FormSearchProps,
  } from '@robot-admin/naive-ui-components/C_FormSearch'

  const query = ref<SearchFormParams>({
    name: '',
    enabled: false,
    roles: ['admin'],
    pageNum: 1,
    pageSize: 10,
  })
  const density: ComponentDensity = 'compact'
  const config: SearchConfig = { density }
  const onReset = (params: SearchFormParams) => {
    query.value = params
  }
  const legacyReset = () => {}

  // 普通业务 interface 无需继承索引类型，查询回调和公开实例保持原模型。
  interface MemberQuery {
    keyword: string
    active: boolean | null
    roles: string[]
  }
  const memberQuery = ref<MemberQuery>({ keyword: '', active: null, roles: [] })
  const memberSearch = ref<FormSearchExpose<MemberQuery>>()
  const memberConfig: SearchConfig<MemberQuery> = {
    onSearch: params => {
      params.keyword.trim()
      params.roles.map(role => role.toUpperCase())
      // 可直接返回请求数据，无需额外 async/await 包装为 Promise<void>。
      return Promise.resolve({ items: [params.keyword] })
    },
  }
  const memberFields: SearchFormItem<MemberQuery>[] = [
    { type: 'input', prop: 'keyword' },
    { type: 'select', prop: 'active', list: [{ label: '停用', value: false }] },
  ]
  const handleMember = (params: MemberQuery) => {
    params.keyword.toUpperCase()
  }
  const badField: SearchFormItem<MemberQuery> = {
    type: 'input',
    // @ts-expect-error 搜索字段与业务模型关联，拒绝错字。
    prop: 'keywrod',
  }
  void badField
  memberSearch.value?.formParams.keyword.trim()
  // @ts-expect-error 具体业务模型不能以空对象假装已提供完整初始值。
  const missingInitial: FormSearchProps<MemberQuery> = {
    formItemList: memberFields,
    config: memberConfig,
  }
  const inspectRequiredModel = () => {
    // @ts-expect-error 泛型参数不能让默认空模型冒充业务数据。
    C_FormSearch<MemberQuery>({
      formItemList: memberFields,
      config: memberConfig,
    })
  }
  void [missingInitial, inspectRequiredModel]

  const badInput: SearchFormItem<{ age: number }> = {
    // @ts-expect-error input 会发布字符串，不能绑定数字模型。
    type: 'input',
    prop: 'age',
  }
  // @ts-expect-error 多选会发布数组，不能绑定标量模型。
  const badMultiple: SearchFormItem<{ role: string | null }> = {
    type: 'select',
    prop: 'role',
    attrs: { multiple: true },
  }
  // @ts-expect-error 可清空单选模型必须容纳 null。
  const badClearable: SearchFormItem<{ enabled: boolean }> = {
    type: 'select',
    prop: 'enabled',
  }
  const badDate: SearchFormItem<{ period: [number, number] }> = {
    // @ts-expect-error 日期范围的清空值为 null。
    type: 'date-range',
    prop: 'period',
  }
  // @ts-expect-error 初始化默认值也必须符合所选业务字段。
  const badDefault: SearchFormItem<MemberQuery> = {
    type: 'select',
    prop: 'active',
    defaultValue: 'wrong',
  }
  // @ts-expect-error 选项值必须符合业务模型。
  const badOption: SearchFormItem<MemberQuery> = {
    type: 'select',
    prop: 'active',
    list: [{ label: 'wrong', value: 'wrong' }],
  }
  const requiredSelect: SearchFormItem<{ enabled: boolean }> = {
    type: 'select',
    prop: 'enabled',
    attrs: { clearable: false },
    defaultValue: false,
    list: [{ label: '停用', value: false }],
  }
  void [
    badInput,
    badMultiple,
    badClearable,
    badDate,
    badDefault,
    badOption,
    requiredSelect,
  ]
</script>

<template>
  <C_FormSearch
    v-model="query"
    :form-item-list="[
      { type: 'input', prop: 'name' },
      {
        type: 'select',
        prop: 'enabled',
        list: [{ label: '停用', value: false }],
      },
      {
        type: 'select',
        prop: 'roles',
        attrs: { multiple: true },
        list: [{ label: '管理员', value: 'admin' }],
      },
    ]"
    :config="config"
    @reset="onReset"
  />
  <C_FormSearch
    ref="memberSearch"
    class="member-search"
    :style="{ minWidth: '12rem' }"
    :key="'member-search'"
    v-model="memberQuery"
    :form-item-list="memberFields"
    :config="memberConfig"
    @search="handleMember"
    @reset="handleMember"
    @change-params="handleMember"
  />
  <C_FormSearch
    :form-params="query"
    :form-item-list="[]"
    @reset="legacyReset"
  />
  <C_FormSearch :form-item-list="[{ type: 'input', prop: 'dynamic' }]" />
  <C_FormSearch
    :form-params="memberQuery"
    :form-item-list="memberFields"
    @reset="handleMember"
  />
  <!-- @vue-expect-error 从回调推导具体业务模型时也必须提供初始值。 -->
  <C_FormSearch
    :form-item-list="memberFields"
    :config="memberConfig"
    @reset="handleMember"
  />
</template>
