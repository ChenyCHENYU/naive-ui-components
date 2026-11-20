<script setup lang="ts">
  import { ref } from 'vue'
  import {
    C_ApprovalViewer,
    type ApprovalInstanceDetail,
    type ApprovalViewerSource,
  } from '@robot-admin/naive-ui-components/C_ApprovalViewer'
  import '@robot-admin/naive-ui-components/C_ApprovalViewer/style.css'

  const orderNo = 'SO-2026-0821'
  const first = Date.UTC(2026, 9, 1, 1)
  const second = Date.UTC(2026, 9, 2, 2)
  const rejected: ApprovalInstanceDetail = {
    id: 'approval-1',
    label: '第 1 次提交',
    status: 'rejected',
    startedAt: first,
    finishedAt: first + 3_600_000,
    initiator: '孙晓',
    history: [
      { id: 'submit-1', title: '提交审批', occurredAt: first, actor: '孙晓' },
      {
        id: 'reject-1',
        title: '销售主管驳回',
        occurredAt: first + 3_600_000,
        actor: '周琳',
        comment: '请补充交货周期和合同附件。',
      },
    ],
  }
  const running: ApprovalInstanceDetail = {
    id: 'approval-2',
    label: '第 2 次提交',
    status: 'running',
    startedAt: second,
    initiator: '孙晓',
    currentHandler: '王宁',
    history: [
      {
        id: 'submit-2',
        title: '补充材料后重新提交',
        occurredAt: second,
        actor: '孙晓',
      },
    ],
  }

  const attempts = [rejected, running]
  const source: ApprovalViewerSource = {
    async listInstances(businessKey) {
      if (businessKey !== orderNo) return []
      return attempts.map(({ id, label, status, startedAt }) => ({
        id,
        label,
        status,
        startedAt,
      }))
    },
    async getInstance(instanceId) {
      const attempt = attempts.find(attempt => attempt.id === instanceId)
      if (!attempt) throw new Error('审批实例不存在')
      return attempt
    },
  }

  const show = ref(false)
  const instanceId = ref<string>()
  function open(id?: string) {
    instanceId.value = id
    show.value = true
  }
</script>

<template>
  <section data-testid="order-approval">
    <h2>销售订单审批</h2>
    <div class="order-approval__actions">
      <button
        type="button"
        @click="open()"
      >
        查看 {{ orderNo }} 审批
      </button>
      <button
        type="button"
        @click="open(rejected.id)"
      >
        打开驳回通知对应的审批
      </button>
    </div>
    <C_ApprovalViewer
      v-model:show="show"
      :business-key="orderNo"
      :instance-id="instanceId"
      :source="source"
    />
  </section>
</template>

<style scoped>
  h2 {
    margin: 0;
    font-size: 18px;
  }

  .order-approval__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
</style>
