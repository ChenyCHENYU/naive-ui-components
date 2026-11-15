<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2025-08-01
 * @Description: 工作流/审批流组件（基于 Vue Flow）
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
-->

<template>
  <div
    class="approval-workflow-container"
    :style="workflowStyle"
    tabindex="0"
    @keydown="handleCanvasKeydown"
  >
    <!-- 浮动工具栏 -->
    <div class="floating-toolbar">
      <NButton
        size="small"
        type="primary"
        :disabled="readonly"
        @click="saveWorkflow"
      >
        <template #icon>
          <C_Icon
            name="mdi:content-save"
            :size="16"
          />
        </template>
        保存
      </NButton>
      <NButton
        size="small"
        @click="previewWorkflow"
      >
        <template #icon>
          <C_Icon
            name="mdi:eye"
            :size="16"
          />
        </template>
        预览
      </NButton>
      <NButton
        size="small"
        @click="validateCurrentWorkflow"
        title="检查工作流配置是否正确"
      >
        <template #icon>
          <C_Icon
            name="mdi:check-circle"
            :size="16"
          />
        </template>
        验证流程
      </NButton>
      <div class="toolbar-divider"></div>
      <NButton
        size="small"
        @click="fitView"
        title="适应窗口"
      >
        <template #icon>
          <C_Icon
            name="mdi:fit-to-screen"
            :size="16"
          />
        </template>
      </NButton>
      <NButton
        size="small"
        type="error"
        :disabled="readonly"
        @click="clearWorkflow"
        title="清空画布"
      >
        <template #icon>
          <C_Icon
            name="mdi:delete-sweep"
            :size="16"
          />
        </template>
      </NButton>
    </div>

    <!-- Vue Flow 画布 -->
    <VueFlow
      ref="vueFlowRef"
      :is-valid-connection="validateCanvasConnection"
      v-model:nodes="nodes"
      v-model:edges="edges"
      :node-types="nodeTypes"
      class="workflow-canvas"
      :default-viewport="{ zoom: 1, x: 0, y: 0 }"
      :min-zoom="0.5"
      :max-zoom="2"
      :fit-view-on-init="true"
      :nodes-draggable="!readonly"
      :nodes-connectable="!readonly"
      :edges-updatable="!readonly"
      :delete-key-code="null"
      :elements-selectable="true"
      @node-click="onNodeClick"
      @edge-click="onEdgeClick"
      @node-drag-stop="commitCanvasChange"
      @nodes-change="handleCanvasChanges"
      @edges-change="handleCanvasChanges"
      @connect="connectNodes"
      @edge-update="updateConnection"
      @pane-click="closeAddMenu"
    />

    <!-- 节点添加菜单 -->
    <Teleport to="body">
      <div
        ref="addMenuRef"
        v-show="showAddMenu"
        class="add-node-menu"
        :style="{
          ...workflowStyle,
          left: boundedMenuPosition.x + 'px',
          top: boundedMenuPosition.y + 'px',
        }"
      >
        <div class="add-menu-content">
          <button
            v-for="nodeType in paletteOptions"
            :key="nodeType.type"
            type="button"
            :aria-label="nodeType.label"
            class="add-menu-item"
            @click="addNode(nodeType.type)"
          >
            <div
              class="menu-icon"
              :class="nodeType.iconClass"
            >
              <C_Icon
                :name="nodeType.icon"
                :size="16"
              />
            </div>
            <span class="menu-text">{{ nodeType.label }}</span>
          </button>
        </div>
      </div>
    </Teleport>

    <!-- 节点配置弹窗 - 拆分到独立组件 -->
    <NodeConfigModal
      v-if="showNodeConfig"
      :style="workflowStyle"
      v-model:show="showNodeConfig"
      :current-node="currentNode"
      :users="users"
      :departments="departments"
      :people="people"
      :readonly="readonly"
      :condition-fields="conditionFields"
      :branch-targets="branchTargets"
      @save="handleConfigSave"
      @cancel="showNodeConfig = false"
    />

    <!-- 验证错误日志抽屉 -->
    <NDrawer
      v-model:show="showValidationErrors"
      :style="workflowStyle"
      :width="450"
      placement="right"
    >
      <NDrawerContent
        title="流程验证结果"
        closable
      >
        <div
          v-if="validationErrors.length === 0"
          class="validation-success"
        >
          <div class="success-icon">
            <C_Icon
              name="mdi:check-circle"
              :size="32"
              color="var(--c-success, var(--c-theme-success, #18a058))"
            />
          </div>
          <h3>验证通过</h3>
          <p
            >流程结构和节点配置验证通过；审批执行、权限与业务规则由后端校验。</p
          >
        </div>

        <div
          v-else
          class="validation-errors"
        >
          <div class="error-summary">
            <div class="error-icon">
              <C_Icon
                name="mdi:alert-circle"
                :size="24"
                color="var(--c-error, var(--c-theme-error, #d03050))"
              />
            </div>
            <h3>发现 {{ validationErrors.length }} 个问题</h3>
            <p>请修复以下问题后重新验证：</p>
          </div>

          <div class="error-list">
            <div
              v-for="(error, index) in validationErrors"
              :key="`${error.nodeId}-${error.field}-${index}`"
              class="error-item"
            >
              <div class="error-header">
                <span class="error-number">{{ index + 1 }}</span>
                <div class="error-info">
                  <strong class="error-node">{{ error.nodeName }}</strong>
                  <span class="error-field">{{
                    getFieldDisplayName(error.field)
                  }}</span>
                </div>
                <div
                  class="error-type"
                  :class="error.type"
                >
                  {{ getErrorTypeText(error.type) }}
                </div>
              </div>
              <div class="error-message">{{ error.message }}</div>
              <div class="error-actions">
                <NButton
                  size="small"
                  type="primary"
                  :disabled="!error.nodeId"
                  @click="jumpToErrorNode(error.nodeId)"
                >
                  <template #icon>
                    <C_Icon
                      name="mdi:target"
                      :size="16"
                    />
                  </template>
                  定位节点
                </NButton>
              </div>
            </div>
          </div>

          <div class="validation-tips">
            <h4
              ><C_Icon
                name="mdi:lightbulb-outline"
                :size="16"
              />
              常见问题解决方案：</h4
            >
            <ul>
              <li>
                <strong>审批人未设置：</strong
                >点击审批节点，在弹窗中选择审批人员
              </li>
              <li>
                <strong>条件分支未配置：</strong
                >点击条件节点，添加至少一个条件分支
              </li>
              <li>
                <strong>节点连接断开：</strong> 检查节点之间的连线是否正确
              </li>
            </ul>
          </div>
        </div>

        <template #footer>
          <div class="validation-footer">
            <NButton @click="showValidationErrors = false">关闭</NButton>
            <NButton
              type="primary"
              @click="validateCurrentWorkflow"
            >
              <template #icon>
                <C_Icon
                  name="mdi:refresh"
                  :size="16"
                />
              </template>
              重新验证
            </NButton>
          </div>
        </template>
      </NDrawerContent>
    </NDrawer>

    <!-- 流程预览抽屉 -->
    <NDrawer
      v-model:show="showPreview"
      :style="workflowStyle"
      :width="520"
      placement="right"
    >
      <NDrawerContent
        title="流程设计预览"
        closable
      >
        <!-- 统计概览 -->
        <div class="preview-stats">
          <div class="stat-item">
            <span class="stat-value">{{ previewStats.totalNodes }}</span>
            <span class="stat-label">总节点</span>
          </div>
          <div class="stat-item approval">
            <span class="stat-value">{{ previewStats.approvalNodes }}</span>
            <span class="stat-label">审批</span>
          </div>
          <div class="stat-item copy">
            <span class="stat-value">{{ previewStats.copyNodes }}</span>
            <span class="stat-label">抄送</span>
          </div>
          <div class="stat-item condition">
            <span class="stat-value">{{ previewStats.conditionNodes }}</span>
            <span class="stat-label">条件</span>
          </div>
          <div class="stat-item edge">
            <span class="stat-value">{{ previewStats.totalEdges }}</span>
            <span class="stat-label">连线</span>
          </div>
        </div>

        <!-- 流程步骤时间线 -->
        <div class="preview-timeline">
          <div
            v-for="(step, index) in previewSteps"
            :key="step.node.id"
            class="preview-step"
            :class="step.colorClass"
          >
            <!-- 时间线连接线 -->
            <div class="step-connector">
              <div class="step-dot">
                <C_Icon
                  :name="step.icon"
                  :size="16"
                />
              </div>
              <div
                v-if="index < previewSteps.length - 1"
                class="step-line"
              ></div>
            </div>

            <!-- 步骤内容 -->
            <div class="step-content">
              <div class="step-header">
                <span class="step-order">步骤 {{ step.order }}</span>
                <span class="step-type-badge">{{ step.nodeTypeLabel }}</span>
              </div>
              <div class="step-title">{{ step.node.data.title }}</div>
              <div
                v-if="step.details.length > 0"
                class="step-details"
              >
                <div
                  v-for="(detail, dIdx) in step.details"
                  :key="dIdx"
                  class="step-detail-item"
                  :class="{ 'is-warning': detail.type === 'warning' }"
                >
                  <span class="detail-label">{{ detail.label }}：</span>

                  <!-- 审批方式 badge -->
                  <span
                    v-if="detail.type === 'mode'"
                    class="mode-badge"
                    :class="detail.modeKey"
                  >
                    {{ detail.value }}
                  </span>

                  <!-- 人员 tags -->
                  <template v-else-if="detail.type === 'users'">
                    <NTag
                      v-for="user in detail.users"
                      :key="user.id"
                      size="small"
                      :bordered="false"
                      round
                      class="user-tag"
                    >
                      <template #icon>
                        <C_Icon
                          name="mdi:account"
                          :size="12"
                        />
                      </template>
                      {{ user.name }}
                    </NTag>
                  </template>

                  <!-- 警告文案 -->
                  <span
                    v-else-if="detail.type === 'warning'"
                    class="warning-text"
                  >
                    <C_Icon
                      name="mdi:alert-outline"
                      :size="14"
                    />
                    {{ detail.value }}
                  </span>

                  <!-- 普通文本 -->
                  <span v-else>{{ detail.value }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div
          v-if="previewSteps.length === 0"
          class="preview-empty"
        >
          <C_Icon
            name="mdi:file-document-outline"
            :size="48"
            color="#d1d5db"
          />
          <p>暂无流程节点</p>
        </div>

        <template #footer>
          <div class="preview-footer">
            <NButton @click="closePreview">关闭</NButton>
            <NButton
              type="primary"
              :disabled="readonly"
              @click="confirmAndSave"
            >
              <template #icon>
                <C_Icon
                  name="mdi:content-save"
                  :size="16"
                />
              </template>
              确认并保存
            </NButton>
          </div>
        </template>
      </NDrawerContent>
    </NDrawer>
  </div>
</template>

<script setup lang="ts">
  import {
    ref,
    computed,
    provide,
    defineAsyncComponent,
    onDeactivated,
    watch,
    nextTick,
  } from 'vue'
  import { VueFlow } from '@vue-flow/core'
  import { NButton, NDrawer, NDrawerContent, NTag } from 'naive-ui'
  import { C_Icon } from '../C_Icon'
  import { useComponentFeedback } from '../../component-config'
  import { useComponentTheme } from '../../composables/useComponentTheme'
  import type {
    WorkflowProps,
    WorkflowData,
    WorkflowEmits,
    WorkflowExpose,
    WorkflowSlots,
  } from './types'
  import { NODE_TYPE_OPTIONS } from './data'
  import { cloneData, isDataEqual } from '../../utils/data'
  const NodeConfigModal = defineAsyncComponent(
    () => import('./NodeConfigModal.vue')
  )
  import { WORKFLOW_PRESENTATION } from './nodes/workflowPresentation'
  import { useWorkflowNodes } from './composables/useWorkflowNodes'
  import { useWorkflowValidation } from './composables/useWorkflowValidation'
  import { useWorkflowPreview } from './composables/useWorkflowPreview'

  defineOptions({ name: 'C_WorkFlow' })

  /* Props & Emits */
  const props = withDefaults(defineProps<WorkflowProps>(), {
    users: () => [],
    roles: () => [],
    departments: () => [],
    readonly: false,
    allowCycles: true,
  })

  const emit = defineEmits<WorkflowEmits>()
  const slots = defineSlots<WorkflowSlots>()
  const paletteOptions = computed(() =>
    NODE_TYPE_OPTIONS.filter(
      option =>
        !props.allowedNodeTypes || props.allowedNodeTypes.includes(option.type)
    )
  )
  const componentTheme = useComponentTheme(() => props.theme)
  const workflowStyle = computed(() => ({
    ...componentTheme.value,
    '--workflow-surface': 'var(--c-bg-card, var(--c-theme-bg-card, #fff))',
    '--workflow-background':
      'var(--c-bg-body, var(--c-theme-bg-body, #f6f8fc))',
    '--workflow-text': 'var(--c-text-1, var(--c-theme-text-1, #1f2937))',
    '--workflow-muted': 'var(--c-text-3, var(--c-theme-text-3, #64748b))',
    '--workflow-border': 'var(--c-border, var(--c-theme-border, #dce3ed))',
    '--workflow-accent': 'var(--c-primary, var(--c-theme-primary, #2563eb))',
    color: 'var(--workflow-text)',
  }))
  const message = useComponentFeedback()
  const vueFlowRef = ref()
  const addMenuRef = ref<HTMLElement>()
  const boundedMenuPosition = ref({ x: 0, y: 0 })

  /* ─── 节点管理 ──────────────────────────────────────────── */
  const {
    nodes,
    edges,
    showAddMenu,
    menuPosition,
    showNodeConfig,
    currentNode,
    nodeTypes,
    workflowStats,
    commitCanvasChange,
    handleCanvasChanges,
    handleCanvasKeydown,
    validateCanvasConnection,
    connectNodes,
    updateConnection,
    addNode,
    onNodeClick,
    onEdgeClick,
    closeAddMenu,
    handleConfigSave,
    resetNodes,
    getCurrentWorkflowData,
    getNodeSnapshot,
    fitView,
    deleteNode,
  } = useWorkflowNodes(props, emit, vueFlowRef)

  watch(
    [showAddMenu, menuPosition],
    async ([visible, position], _previous, onCleanup) => {
      if (!visible) return
      let current = true
      // 视口变化会使原锚点失效；只在菜单会话内监听，关闭后立即释放。
      window.addEventListener('resize', closeAddMenu, {
        once: true,
        passive: true,
      })
      onCleanup(() => {
        current = false
        window.removeEventListener('resize', closeAddMenu)
      })
      // post watcher 仍可能先于 v-show updated；完整 DOM 更新后再测可见尺寸。
      await nextTick()
      const menu = addMenuRef.value
      if (!current || !showAddMenu.value || !menu) return
      const { width, height } = menu.getBoundingClientRect()
      const viewportWidth =
        document.documentElement.clientWidth || window.innerWidth
      const viewportHeight =
        document.documentElement.clientHeight || window.innerHeight
      // 显示后按真实尺寸收敛到视口；保留原始锚点，避免测量回写触发循环。
      boundedMenuPosition.value = {
        x: Math.min(
          Math.max(8, position.x),
          Math.max(8, viewportWidth - width - 8)
        ),
        y: Math.min(
          Math.max(8, position.y),
          Math.max(8, viewportHeight - height - 8)
        ),
      }
    },
    { flush: 'post' }
  )

  provide(WORKFLOW_PRESENTATION, {
    readonly: computed(() => props.readonly),
    renderer: computed(() => slots.node),
    context: id => {
      const node = getNodeSnapshot(id)
      if (!node) return
      return {
        node,
        readonly: props.readonly,
        edit: () => onNodeClick({ node: { id } }),
        remove: () => deleteNode(id),
      }
    },
  })
  const branchTargets = computed(() =>
    nodes.value
      .filter(
        node => node.id !== currentNode.value?.id && node.type !== 'start'
      )
      .map(node => ({ value: node.id, label: node.data.title }))
  )

  /* ─── 流程验证 ──────────────────────────────────────────── */
  const {
    validationErrors,
    showValidationErrors,
    validateWorkflow,
    validateCurrentWorkflow,
    jumpToErrorNode,
    getFieldDisplayName,
    getErrorTypeText,
    resetValidation,
  } = useWorkflowValidation(nodes, edges, vueFlowRef, {
    allowCycles: () => props.allowCycles,
    conditionFields: () => props.conditionFields,
    onShowNodeConfig: node => {
      if (props.readonly) return
      currentNode.value = node
      showNodeConfig.value = true
    },
    onValidateError: errors => emit('validate-error', errors),
  })

  /* ─── 流程预览 ──────────────────────────────────────────── */
  const { showPreview, previewSteps, previewStats, openPreview, closePreview } =
    useWorkflowPreview(nodes, edges)
  let previewBaseline: WorkflowData | undefined
  let previewSource: WorkflowData | undefined
  const isPreviewSourceCurrent = () =>
    isDataEqual(props.modelValue, previewSource) ||
    isDataEqual(props.modelValue, previewBaseline)
  watch(
    () => props.modelValue,
    () => {
      // Equal controlled echoes retain the view; another definition invalidates it.
      if (showPreview.value && !isPreviewSourceCurrent()) closePreview()
    },
    { deep: true, flush: 'sync' }
  )
  watch(
    showPreview,
    visible => {
      if (!visible) {
        previewBaseline = undefined
        previewSource = undefined
      }
    },
    { flush: 'sync' }
  )
  onDeactivated(closePreview)

  /* ─── 编排方法（跨 composable 协作） ────────────────────── */
  const saveWorkflow = (): void => {
    if (props.readonly) return
    const errors = validateWorkflow()
    validationErrors.value = errors
    const blocking = errors.filter(error => error.type !== 'warning')
    if (blocking.length > 0) {
      message.error(`工作流验证失败: ${blocking[0].message}`)
      showValidationErrors.value = true
      emit('validate-error', errors)
      return
    }
    const data = getCurrentWorkflowData()
    emit('save', data)
    message.success('工作流保存成功')
  }

  const previewWorkflow = (): void => {
    previewBaseline = getCurrentWorkflowData()
    previewSource = cloneData(props.modelValue)
    openPreview()
  }

  const confirmAndSave = (): void => {
    const valid =
      showPreview.value &&
      isPreviewSourceCurrent() &&
      isDataEqual(getCurrentWorkflowData(), previewBaseline)
    closePreview()
    previewBaseline = undefined
    previewSource = undefined
    if (valid) saveWorkflow()
  }

  const clearWorkflow = (): void => {
    if (props.readonly) return
    resetNodes()
    resetValidation()
  }

  /* ─── 暴露方法 ──────────────────────────────────────────── */
  defineExpose({
    validateWorkflow,
    getCurrentWorkflowData,
    saveWorkflow,
    previewWorkflow,
    deleteNode,
    stats: workflowStats,
  } satisfies {
    [K in keyof WorkflowExpose]:
      WorkflowExpose[K] | import('vue').Ref<WorkflowExpose[K]>
  })
</script>

<style scoped lang="scss">
  @use './index.scss';
</style>
