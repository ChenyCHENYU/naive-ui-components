<script setup lang="ts">
  import {
    NConfigProvider,
    NMessageProvider,
    NButton,
    NSwitch,
    NTag,
    darkTheme,
    zhCN,
  } from 'naive-ui'
  import { C_UserPicker } from '@robot-admin/naive-ui-components/C_UserPicker'
  import { C_WorkFlow } from '@robot-admin/naive-ui-components/C_WorkFlow'
  import '@robot-admin/naive-ui-components/C_UserPicker/style.css'
  import '@robot-admin/naive-ui-components/C_WorkFlow/style.css'
  import { usePeopleWorkflowDemo } from './people-workflow-data'
  import './people-workflow.css'

  defineOptions({ name: 'PeopleWorkflowExperience' })
  const {
    dark,
    selected,
    scope,
    failNext,
    source,
    organization,
    lastSelection,
    receipt,
    readonly,
    remotePeople,
    people,
    workflowReceipt,
    workflow,
    users,
    departments,
    conditionFields,
    onSelect,
    switchScope,
  } = usePeopleWorkflowDemo()
</script>

<template>
  <NConfigProvider
    :theme="dark ? darkTheme : null"
    :locale="zhCN"
  >
    <NMessageProvider>
      <main
        class="pw-page"
        :class="{ 'pw-page--dark': dark }"
      >
        <header class="pw-heading">
          <div
            ><a href="./organization.html">← 组织目录与架构图</a
            ><p class="pw-eyebrow">PEOPLE & APPROVAL</p
            ><h1>协作与审批，清晰可控。</h1
            ><p>通过组织找到合适的人，用明确的节点表达审批规则。</p></div
          >
          <div class="pw-theme"
            ><span>深色主题</span
            ><NSwitch
              v-model:value="dark"
              aria-label="深色主题"
          /></div>
        </header>
        <section class="pw-card">
          <div class="pw-section-heading"
            ><div
              ><span class="pw-number">01</span><h2>按组织选择协作成员</h2
              ><p>组织筛选、人员分页、跨页选择，确认后统一提交。</p></div
            ><NTag
              :bordered="false"
              type="success"
              >{{ scope === 'factory-A' ? '总部范围' : '分部范围' }}</NTag
            ></div
          >
          <div class="pw-picker-demo">
            <div class="pw-picker-control">
              <span class="pw-label">协作成员</span>
              <C_UserPicker
                v-model="selected"
                :source="source"
                :organization="organization"
                :scope="scope"
                :fields="{
                  code: 'userNo',
                  department: 'departmentName',
                  job: 'position',
                }"
                :row-checkable="row => row.enabled"
                :disabled-reason="
                  row => (row.enabled ? undefined : '此成员已停用')
                "
                multiple
                :max-selection="6"
                :page-size="5"
                selection-order
                title="选择协作成员"
                placeholder="按组织查找并选择人员"
                @select="onSelect"
              />
              <span class="pw-help"
                >最多选择 6 人，同名成员通过工号区分；停用成员不可选。</span
              >
            </div>
            <div class="pw-source-actions"
              ><NButton
                size="small"
                @click="failNext = true"
                >下次查询失败</NButton
              ><NButton
                size="small"
                @click="switchScope"
                >切换业务范围</NButton
              ></div
            >
          </div>
          <div class="pw-selection"
            ><div
              v-for="person in lastSelection"
              :key="person.userNo"
              class="pw-person"
              ><span class="pw-avatar">{{ person.initials }}</span
              ><div
                ><strong>{{ person.displayName }}</strong
                ><small
                  >{{ person.userNo }} · {{ person.departmentName }}</small
                ></div
              ></div
            ><span
              v-if="!lastSelection.length"
              class="pw-muted"
              >打开选择器可查看已绑定成员，取消会保持原选择。</span
            ></div
          >
          <p
            class="pw-receipt"
            role="status"
            >{{ receipt }}</p
          >
        </section>
        <section class="pw-card pw-flow-section">
          <div class="pw-section-heading"
            ><div
              ><span class="pw-number">02</span><h2>采购审批设计</h2
              ><p>点击节点配置人员与条件，拖动连接点调整路径。</p></div
            ><label class="pw-theme"
              ><span>只读查看</span
              ><NSwitch
                v-model:value="readonly"
                aria-label="流程只读查看" /></label
          ></div>
          <label class="pw-theme"
            ><span>审批人使用分页来源</span
            ><NSwitch
              v-model:value="remotePeople"
              aria-label="审批人使用分页来源"
          /></label>
          <div class="pw-flow"
            ><C_WorkFlow
              v-model="workflow"
              :users="users"
              :departments="departments"
              :people="remotePeople ? people : undefined"
              :condition-fields="conditionFields"
              :readonly="readonly"
              :allow-cycles="false"
              :theme="dark ? 'dark' : 'light'"
              @save="
                workflowReceipt = `已保存设计快照：${$event.nodes.length} 个节点，${$event.edges.length} 条路径。`
              "
              @validate-error="
                workflowReceipt = `请检查 ${$event.length} 项流程配置。`
              "
          /></div>
          <p
            class="pw-receipt"
            role="status"
            >{{ workflowReceipt }}</p
          >
          <div class="pw-notes"
            ><div
              ><strong>明确分支</strong
              ><span>超过一万元进入财务复核，其他申请走默认路径。</span></div
            ><div
              ><strong>有序选人</strong
              ><span
                >顺序审批按保存的人员顺序展示，人员配置与协作选择共用选择机制。</span
              ></div
            ><div
              ><strong>独立演示</strong
              ><span
                >保存的是设计快照，预览用于检查图与配置，不触发真实审批。</span
              ></div
            ></div
          >
        </section>
      </main>
    </NMessageProvider>
  </NConfigProvider>
</template>
