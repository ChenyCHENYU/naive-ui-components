<script setup lang="ts">
  import { ref } from 'vue'
  import {
    NConfigProvider,
    NMessageProvider,
    NButton,
    NSwitch,
    darkTheme,
    zhCN,
    dateZhCN,
  } from 'naive-ui'
  import { C_Tree } from '@robot-admin/naive-ui-components/C_Tree'
  import { C_Table } from '@robot-admin/naive-ui-components/C_Table'
  import { C_Select } from '@robot-admin/naive-ui-components/C_Select'
  import { C_FormSearch } from '@robot-admin/naive-ui-components/C_FormSearch'
  import { C_GlobalSearch } from '@robot-admin/naive-ui-components/C_GlobalSearch'
  import {
    C_Timeline,
    type TimelineItem,
  } from '@robot-admin/naive-ui-components/C_Timeline'
  import { C_Progress } from '@robot-admin/naive-ui-components/C_Progress'
  import { useContractDemo } from './contracts-data'
  import '@robot-admin/naive-ui-components/C_Tree/style.css'
  import '@robot-admin/naive-ui-components/C_Table/style.css'
  import '@robot-admin/naive-ui-components/C_Select/style.css'
  import '@robot-admin/naive-ui-components/C_FormSearch/style.css'
  import '@robot-admin/naive-ui-components/C_GlobalSearch/style.css'
  import '@robot-admin/naive-ui-components/C_Timeline/style.css'
  import './style.css'
  import './contracts.css'
  defineOptions({ name: 'ContractWorkflows' })
  const percentage = ref(12.5)
  const timelineItems = ref<TimelineItem[]>([
    {
      id: 'contract',
      title: '显示契约',
      content:
        '<strong class="safe-body">净化后的内容</strong><a href="javascript:void(0)" onclick="window.__timelineUnsafe = true">链接</a><script>window.__timelineUnsafe = true</' +
        'script>',
      tags: [{ text: '已校验', type: 'success' }],
    },
  ])
  function updateDisplay() {
    percentage.value = 24.125
    timelineItems.value[0].content =
      '<strong class="safe-body">更新后的内容</strong><a onclick="window.__timelineUnsafe = true">链接</a>'
    timelineItems.value[0].tags = [{ text: '需关注', type: 'warning' }]
  }
  const openedMenu = ref('尚未选择菜单')
  const demo = useContractDemo()
  const {
    dark,
    compact,
    density,
    tree,
    roots,
    pattern,
    selected,
    expanded,
    source,
    failNext,
    scope,
    switchScope,
    choice,
    choices,
    chosen,
    query,
    search,
    fields,
    applied,
    apply,
    rows,
    columns,
  } = demo
  const menus = [
    {
      key: '/sale/order',
      label: '订单管理',
      breadcrumb: '销售管理',
      keywords: ['xsdd'],
    },
    { key: '/produce/material', label: '物料管理', breadcrumb: '生产管理' },
  ]
</script>

<template>
  <NConfigProvider
    :theme="dark ? darkTheme : null"
    :locale="zhCN"
    :date-locale="dateZhCN"
  >
    <NMessageProvider>
      <main
        class="workflows"
        :class="{ dark }"
        ><div class="workspace">
          <header class="page-header"
            ><div
              ><span class="eyebrow">COMPONENT CONTRACTS</span
              ><h1>配置轻一点，能力深一层。</h1
              ><p
                >组件库独立演示 · 远程树、分组选择、查询偏好与表格编辑。</p
              ></div
            >
            <div class="preferences"
              ><label
                >紧凑
                <NSwitch
                  v-model:value="compact"
                  aria-label="紧凑密度" /></label
              ><label
                >深色
                <NSwitch
                  v-model:value="dark"
                  aria-label="深色主题" /></label
            ></div>
          </header>
          <section class="contract-card"
            ><div class="contract-heading"
              ><div
                ><h2>远程树工作台</h2
                ><p
                  >输入“水泵”或“轴承”，查找尚未加载的节点；清空后展开分支，完整子项仍可加载。</p
                ></div
              ><div class="contract-actions"
                ><NButton
                  size="small"
                  @click="failNext = true"
                  >下次查询失败</NButton
                ><NButton
                  size="small"
                  @click="tree?.locate(22)"
                  >定位备用轴承</NButton
                ><NButton
                  size="small"
                  @click="switchScope"
                  >切换范围</NButton
                ></div
              ></div
            >
            <C_Tree
              ref="tree"
              v-model:search-pattern="pattern"
              v-model:expanded-keys="expanded"
              v-model:selected-keys="selected"
              :data="roots"
              :search-source="source"
              key-field="id"
              label-field="title"
              children-field="nodes"
              :density="density"
              :addable="false"
              :refreshable="false"
              checkable
              cascade
              virtual-scroll
              show-line
              style="height: 380px"
            />
            <div class="contract-output"
              >范围 {{ scope }} · 已选 {{ selected.join(', ') || '无' }} ·
              传入根节点仍为 {{ roots.length }} 项</div
            >
          </section>
          <div class="contract-grid"
            ><section class="contract-card"
              ><h2>分组选项</h2
              ><p>组内 false 与数字 0 保持原始类型，选择事件返回原始叶项。</p
              ><C_Select
                v-model="choice"
                :options="choices"
                :density="density"
                placeholder="选择组内选项"
                @select="chosen = JSON.stringify($event)"
              /><div class="contract-output"
                >{{ typeof choice }}: {{ JSON.stringify(choice) }}<br />{{
                  chosen
                }}</div
              ></section
            >
            <section class="contract-card"
              ><h2>菜单搜索</h2
              ><p
                >可选 tokens 模式支持“销售
                订单”、额外关键词“xsdd”，保留原有默认搜索规则。</p
              ><C_GlobalSearch
                :options="{
                  menuItems: () => menus,
                  matchMode: 'tokens',
                  isDark: () => dark,
                  storageKey: 'contracts-menu',
                  onSelect: key => (openedMenu = key),
                }"
              /><div class="contract-output">{{ openedMenu }}</div></section
            ></div
          >
          <section class="contract-card"
            ><h2>查询字段按需显示</h2
            ><p
              >“查询字段”可选择额外条件；物料为锁定字段。树选择和级联直接声明，偏好按范围隔离。</p
            ><C_FormSearch
              v-model="query"
              ref="search"
              :form-item-list="fields"
              :config="{
                density,
                layout: 'grid',
                columns: 3,
                fieldSettings: {
                  persistKey: 'contracts-search-fields',
                  scope,
                  defaultVisibleKeys: ['name', 'warehouse'],
                  lockedKeys: ['name'],
                },
                onSearch: apply,
              }"
            /><div class="contract-output"
              >已应用 {{ JSON.stringify(applied) }}</div
            ></section
          >
          <section class="contract-card"
            ><h2>分组表头与行级编辑</h2
            ><p
              >第一行可编辑数量及远程供应商；第二行按业务状态锁定。普通列设置保持叶项语义。</p
            ><C_Table
              v-model:data="rows"
              :columns="columns"
              row-key="id"
              :config="{
                density,
                edit: { mode: 'cell', showRowActions: false },
                pagination: false,
              }"
          /></section>
          <section
            class="contract-card"
            data-testid="display-contracts"
          >
            <h2>动画精度与内容更新</h2>
            <C_Progress
              :percentage="percentage"
              is-animation
              :time="80"
            />
            <C_Timeline :items="timelineItems" />
            <NButton @click="updateDisplay">更新显示数据</NButton>
          </section>
          <footer class="contract-footer"
            ><a href="./index.html">返回搜索与实体选择演示</a></footer
          >
        </div></main
      >
    </NMessageProvider>
  </NConfigProvider>
</template>
