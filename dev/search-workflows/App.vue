<script setup lang="ts">
  import {
    NConfigProvider,
    NMessageProvider,
    NButton,
    NSwitch,
    darkTheme,
    zhCN,
    dateZhCN,
  } from 'naive-ui'
  import { C_Select } from '@robot-admin/naive-ui-components/C_Select'
  import { C_AutoComplete } from '@robot-admin/naive-ui-components/C_AutoComplete'
  import { C_DataPicker } from '@robot-admin/naive-ui-components/C_DataPicker'
  import { C_FormSearch } from '@robot-admin/naive-ui-components/C_FormSearch'
  import { useSearchWorkflows } from './data'
  import '@robot-admin/naive-ui-components/C_Select/style.css'
  import '@robot-admin/naive-ui-components/C_AutoComplete/style.css'
  import '@robot-admin/naive-ui-components/C_DataPicker/style.css'
  import '@robot-admin/naive-ui-components/C_FormSearch/style.css'
  import './style.css'

  const {
    dark,
    compact,
    density,
    failNext,
    unavailable,
    materialId,
    selectedMaterial,
    remark,
    customerText,
    selectedCustomer,
    customerSource,
    renderCustomer,
    selectedIds,
    selectedRows,
    query,
    applied,
    filters,
    materialSource,
    pickerSource,
    columns,
    navigation,
    fields,
    templates,
    canSelect,
    switchFactory,
    applyQuery,
  } = useSearchWorkflows()
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
      >
        <div class="workspace">
          <header class="page-header">
            <div>
              <span class="eyebrow">COMPONENT WORKSPACE</span>
              <h1>查找清楚，选择从容。</h1>
              <p
                >远程选项、自由文本与完整实体选择，共用请求契约，各守交互边界。</p
              >
            </div>
            <div class="preferences">
              <label
                >紧凑
                <NSwitch
                  v-model:value="compact"
                  aria-label="紧凑密度"
                  size="small"
              /></label>
              <label
                >深色
                <NSwitch
                  v-model:value="dark"
                  aria-label="深色主题"
                  size="small"
              /></label>
            </div>
          </header>

          <section
            class="surface"
            aria-labelledby="search-heading"
          >
            <div class="section-heading"
              ><div
                ><span class="step">01</span
                ><h2 id="search-heading">组合查询</h2></div
              ><span class="caption">仓库联动货位 · 配置式字段</span></div
            >
            <C_FormSearch
              v-model="query"
              :form-item-list="fields"
              :config="{
                density,
                layout: 'grid',
                columns: 3,
                labelPlacement: 'top',
                requireValue: false,
                onSearch: applyQuery,
              }"
            />
            <p
              class="result"
              data-testid="query-result"
              >{{
                applied
                  ? `已应用：${applied.warehouse} / ${applied.location ?? '全部货位'} / ${applied.remark || '全部说明'}`
                  : '选择仓库后查找货位，再执行查询。切换仓库会清空原货位。'
              }}</p
            >
          </section>

          <div class="two-columns">
            <section
              class="surface"
              aria-labelledby="select-heading"
            >
              <div class="section-heading"
                ><div
                  ><span class="step">02</span
                  ><h2 id="select-heading">远程选项</h2></div
                ><span class="caption">编码回显 · 分页候选</span></div
              >
              <label class="field-label">物料</label>
              <C_Select
                v-model="materialId"
                :source="materialSource"
                clearable
                :size="compact ? 'small' : 'medium'"
                placeholder="搜索物料编码、名称或规格"
                @select="selectedMaterial = $event"
              />
              <div
                class="record-summary"
                data-testid="material-result"
              >
                <template v-if="selectedMaterial"
                  ><strong
                    >{{ selectedMaterial.code }} ·
                    {{ selectedMaterial.name }}</strong
                  ><span>{{ selectedMaterial.specification }}</span
                  ><span
                    >库存 {{ selectedMaterial.stock }}
                    {{ selectedMaterial.unit }}</span
                  ></template
                >
                <span v-else>选中后可从完整记录取得规格、单位和库存。</span>
              </div>
            </section>
            <section
              class="surface"
              aria-labelledby="text-heading"
            >
              <div class="section-heading"
                ><div
                  ><span class="step">03</span
                  ><h2 id="text-heading">自由文本建议</h2></div
                ><span class="caption">模板建议 · 自由编辑</span></div
              >
              <label class="field-label">企业名称</label>
              <C_AutoComplete
                v-model="customerText"
                :source="customerSource"
                :render-label="renderCustomer"
                :size="compact ? 'small' : 'medium'"
                placeholder="输入企业名称或信用代码"
                clearable
                @select="selectedCustomer = $event"
              />
              <p
                class="result"
                data-testid="customer-result"
                >{{
                  selectedCustomer
                    ? `已回填信用代码：${selectedCustomer.creditCode}`
                    : '同名企业按信用代码辨认；修改名称会清空原关联记录。'
                }}</p
              >
              <label class="field-label">业务说明</label>
              <C_AutoComplete
                v-model="remark"
                :options="templates"
                :filterable="false"
                :size="compact ? 'small' : 'medium'"
                placeholder="选择常用说明，或直接输入"
                clearable
              />
              <p
                class="result"
                data-testid="remark-result"
                >{{ remark || '未选择建议也保留输入内容，失焦不会清空。' }}</p
              >
            </section>
          </div>

          <section
            class="surface picker-section"
            aria-labelledby="picker-heading"
          >
            <div class="section-heading"
              ><div
                ><span class="step">04</span
                ><h2 id="picker-heading">多列实体选择</h2></div
              ><span class="caption">快捷查找 → 完整选择</span></div
            >
            <p class="section-description"
              >按编码快速定位；需要比对规格时打开完整选择。跨页保留草稿，最多选择
              3 项，零库存项不可选择。</p
            >
            <C_DataPicker
              v-model="selectedIds"
              :source="pickerSource"
              :columns="columns"
              :density="density"
              presentation="popover"
              multiple
              clearable
              :page-size="6"
              :max-selection="3"
              :row-checkable="canSelect"
              :fixed-filters="filters"
              :navigation="navigation"
              :history="{
                storageKey: 'materials-demo',
                scope: `demo:${filters.factory}`,
                maxItems: 8,
                favorites: true,
              }"
              title="选择可用物料"
              placeholder="输入物料编码，或打开完整选择"
              @select="selectedRows = $event"
            />
            <div
              class="selected-records"
              data-testid="picker-result"
              ><span
                v-if="!selectedRows.length"
                class="empty-selection"
                >尚未确认选择</span
              ><article
                v-for="row in selectedRows"
                :key="row.id"
                ><span class="record-code">{{ row.code }}</span
                ><strong>{{ row.name }}</strong
                ><span>{{ row.specification }}</span
                ><span>{{ row.stock }} {{ row.unit }}可用</span></article
              ></div
            >
            <details class="verification-controls"
              ><summary>验证异常与上下文</summary
              ><div
                ><NButton
                  size="small"
                  @click="failNext = true"
                  >下一次查询失败</NButton
                ><NButton
                  size="small"
                  @click="unavailable = !unavailable"
                  >{{
                    unavailable ? '恢复可选状态' : '模拟记录全部失效'
                  }}</NButton
                ><NButton
                  size="small"
                  @click="switchFactory"
                  >切换工厂（{{ filters.factory }}）</NButton
                ></div
              ></details
            >
          </section>
          <footer
            >离线场景验证 ·
            候选数据在本地模拟，接口取消、分页与回显遵循公开契约。</footer
          >
        </div>
      </main>
    </NMessageProvider>
  </NConfigProvider>
</template>
