<script setup lang="ts">
  import { computed, nextTick, ref, shallowRef } from 'vue'
  import { NConfigProvider, NMessageProvider, zhCN } from 'naive-ui'
  import {
    C_OrgChart,
    type OrgChartNode,
    type OrgChartExpose,
  } from '@robot-admin/naive-ui-components/C_OrgChart'
  import {
    C_Table,
    type TableColumn,
  } from '@robot-admin/naive-ui-components/C_Table'
  import { C_SplitPane } from '@robot-admin/naive-ui-components/C_SplitPane'
  import '@robot-admin/naive-ui-components/C_OrgChart/style.css'
  import '@robot-admin/naive-ui-components/C_Table/style.css'
  import '@robot-admin/naive-ui-components/C_SplitPane/style.css'

  defineOptions({ name: 'RuntimePerformanceFixture' })

  const host = ref<HTMLElement>()
  const chart = ref<OrgChartExpose>()
  const mode = ref<'org' | 'workbench' | null>(null)
  const size = ref(100)
  const org = shallowRef<OrgChartNode>({ id: 0, label: '部门 0' })
  const busy = ref(false)
  const selected = ref(0)
  const metrics = ref({
    sequence: 0,
    action: 'idle',
    durationMs: 0,
    domNodes: 0,
  })
  const nextFrame = () =>
    new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
  async function measure(
    action: string,
    task: () => unknown | Promise<unknown>
  ) {
    busy.value = true
    const start = performance.now()
    await task()
    await nextTick()
    await nextFrame()
    await nextFrame()
    metrics.value = {
      sequence: metrics.value.sequence + 1,
      action,
      durationMs: Math.round((performance.now() - start) * 100) / 100,
      domNodes: host.value?.querySelectorAll('*').length ?? 0,
    }
    busy.value = false
  }
  function mountOrg(count: number) {
    return measure(`org-${count}`, () => {
      size.value = count
      const nodes: OrgChartNode[] = Array.from({ length: count }, (_, id) => ({
        id,
        label: `部门 ${id}`,
        subtitle: '固定卡片内容',
        children: [],
      }))
      for (let index = 1; index < count; index++)
        nodes[Math.floor((index - 1) / 8)].children!.push(nodes[index])
      org.value = nodes[0]
      mode.value = 'org'
    })
  }
  interface Row {
    id: number
    name: string
    code: string
    quantity: number
  }
  const masters: Row[] = Array.from({ length: 300 }, (_, id) => ({
    id,
    name: `订单 ${id}`,
    code: `SO-${id}`,
    quantity: id + 1,
  }))
  const details = computed<Row[]>(() =>
    Array.from({ length: 300 }, (_, id) => ({
      id,
      name: `订单 ${selected.value} · 炉次 ${id}`,
      code: `H-${selected.value}-${id}`,
      quantity: id + 1,
    }))
  )
  const columns: TableColumn<Row>[] = [
    { key: 'name', title: '名称' },
    { key: 'code', title: '编码' },
    { key: 'quantity', title: '数量' },
  ]
  interface Measurement {
    id: number
    [key: string]: string | number
  }
  const fields = ['C', 'S', 'Mn', 'Si', 'Cr', 'Ni', 'P', 'Mo']
  const measurements = ref<Measurement[]>(
    Array.from({ length: 30 }, (_, id) => ({
      id,
      ...Object.fromEntries(fields.map(field => [field, '0.01000'])),
    }))
  )
  const editColumns: TableColumn<Measurement>[] = fields.map(key => ({
    key,
    title: key,
    editable: true,
    editType: 'input',
    width: 105,
  }))
  const viewConfig = {
    density: 'compact',
    pagination: false,
    virtualScroll: true,
    toolbar: { show: false },
  } as const
  const editConfig = {
    density: 'compact',
    pagination: false,
    edit: 'inline',
    toolbar: { show: false },
  } as const
  const rowProps = (row: Row) => ({
    onClick: () =>
      measure('master-selection', () => {
        selected.value = row.id
      }),
    'aria-selected': selected.value === row.id,
  })
</script>

<template>
  <NConfigProvider :locale="zhCN">
    <NMessageProvider>
      <main class="performance-fixture">
        <h1>固定规模浏览器基准</h1>
        <p
          >100/500 个全部展开组织节点；300 行主表 + 300 行从表 + 30×8
          个真实检测输入。耗时包含两帧布局等待，不代表堆内存。</p
        >
        <nav>
          <button
            :disabled="busy"
            @click="mountOrg(100)"
            >挂载 100 节点</button
          >
          <button
            :disabled="busy"
            @click="mountOrg(500)"
            >挂载 500 节点</button
          >
          <button
            :disabled="busy"
            @click="
              measure('workbench', () => {
                mode = 'workbench'
              })
            "
            >挂载组合工作台</button
          >
          <button
            :disabled="busy || mode !== 'org'"
            @click="measure('locate', () => chart?.locate(size - 1))"
            >定位末节点</button
          >
          <button
            :disabled="busy"
            @click="
              measure('unmount', () => {
                mode = null
              })
            "
            >卸载场景</button
          >
        </nav>
        <output data-testid="metrics">{{ JSON.stringify(metrics) }}</output>
        <div
          ref="host"
          data-testid="performance-host"
        >
          <C_OrgChart
            v-if="mode === 'org'"
            :key="size"
            ref="chart"
            :data="org"
            style="height: 600px"
          />
          <div
            v-else-if="mode === 'workbench'"
            class="performance-workbench"
          >
            <div class="performance-workbench__tables">
              <C_SplitPane
                :default-size="50"
                :min-first-size="300"
                :min-second-size="300"
              >
                <template #first
                  ><C_Table
                    data-testid="benchmark-master"
                    :data="masters"
                    :columns="columns"
                    :config="viewConfig"
                    :row-props="rowProps"
                    row-key="id"
                    flex-height
                /></template>
                <template #second
                  ><C_Table
                    data-testid="benchmark-detail"
                    :data="details"
                    :columns="columns"
                    :config="viewConfig"
                    row-key="id"
                    flex-height
                /></template>
              </C_SplitPane>
            </div>
            <C_Table
              data-testid="benchmark-quality"
              v-model:data="measurements"
              :columns="editColumns"
              :config="editConfig"
              row-key="id"
            />
            <output data-testid="first-measurement">{{
              measurements[0].C
            }}</output>
          </div>
        </div>
      </main>
    </NMessageProvider>
  </NConfigProvider>
</template>

<style scoped>
  .performance-fixture {
    max-width: 1400px;
    margin: 24px auto;
    font-family: system-ui, sans-serif;
  }
  nav {
    display: flex;
    gap: 12px;
    margin-block: 16px;
  }
  button {
    padding: 8px 12px;
  }
  output {
    display: block;
    margin-block: 12px;
  }
  .performance-workbench__tables {
    height: 400px;
    margin-bottom: 24px;
  }
</style>
