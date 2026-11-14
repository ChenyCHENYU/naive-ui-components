<script setup lang="ts">
  import { ref } from 'vue'
  import {
    NConfigProvider,
    NMessageProvider,
    NButton,
    NTag,
    zhCN,
  } from 'naive-ui'
  import { C_Table } from '@robot-admin/naive-ui-components/C_Table'
  import { C_SplitPane } from '@robot-admin/naive-ui-components/C_SplitPane'
  import { C_DataPicker } from '@robot-admin/naive-ui-components/C_DataPicker'
  import { C_UserPicker } from '@robot-admin/naive-ui-components/C_UserPicker'
  import { C_FormSearch } from '@robot-admin/naive-ui-components/C_FormSearch'
  import '@robot-admin/naive-ui-components/C_Table/style.css'
  import '@robot-admin/naive-ui-components/C_SplitPane/style.css'
  import '@robot-admin/naive-ui-components/C_DataPicker/style.css'
  import '@robot-admin/naive-ui-components/C_UserPicker/style.css'
  import '@robot-admin/naive-ui-components/C_FormSearch/style.css'
  import {
    useProductionParity,
    useQualityParity,
    productionOrders,
    productionColumns,
    heatColumns,
    slabColumns,
    devices,
    samples,
    integratedColumns,
    createMaterialSource,
    materialColumns,
    materialNavigation,
    operatorSource,
    operatorOrganization,
    type MaterialFilters,
  } from './business-scenarios-data'
  import './business-scenarios.css'

  const production = useProductionParity()
  const quality = useQualityParity()
  const material = ref<string | number | null>('material-1')
  const operator = ref<string | null>('U001')
  const materialSource = createMaterialSource()
  const materialInitial: MaterialFilters = {
    matlNo: '',
    materialName: '',
    specification: '',
  }
  const tableConfig = {
    density: 'compact',
    pagination: false,
    toolbar: { show: false },
  } as const
</script>

<template>
  <NConfigProvider :locale="zhCN">
    <NMessageProvider>
      <main class="business-parity">
        <header>
          <p class="business-parity__eyebrow"
            >BUSINESS CONTRACTS · 03 SCENARIOS</p
          >
          <h1>真实组合，清晰接入。</h1>
          <p
            >依据 wl
            生产、质量与销售页面提取交互契约，使用离线数据验证组件组合。此页不连接业务后端。</p
          >
          <nav
            ><a href="#production">01 主从多表</a
            ><a href="#quality">02 检测矩阵</a
            ><a href="#selection">03 组织与物料</a></nav
          >
        </header>

        <section
          id="production"
          data-testid="production-scenario"
          class="business-parity__card"
        >
          <div class="business-parity__heading"
            ><div
              ><h2>01 · 订单池与炉次分配</h2
              ><p
                >点击订单行，下方分别加载已选炉次和候选坯料。同单号不同项次按唯一行键隔离。</p
              ></div
            ><NTag :bordered="false">{{
              production.selected ?? '尚未选择订单'
            }}</NTag></div
          >
          <div class="business-parity__actions"
            ><NButton
              size="small"
              @click="production.selected = null"
              >清空订单</NButton
            ><NButton
              size="small"
              @click="production.failBound = true"
              >下次炉次查询失败</NButton
            ></div
          >
          <div class="business-parity__production-layout">
            <C_SplitPane
              direction="vertical"
              :default-size="40"
              :min-size="25"
              :max-size="60"
              aria-label="调整订单池与分配区高度"
            >
              <template #first>
                <C_Table
                  :data="productionOrders"
                  :columns="productionColumns"
                  :config="tableConfig"
                  row-key="id"
                  :row-props="production.rowProps"
                  flex-height
                />
              </template>
              <template #second>
                <C_SplitPane
                  :default-size="48"
                  :min-size="25"
                  :max-size="75"
                  aria-label="调整炉次与候选区宽度"
                >
                  <template #first
                    ><div
                      data-testid="bound-heats"
                      class="business-parity__panel"
                      ><h3>已选炉次</h3
                      ><p
                        v-if="production.bound.status === 'error'"
                        role="alert"
                        >炉次查询失败，候选坯料仍可查看。<NButton
                          size="tiny"
                          @click="production.bound.reload"
                          >重试炉次</NButton
                        ></p
                      ><C_Table
                        :data="production.bound.data ?? []"
                        :loading="production.bound.loading"
                        :columns="heatColumns"
                        :config="tableConfig"
                        row-key="id"
                        flex-height /></div
                  ></template>
                  <template #second
                    ><div
                      data-testid="slab-candidates"
                      class="business-parity__panel"
                      ><h3>候选坯料</h3
                      ><C_Table
                        :data="production.slabs.data ?? []"
                        :loading="production.slabs.loading"
                        :columns="slabColumns"
                        :config="tableConfig"
                        row-key="matNo"
                        flex-height /></div
                  ></template>
                </C_SplitPane>
              </template>
            </C_SplitPane>
          </div>
        </section>

        <section
          id="quality"
          data-testid="quality-scenario"
          class="business-parity__card"
        >
          <div class="business-parity__heading"
            ><div
              ><h2>02 · 样品动态检测矩阵</h2
              ><p
                >在设备表中连续输入检测值，切换样品会保留各自草稿。检测字符串保留原精度，整合时生成独立快照。</p
              ></div
            ><NTag
              type="info"
              :bordered="false"
              >{{ quality.selected }}</NTag
            ></div
          >
          <div class="business-parity__actions"
            ><NButton
              v-for="sample in samples"
              :key="sample.id"
              :type="quality.selected === sample.id ? 'primary' : 'default'"
              size="small"
              @click="quality.selectSample(sample.id)"
              >{{ sample.smpNo }}</NButton
            ><NButton
              size="small"
              type="primary"
              @click="quality.integrate"
              >生成整合载荷</NButton
            ></div
          >
          <div
            v-for="device in devices"
            :key="device.deviceNo"
            :data-testid="`device-${device.deviceNo}`"
            class="business-parity__device"
          >
            <div class="business-parity__heading"
              ><h3>{{ device.deviceNo }} · {{ device.name }}</h3
              ><div class="business-parity__actions"
                ><NButton
                  size="tiny"
                  :aria-label="`新增${device.deviceNo}设备行`"
                  @click="quality.append(device.deviceNo)"
                  >增行</NButton
                ><NButton
                  size="tiny"
                  :disabled="quality.matrix[device.deviceNo].length <= 1"
                  :aria-label="`删除${device.deviceNo}设备末行`"
                  @click="quality.remove(device.deviceNo)"
                  >删除末行</NButton
                ></div
              ></div
            >
            <C_Table
              :key="`${quality.selected}:${device.deviceNo}`"
              v-model:data="quality.matrix[device.deviceNo]"
              :columns="quality.columns[device.deviceNo]"
              :config="{ ...tableConfig, edit: 'inline' }"
              row-key="id"
            />
          </div>
          <div data-testid="integrated-results"
            ><h3>整合快照 · {{ quality.results.length }} 项</h3
            ><p
              >仅将非空检测值映射为 parentId / heatNo / heatId / smpNo /
              deviceNo / elementCode /
              testRst；真实删除、保存事务由业务后端处理。</p
            ><C_Table
              :data="quality.results"
              :columns="integratedColumns"
              :config="tableConfig"
              row-key="id"
          /></div>
        </section>

        <section
          id="selection"
          data-testid="selection-scenario"
          class="business-parity__card"
        >
          <div class="business-parity__heading"
            ><div
              ><h2>03 · 分类选物料，组织选人员</h2
              ><p
                >分类、搜索和分页共用选择会话；点击确定后才更新业务值，取消保留上次结果。</p
              ></div
            ></div
          >
          <div class="business-parity__selection-grid">
            <div data-testid="material-picker"
              ><label>合同物料</label
              ><C_DataPicker
                v-model="material"
                :source="materialSource"
                :columns="materialColumns"
                :navigation="materialNavigation"
                :initial-values="materialInitial"
                :fixed-filters="{ status: '1' }"
                :page-size="2"
                require-selection
                title="选择合同物料"
                placeholder="按分类选择物料"
              >
                <template #query="{ initialValues, submit }"
                  ><C_FormSearch
                    :model-value="initialValues ?? materialInitial"
                    :form-item-list="[
                      { type: 'input', prop: 'matlNo', label: '物料编码' },
                      {
                        type: 'input',
                        prop: 'materialName',
                        label: '物料名称',
                      },
                      {
                        type: 'input',
                        prop: 'specification',
                        label: '规格说明',
                      },
                    ]"
                    :config="{
                      density: 'compact',
                      searchOnReset: true,
                      onSearch: submit,
                    }"
                /></template> </C_DataPicker
              ><output data-testid="material-value"
                >已提交物料：{{ material ?? '未选择' }}</output
              ></div
            >
            <div data-testid="operator-picker"
              ><label>配料人员</label
              ><C_UserPicker
                v-model="operator"
                :source="operatorSource"
                :organization="operatorOrganization"
                :fields="{ code: 'userNo', department: 'departmentName' }"
                :page-size="2"
                require-selection
                title="选择配料人员"
                placeholder="按组织选择人员"
              /><output data-testid="operator-value"
                >已提交工号：{{ operator ?? '未选择' }}</output
              ></div
            >
          </div>
        </section>
      </main>
    </NMessageProvider>
  </NConfigProvider>
</template>
