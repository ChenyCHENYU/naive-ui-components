<!--
 * @Description: 节点配置弹窗组件
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
-->

<template>
  <NModal
    v-model:show="visible"
    :style="{
      width: isUserSelectNode
        ? 'min(1180px, calc(100vw - 24px))'
        : 'min(900px, calc(100vw - 24px))',
    }"
    :mask-closable="false"
    preset="dialog"
    :title="configTitle"
    positive-text="确定"
    negative-text="取消"
    :loading="configLoading"
    @positive-click="saveNodeConfig"
    @negative-click="handleCancel"
    :positive-button-props="{ disabled: readonly }"
  >
    <div
      class="workflow-node-config"
      @keydown.capture="handleKeydown"
    >
      <!-- 公共选择面板 -->
      <template v-if="isUserSelectNode">
        <div class="workflow-people-content">
          <div class="config-section">
            <h4
              class="flex items-center gap-2 mb-4 text-base font-semibold"
              :style="{ color: 'var(--n-text-color-1)' }"
            >
              <C_Icon
                :name="selectionContent.icon"
                :size="16"
                v-if="selectionContent.icon"
              />
              {{ selectionContent.title }}
            </h4>

            <C_UserPicker
              :key="session"
              ref="peoplePicker"
              v-model="selectedValues"
              :source="people.source"
              :organization="people.organization"
              :fields="people.fields"
              :fixed-filters="people.fixedFilters"
              :scope="people.scope"
              :row-checkable="people.rowCheckable"
              :max-selection="people.maxSelection"
              :selection-order="
                currentNode?.type === 'approval' && approvalMode === 'sequence'
              "
              :require-selection="currentNode?.type !== 'copy'"
              :readonly="readonly"
              :show-actions="false"
              :revalidate-on-confirm="true"
              presentation="inline"
              title=""
              :aria-label="selectionContent.title"
              multiple
              @select="selectedRows = $event"
            />
          </div>
          <!-- 审批节点时附带审批模式 -->
          <template v-if="props.currentNode?.type === 'approval'">
            <div class="mt-4">
              <h5
                class="mb-3 text-sm font-medium"
                :style="{ color: 'var(--n-text-color-1)' }"
              >
                审批模式
              </h5>
              <NRadioGroup
                v-model:value="approvalMode"
                :disabled="readonly"
              >
                <NSpace vertical>
                  <NRadio
                    v-for="mode in APPROVAL_MODES"
                    :key="mode.value"
                    :value="mode.value"
                  >
                    <div class="flex flex-col gap-1">
                      <strong class="text-sm">{{ mode.label }}</strong>
                      <span
                        class="text-xs"
                        :style="{ color: 'var(--n-text-color-3)' }"
                        >{{ mode.desc }}</span
                      >
                    </div>
                  </NRadio>
                </NSpace>
              </NRadioGroup>
            </div>
          </template>
        </div>
      </template>

      <!-- 条件节点配置 -->
      <div
        v-else-if="props.currentNode?.type === 'condition'"
        class="max-h-60vh overflow-y-auto"
      >
        <div class="config-section">
          <h4
            class="flex items-center gap-2 mb-4 text-base font-semibold"
            :style="{ color: 'var(--n-text-color-1)' }"
          >
            <C_Icon
              name="mdi:source-branch"
              :size="16"
            />
            条件分支设置
          </h4>
          <div class="space-y-3">
            <div
              v-for="(condition, index) in conditions"
              :key="condition.id"
              class="condition-item"
            >
              <NCard
                size="small"
                class="border border-gray-200 hover:border-gray-300 transition-colors"
              >
                <div class="workflow-condition-row">
                  <NInput
                    v-model:value="condition.name"
                    :disabled="readonly"
                    placeholder="分支名称"
                    style="width: 150px"
                    class="flex-shrink-0"
                  />
                  <NSelect
                    v-model:value="condition.field"
                    :disabled="readonly || condition.isDefault"
                    placeholder="选择字段"
                    :options="fieldOptions"
                    @update:value="resetConditionValue(condition)"
                    style="width: 120px"
                    class="flex-shrink-0"
                  />
                  <NSelect
                    v-model:value="condition.operator"
                    :disabled="readonly || condition.isDefault"
                    placeholder="操作符"
                    :options="operatorsFor(condition)"
                    style="width: 100px"
                    class="flex-shrink-0"
                  />
                  <NSwitch
                    v-if="fieldType(condition) === 'boolean'"
                    :value="condition.value === 'true'"
                    @update:value="condition.value = String($event)"
                    :disabled="readonly || condition.isDefault"
                    aria-label="条件布尔值"
                  />
                  <NInputNumber
                    v-else-if="fieldType(condition) === 'number'"
                    :value="numberValue(condition)"
                    @update:value="
                      condition.value = $event === null ? '' : String($event)
                    "
                    :disabled="readonly || condition.isDefault"
                    placeholder="数值"
                    style="width: 120px"
                  />
                  <NDatePicker
                    v-else-if="fieldType(condition) === 'date'"
                    :formatted-value="condition.value || null"
                    value-format="yyyy-MM-dd"
                    type="date"
                    clearable
                    @update:formatted-value="setDateValue(condition, $event)"
                    :disabled="readonly || condition.isDefault"
                    style="width: 160px"
                  />
                  <NInput
                    v-else
                    v-model:value="condition.value"
                    :disabled="readonly || condition.isDefault"
                    placeholder="值"
                    style="width: 120px"
                    class="flex-shrink-0"
                  />
                  <NButton
                    quaternary
                    type="error"
                    :disabled="readonly"
                    @click="removeCondition(index)"
                    class="flex-shrink-0 ml-auto"
                  >
                    <template #icon>
                      <C_Icon
                        name="mdi:delete"
                        :size="16"
                      />
                    </template>
                  </NButton>
                </div>
                <div class="workflow-condition-row">
                  <NSelect
                    :value="condition.targetNodeId"
                    @update:value="
                      condition.targetNodeId =
                        typeof $event === 'string' ? $event : undefined
                    "
                    :disabled="readonly"
                    :options="branchTargets ? [...branchTargets] : []"
                    clearable
                    placeholder="下一节点（可选）"
                    aria-label="条件目标节点"
                    style="min-width: 180px; flex: 1"
                  />
                  <NInputNumber
                    :value="condition.priority"
                    @update:value="condition.priority = $event ?? undefined"
                    :disabled="readonly"
                    :min="0"
                    :precision="0"
                    placeholder="优先级"
                    aria-label="条件优先级"
                    style="width: 110px"
                  />
                  <NCheckbox
                    v-model:checked="condition.isDefault"
                    :disabled="readonly"
                    >默认分支</NCheckbox
                  >
                </div>
              </NCard>
            </div>
            <NButton
              dashed
              block
              :disabled="readonly"
              @click="addCondition"
              class="w-full"
            >
              <template #icon
                ><C_Icon
                  name="mdi:plus"
                  :size="16"
              /></template>
              添加条件
            </NButton>
          </div>
        </div>
      </div>
    </div>
  </NModal>
</template>

<script setup lang="ts">
  import {
    computed,
    nextTick,
    onBeforeUnmount,
    ref,
    shallowRef,
    watch,
  } from 'vue'
  import {
    NModal,
    NInput,
    NInputNumber,
    NDatePicker,
    NSwitch,
    NCheckbox,
    NRadioGroup,
    NRadio,
    NSpace,
    NCard,
    NSelect,
    NButton,
  } from 'naive-ui'
  import { C_Icon } from '../C_Icon'
  import { C_UserPicker, type UserPickerExpose } from '../C_UserPicker'
  import { getPickerValue } from '../C_DataPicker/source'
  import type {
    WorkflowNode,
    User,
    Department,
    Condition,
    WorkflowConditionField,
  } from './types'
  import {
    createLegacyWorkflowPeople,
    getWorkflowPeople,
    type WorkflowPeopleOptions,
  } from './people'
  import {
    APPROVAL_MODES,
    FIELD_OPTIONS,
    OPERATOR_OPTIONS,
    CONFIG_TITLES,
    createDefaultCondition,
  } from './data'
  import { isCompleteCondition } from './conditions'
  import { useComponentFeedback } from '../../config'
  import { cloneData } from '../../utils/data'

  interface Props {
    show: boolean
    currentNode: WorkflowNode | null
    users: User[]
    departments: Department[]
    people?: WorkflowPeopleOptions
    readonly?: boolean
    conditionFields?: readonly WorkflowConditionField[]
    branchTargets?: readonly { value: string; label: string }[]
  }
  const props = withDefaults(defineProps<Props>(), {
    show: false,
    currentNode: null,
    users: () => [],
    departments: () => [],
    readonly: false,
  })
  const emit = defineEmits<{
    'update:show': [show: boolean]
    save: [
      config: {
        initiators?: User[]
        approvers?: User[]
        copyUsers?: User[]
        approvalMode?: 'any' | 'all' | 'sequence'
        conditions?: Condition[]
      },
    ]
    cancel: []
  }>()
  const message = useComponentFeedback()
  const peoplePicker = shallowRef<UserPickerExpose>()
  const selectedValues = ref<string[]>([])
  const selectedRows = shallowRef<User[]>([])
  const approvalMode = ref<'any' | 'all' | 'sequence'>('any')
  const configLoading = ref(false)
  const conditions = ref<Condition[]>([])
  const session = ref(0)
  let active = true
  const initialRows = computed(() => getWorkflowPeople(props.currentNode))
  const legacyPeople = computed(() =>
    createLegacyWorkflowPeople(
      props.users,
      props.departments,
      initialRows.value
    )
  )
  const people = computed(() => props.people ?? legacyPeople.value)
  const visible = computed({
    get: () => props.show,
    set: (value: boolean) => emit('update:show', value),
  })
  const configTitle = computed(() =>
    props.currentNode?.type === 'start'
      ? '发起人设置'
      : CONFIG_TITLES[props.currentNode?.type as keyof typeof CONFIG_TITLES] ||
        '节点设置'
  )
  const isUserSelectNode = computed(
    () => props.currentNode?.type !== 'condition' && Boolean(props.currentNode)
  )
  const selectionContent = computed(() => {
    if (props.currentNode?.type === 'start')
      return { title: '选择发起人', icon: 'mdi:account-star' }
    if (props.currentNode?.type === 'copy')
      return { title: '选择抄送人', icon: 'mdi:email-outline' }
    return { title: '选择审批人', icon: 'mdi:account-check' }
  })

  function personValue(row: User): string {
    const value = getPickerValue(people.value.source, row)
    if (typeof value !== 'string')
      throw new TypeError('工作流人员编码必须为字符串')
    return value
  }
  function initialize() {
    session.value++
    configLoading.value = false
    selectedRows.value = [...initialRows.value]
    selectedValues.value = initialRows.value.map(row => personValue(row))
    approvalMode.value =
      props.currentNode?.type === 'approval'
        ? (props.currentNode.data.approvalMode ?? 'any')
        : 'any'
    conditions.value =
      props.currentNode?.type === 'condition'
        ? cloneData(props.currentNode.data.conditions ?? [])
        : []
  }
  watch(
    [
      () => props.currentNode,
      () => props.show,
      () => people.value.source,
      () => people.value.scope,
    ],
    initialize,
    { immediate: true, flush: 'sync' }
  )
  watch(() => people.value.fixedFilters, initialize, {
    deep: true,
    flush: 'sync',
  })
  watch(
    () => props.readonly,
    () => {
      session.value++
      configLoading.value = false
    }
  )
  onBeforeUnmount(() => {
    active = false
    session.value++
  })

  function isCurrentSession(node: WorkflowNode, revision: number): boolean {
    return (
      active &&
      props.show &&
      !props.readonly &&
      props.currentNode === node &&
      session.value === revision
    )
  }
  function selectedPeople(node: WorkflowNode): User[] | null {
    const records = new Map(
      selectedRows.value.map(row => [personValue(row), row])
    )
    const ordered = selectedValues.value.flatMap(value => {
      const row = records.get(value)
      return row ? [row] : []
    })
    if (
      ordered.length !== selectedValues.value.length ||
      (node.type !== 'copy' && !ordered.length)
    ) {
      message.error('所选人员已失效，请重新选择')
      return null
    }
    if (ordered.some(person => people.value.rowCheckable?.(person) === false)) {
      message.error('所选人员当前不可选，请重新选择')
      return null
    }
    if (
      people.value.maxSelection !== undefined &&
      ordered.length > people.value.maxSelection
    ) {
      message.error('所选人员超过数量限制，请调整后重试')
      return null
    }
    return ordered
  }
  function savePeople(node: WorkflowNode, ordered: User[]) {
    if (node.type === 'approval')
      emit('save', { approvers: ordered, approvalMode: approvalMode.value })
    else if (node.type === 'copy') emit('save', { copyUsers: ordered })
    else emit('save', { initiators: ordered })
  }
  async function commitPeople(
    node: WorkflowNode,
    revision: number
  ): Promise<boolean> {
    if (!peoplePicker.value || !(await peoplePicker.value.confirm()))
      return false
    await nextTick()
    if (!isCurrentSession(node, revision)) return false
    // 人员来源可以重排返回行，保存仍严格遵循用户选定的顺序。
    const ordered = selectedPeople(node)
    if (!ordered) return false
    savePeople(node, ordered)
    return true
  }
  async function saveNodeConfig(): Promise<boolean> {
    const node = props.currentNode
    if (!node || props.readonly || configLoading.value) return false
    const revision = session.value
    configLoading.value = true
    try {
      return node.type === 'condition'
        ? saveConditions()
        : await commitPeople(node, revision)
    } catch (error) {
      if (isCurrentSession(node, revision)) message.error('保存配置失败', error)
      return false
    } finally {
      if (revision === session.value) configLoading.value = false
    }
  }
  function saveConditions(): boolean {
    if (
      !conditions.value.length ||
      conditions.value.some(
        condition => !isCompleteCondition(condition, props.conditionFields)
      )
    ) {
      message.error('请完善所有条件配置')
      return false
    }
    emit('save', { conditions: cloneData(conditions.value) })
    return true
  }
  function handleCancel() {
    session.value++
    peoplePicker.value?.close()
    emit('update:show', false)
    emit('cancel')
  }
  function handleKeydown(event: KeyboardEvent) {
    if (event.key !== 'Escape') return
    event.preventDefault()
    event.stopPropagation()
    handleCancel()
  }
  const fieldOptions = computed(
    () =>
      props.conditionFields?.map(field => ({
        value: field.key,
        label: field.label,
      })) ?? FIELD_OPTIONS
  )
  const fieldType = (condition: Condition) =>
    props.conditionFields?.find(field => field.key === condition.field)?.type ??
    'text'
  const operatorsFor = (condition: Condition) => {
    const allowed = props.conditionFields?.find(
      field => field.key === condition.field
    )?.operators
    return allowed
      ? OPERATOR_OPTIONS.filter(option =>
          allowed.includes(option.value as Condition['operator'])
        )
      : OPERATOR_OPTIONS
  }
  function resetConditionValue(condition: Condition) {
    condition.value = fieldType(condition) === 'boolean' ? 'false' : ''
    const options = operatorsFor(condition)
    if (!options.some(option => option.value === condition.operator))
      condition.operator =
        (options[0]?.value as Condition['operator']) ?? 'equals'
  }
  function setDateValue(
    condition: Condition,
    value: string | [string, string] | null
  ) {
    condition.value = typeof value === 'string' ? value : ''
  }
  function numberValue(condition: Condition): number | null {
    const value = Number(condition.value)
    return condition.value.trim() && Number.isFinite(value) ? value : null
  }
  const addCondition = () => conditions.value.push(createDefaultCondition())
  const removeCondition = (index: number) => conditions.value.splice(index, 1)
</script>

<style scoped>
  .workflow-condition-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    padding: 8px;
  }
  .workflow-node-config {
    min-width: 0;
  }
  .workflow-people-content {
    max-height: min(68vh, 680px);
    overflow: auto;
  }
</style>
