<script setup lang="ts">
  import { computed, ref } from 'vue'
  import OrderApproval from './OrderApproval.vue'
  import FormGuardDemo from './FormGuardDemo.vue'
  import BackgroundTaskDemo from './BackgroundTaskDemo.vue'
  import TabbedQueryDemo from './TabbedQueryDemo.vue'
  import { C_ActionBar } from '@robot-admin/naive-ui-components/C_ActionBar'
  import {
    C_Attachments,
    type AttachmentItem,
  } from '@robot-admin/naive-ui-components/C_Attachments'
  import {
    C_ChangeReview,
    type ChangeReviewField,
  } from '@robot-admin/naive-ui-components/C_ChangeReview'
  import {
    C_Descriptions,
    type DescriptionField,
  } from '@robot-admin/naive-ui-components/C_Descriptions'
  import {
    C_DataPicker,
    createLocalDataPickerSource,
  } from '@robot-admin/naive-ui-components/C_DataPicker'
  import {
    C_FilterBuilder,
    createFilterGroup,
    type FilterField,
  } from '@robot-admin/naive-ui-components/C_FilterBuilder'
  import {
    C_ImportWizard,
    type ImportWizardAdapter,
  } from '@robot-admin/naive-ui-components/C_ImportWizard'
  import {
    C_ResourceSchedule,
    type ResourceScheduleRange,
  } from '@robot-admin/naive-ui-components/C_ResourceSchedule'
  import {
    C_TaskBoard,
    type TaskBoardMove,
    type TaskBoardTask,
  } from '@robot-admin/naive-ui-components/C_TaskBoard'
  import '@robot-admin/naive-ui-components/C_ChangeReview/style.css'
  import '@robot-admin/naive-ui-components/C_ActionBar/style.css'
  import '@robot-admin/naive-ui-components/C_Attachments/style.css'
  import '@robot-admin/naive-ui-components/C_Descriptions/style.css'
  import '@robot-admin/naive-ui-components/C_DataPicker/style.css'
  import '@robot-admin/naive-ui-components/C_FilterBuilder/style.css'
  import '@robot-admin/naive-ui-components/C_ImportWizard/style.css'
  import '@robot-admin/naive-ui-components/C_ResourceSchedule/style.css'
  import '@robot-admin/naive-ui-components/C_TaskBoard/style.css'

  const materialIds = ref<number[]>([])
  const materials = createLocalDataPickerSource({
    rows: [
      { id: 1, code: '0001', name: '钢卷' },
      { id: 2, code: '0002', name: '钢坯' },
    ],
    rowKey: 'id',
    code: row => row.code,
    label: row => row.name,
  })

  const before = { code: 'SO-2026', quantity: 0, customer: '华东制造' }
  const after: typeof before = { ...before, quantity: 12 }
  const fields = [
    { key: 'code', label: '订单号' },
    { key: 'customer', label: '客户' },
    { key: 'quantity', label: '计划量', format: value => `${value} t` },
  ] satisfies ChangeReviewField<typeof before>[]
  const learned = ref<(keyof typeof before)[]>([])
  const record = computed(() => ({
    ...before,
    quantity: learned.value.includes('quantity')
      ? after.quantity
      : before.quantity,
  }))
  const detailFields = [
    { key: 'code', label: '订单号', copyable: true },
    { key: 'customer', label: '客户' },
    {
      key: 'quantity',
      label: '当前计划量',
      format: order => `${order.quantity} t`,
    },
  ] satisfies DescriptionField<typeof before>[]

  const filterFields = [
    { key: 'heat', label: '炉次号', type: 'text' },
    { key: 'temperature', label: '温度', type: 'number' },
  ] satisfies FilterField[]
  const rule = ref(createFilterGroup())

  const importFields = [{ key: 'code', label: '物料编码', required: true }]
  const commits = ref(0)
  const adapter: ImportWizardAdapter<string, { codes: string[] }> = {
    async read(file) {
      if (!(await file.text()).startsWith('code\n')) return []
      return [
        {
          key: 'main',
          label: '物料',
          columns: [{ key: 'code', label: '物料编码' }],
        },
      ]
    },
    async preview({ file }) {
      const codes = (await file.text()).trim().split('\n').slice(1)
      return { plan: { codes }, rowCount: codes.length }
    },
    async commit({ codes }) {
      commits.value++
      return codes.map(key => ({ key, status: 'success' }))
    },
  }

  const tasks = ref<TaskBoardTask[]>([
    {
      key: 'shipping-1',
      title: '核对发运单',
      status: 'queued',
      lane: 'line-a',
    },
    {
      key: 'shipping-2',
      title: '打印标签',
      status: 'queued',
      lane: 'line-a',
      disabled: true,
    },
  ])
  const moveSource = ref('')
  function moveTask({ task, to, source }: TaskBoardMove) {
    tasks.value = tasks.value.map(item =>
      item.key === task.key ? { ...item, status: to.status } : item
    )
    moveSource.value = source
  }

  const start = Date.UTC(2026, 9, 1, 8)
  const hour = 3_600_000
  const range = ref<ResourceScheduleRange>([start, start + 4 * hour])
  const resources = [
    {
      key: 'bin-a',
      label: '装车位 A',
      workingWindows: [
        [start, start + 3 * hour],
      ] satisfies ResourceScheduleRange[],
    },
  ]
  const bookings = [
    {
      key: 'slot-1',
      resourceKey: 'bin-a',
      label: '发运任务甲',
      start,
      end: start + 2 * hour,
    },
    {
      key: 'slot-2',
      resourceKey: 'bin-a',
      label: '发运任务乙',
      start: start + hour,
      end: start + 3 * hour,
    },
  ]
  const bookingKey = ref<string | null>(null)
  const evidence = ref<AttachmentItem[]>([])
  const toolbarExports = ref(0)
  function loadEvidence(event: Event) {
    if (!(event.target instanceof HTMLInputElement)) return
    const file = event.target.files?.[0]
    evidence.value = file ? [{ id: file.name, name: file.name, file }] : []
  }
</script>

<template>
  <main class="scene-contracts">
    <section data-testid="paste-material-codes">
      <h2>批量选择物料</h2>
      <C_DataPicker
        v-model="materialIds"
        title="选取物料"
        :source="materials"
        :columns="[
          { key: 'code', title: '物料编码' },
          { key: 'name', title: '物料名称' },
        ]"
        presentation="inline"
        multiple
        batch-paste
      >
        <template #trigger="{ open }"
          ><button
            type="button"
            @click="open"
            >打开物料选择</button
          ></template
        >
      </C_DataPicker>
      <output data-testid="material-ids">{{
        JSON.stringify(materialIds)
      }}</output>
    </section>

    <section data-testid="contract-review">
      <h2>订单合同复核</h2>
      <C_ChangeReview
        :before="before"
        :after="after"
        :fields="fields"
        selectable
        @apply="keys => (learned = keys)"
      />
      <C_Descriptions
        :data="record"
        :fields="detailFields"
        title="订单摘要"
      />
    </section>

    <OrderApproval />
    <FormGuardDemo />

    <BackgroundTaskDemo />

    <TabbedQueryDemo />

    <section data-testid="quality-conditions">
      <h2>质量条件</h2>
      <C_FilterBuilder
        v-model="rule"
        :fields="filterFields"
      />
      <output data-testid="filter-model">{{ JSON.stringify(rule) }}</output>
    </section>

    <section data-testid="material-import">
      <h2>物料清单导入</h2>
      <C_ImportWizard
        :fields="importFields"
        :adapter="adapter"
      />
      <output data-testid="import-commits">{{ commits }}</output>
    </section>

    <section data-testid="shipping-board">
      <h2>发运任务看板</h2>
      <C_TaskBoard
        :tasks="tasks"
        :columns="[
          { key: 'queued', label: '待安排' },
          { key: 'ready', label: '已安排' },
        ]"
        :lanes="[{ key: 'line-a', label: '发运组 A' }]"
        draggable
        @move-request="moveTask"
      />
      <output data-testid="board-move-source">{{ moveSource }}</output>
    </section>

    <section data-testid="loading-docks">
      <C_ResourceSchedule
        v-model="bookingKey"
        v-model:range="range"
        title="装车货位排班"
        :resources="resources"
        :bookings="bookings"
        time-zone="Asia/Shanghai"
        navigation
      />
      <output data-testid="active-booking">{{ bookingKey }}</output>
    </section>

    <section data-testid="loading-evidence">
      <label>
        装车资料
        <input
          type="file"
          accept=".docx"
          @change="loadEvidence"
        />
      </label>
      <C_Attachments :items="evidence" />
    </section>

    <section data-testid="narrow-toolbar">
      <div style="width: min(100%, 320px)">
        <C_ActionBar
          :config="{ overflowAt: 480 }"
          :actions="[
            { key: 'save' },
            { key: 'export', overflow: true, onClick: () => toolbarExports++ },
          ]"
        />
      </div>
      <output data-testid="toolbar-exports">{{ toolbarExports }}</output>
    </section>
  </main>
</template>

<style scoped>
  .scene-contracts {
    display: grid;
    gap: 24px;
    max-width: 1080px;
    margin: 32px auto;
    padding: 0 16px;
    font-family: system-ui, sans-serif;
  }

  .scene-contracts > section {
    display: grid;
    gap: 8px;
    min-width: 0;
  }

  h2 {
    margin: 0;
    font-size: 18px;
  }

  output {
    overflow-wrap: anywhere;
  }
</style>
