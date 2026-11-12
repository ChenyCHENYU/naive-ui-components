<script setup lang="ts">
  import {
    NButton,
    NConfigProvider,
    NSelect,
    NSwitch,
    darkTheme,
    zhCN,
  } from 'naive-ui'
  import { Icon } from '@iconify/vue'
  import { C_Tree } from '@robot-admin/naive-ui-components/C_Tree'
  import { C_OrgChart } from '@robot-admin/naive-ui-components/C_OrgChart'
  import {
    kindLabels,
    statusLabels,
    useOrganizationDemo,
  } from './organization-data'
  import '@robot-admin/naive-ui-components/C_Tree/style.css'
  import '@robot-admin/naive-ui-components/C_OrgChart/style.css'
  import './organization.css'

  defineOptions({ name: 'OrganizationExperience' })
  const {
    organization,
    directoryNodes,
    businessOrganization,
    allNodes,
    dark,
    compact,
    avatars,
    managementPermission,
    schema,
    direction,
    lineStyle,
    tree,
    defaultChart,
    businessChart,
    selectedKeys,
    treeExpandedKeys,
    selectedKey,
    expandedKeys,
    locateKey,
    locateOptions,
    density,
    selectedNode,
    sourceUnchanged,
    events,
    busyKey,
    nodeIcon,
    iconConfig,
    actions,
    selectDirectory,
    selectChart,
    toggleChart,
    fitChart,
    locate,
    runAction,
  } = useOrganizationDemo()
  const directions = [
    { label: '纵向', value: 'vertical' },
    { label: '横向', value: 'horizontal' },
  ]
  const lines = [
    { label: '圆角折线', value: 'rounded' },
    { label: '直角折线', value: 'stepped' },
    { label: '直线', value: 'straight' },
  ]
</script>

<template>
  <NConfigProvider
    :theme="dark ? darkTheme : null"
    :locale="zhCN"
  >
    <main
      class="org-demo"
      :class="{ 'org-demo--dark': dark }"
    >
      <div class="org-workspace">
        <header class="org-page-header">
          <div>
            <a
              class="org-back"
              href="./contracts.html"
              ><Icon icon="mdi:arrow-top-right" /> 组件契约演示</a
            >
            <p class="org-eyebrow">ORGANIZATION EXPERIENCE</p>
            <h1>目录清楚，组织有形。</h1>
            <p class="org-page-description"
              >同一份组织关系，两种清晰的视角。侧栏用于检索与操作，架构图用于呈现与定位。</p
            >
          </div>
          <label class="org-theme-control"
            ><span>{{ dark ? '深色主题' : '浅色主题' }}</span
            ><NSwitch
              v-model:value="dark"
              aria-label="切换深色主题"
          /></label>
        </header>

        <div
          class="org-overview"
          aria-label="组织概况"
        >
          <div class="org-brand-mark"
            ><Icon
              icon="mdi:office-building-outline"
              width="26"
          /></div>
          <div class="org-company-title"
            ><strong>{{ organization.label }}</strong
            ><span>离线组织演示 · 人数采用独立业务统计</span></div
          >
          <div class="org-metric"
            ><strong>{{ organization.memberCount }}</strong
            ><span>组织成员</span></div
          >
          <div class="org-metric"><strong>3</strong><span>一级部门</span></div>
          <div class="org-metric"
            ><strong>{{ allNodes.length }}</strong
            ><span>演示节点</span></div
          >
          <span class="org-offline-badge"><i /> 无外部请求</span>
        </div>

        <div class="org-layout">
          <section
            class="org-directory org-surface"
            aria-labelledby="directory-title"
          >
            <div class="org-section-heading">
              <div class="org-section-icon"
                ><Icon
                  icon="mdi:file-tree"
                  width="19"
              /></div>
              <div
                ><h2 id="directory-title">组织目录</h2
                ><p>C_Tree · 检索、选择与节点操作</p></div
              >
            </div>
            <div class="org-directory-options">
              <label
                >紧凑<NSwitch
                  v-model:value="compact"
                  size="small"
                  aria-label="目录紧凑模式"
              /></label>
              <label
                >人员头像<NSwitch
                  v-model:value="avatars"
                  size="small"
                  aria-label="显示人员头像"
              /></label>
              <label
                >管理权限<NSwitch
                  v-model:value="managementPermission"
                  size="small"
                  aria-label="管理操作权限"
              /></label>
            </div>
            <C_Tree
              ref="tree"
              v-model:selected-keys="selectedKeys"
              v-model:expanded-keys="treeExpandedKeys"
              :data="directoryNodes"
              key-field="id"
              label-field="label"
              type-field="kind"
              :density="density"
              :icon-config="iconConfig"
              :actions="actions"
              :addable="false"
              :refreshable="false"
              :show-line="true"
              search-placeholder="搜索部门或成员"
              @node-select="selectDirectory"
              @node-action="runAction"
            >
              <template
                v-if="avatars"
                #prefix="context"
              >
                <span
                  v-if="
                    context.option.kind === 'person' ||
                    context.option.kind === 'manager'
                  "
                  class="org-tree-avatar"
                  :class="`org-status--${context.option.status}`"
                  :style="{ '--avatar-color': context.option.color }"
                  aria-hidden="true"
                  >{{ context.option.initials }}<i
                /></span>
                <Icon
                  v-else
                  :icon="nodeIcon(context).name"
                  :color="nodeIcon(context).color"
                  width="18"
                />
              </template>
              <template #label="{ option }">
                <span class="org-tree-label">
                  <span>{{ option.label }}</span>
                  <span
                    v-if="
                      option.kind === 'company' || option.kind === 'department'
                    "
                    class="org-member-count"
                    >{{ option.memberCount }}<span>人</span></span
                  >
                  <span
                    v-else-if="option.status !== 'active'"
                    class="org-tree-state"
                    :class="`org-status--${option.status}`"
                    >{{ statusLabels[option.status] }}</span
                  >
                </span>
              </template>
            </C_Tree>
            <div class="org-directory-note"
              ><Icon
                icon="mdi:shield-check-outline"
                width="17"
              /><span
                >悬停节点可查看或同步。关闭管理权限后同步按钮禁用；公司与停用成员始终不可同步。</span
              ></div
            >
            <div class="org-icon-legend"
              ><span><i class="org-active-dot" />正常</span
              ><span><i class="org-pending-dot" />待入职</span
              ><span><i class="org-inactive-dot" />已停用</span></div
            >
          </section>

          <section
            class="org-chart-panel org-surface"
            aria-labelledby="chart-title"
          >
            <div class="org-chart-header">
              <div class="org-section-heading"
                ><div class="org-section-icon"
                  ><Icon
                    icon="mdi:sitemap-outline"
                    width="20" /></div
                ><div
                  ><h2 id="chart-title">组织架构</h2
                  ><p>C_OrgChart · 关系呈现、折叠与画布定位</p></div
                ></div
              >
              <div
                class="org-schema-tabs"
                aria-label="数据模型"
              >
                <NButton
                  :type="schema === 'business' ? 'primary' : 'default'"
                  size="small"
                  :secondary="schema === 'business'"
                  :aria-pressed="schema === 'business'"
                  @click="schema = 'business'"
                  >业务字段 + 卡片</NButton
                >
                <NButton
                  :type="schema === 'default' ? 'primary' : 'default'"
                  size="small"
                  :secondary="schema === 'default'"
                  :aria-pressed="schema === 'default'"
                  @click="schema = 'default'"
                  >默认字段</NButton
                >
              </div>
            </div>
            <div class="org-chart-toolbar">
              <label
                >方向<NSelect
                  v-model:value="direction"
                  :options="directions"
                  size="small"
                  aria-label="架构图布局方向"
              /></label>
              <label
                >连线<NSelect
                  v-model:value="lineStyle"
                  :options="lines"
                  size="small"
                  aria-label="架构图连线样式"
              /></label>
              <div class="org-chart-buttons"
                ><NButton
                  size="small"
                  @click="toggleChart"
                  >{{ expandedKeys.length ? '全部收起' : '全部展开' }}</NButton
                ><NButton
                  size="small"
                  @click="fitChart"
                  >适应视野</NButton
                ></div
              >
            </div>
            <div class="org-chart-canvas">
              <div class="org-canvas-label"
                ><span>{{
                  schema === 'business'
                    ? '原业务字段直接映射'
                    : '默认模型 · 无需自定义插槽'
                }}</span
                ><span>滚轮缩放 · 拖动空白平移</span></div
              >
              <C_OrgChart
                v-if="schema === 'business'"
                ref="businessChart"
                v-model:selected-key="selectedKey"
                v-model:expanded-keys="expandedKeys"
                :data="businessOrganization"
                key-field="code"
                label-field="title"
                children-field="nodes"
                subtitle-field="role"
                avatar-field="picture"
                :direction="direction"
                :line-style="lineStyle"
                :line-color="dark ? '#536c7e' : '#bcced6'"
                :node-spacing="24"
                :level-spacing="52"
                :fit-on-init="true"
                @node-click="selectChart"
              >
                <template #node="{ node, isSelected, select }">
                  <div
                    class="org-business-card"
                    :class="[
                      `org-business-card--${node.kind}`,
                      { 'org-business-card--selected': isSelected },
                    ]"
                  >
                    <button
                      type="button"
                      class="org-card-identity"
                      :aria-pressed="isSelected"
                      :aria-label="`选择 ${node.title}`"
                      @click="select"
                      ><span
                        class="org-card-avatar"
                        :style="{ '--avatar-color': node.color }"
                        >{{ node.initials }}</span
                      ><span class="org-card-name"
                        ><span class="org-card-kind">{{
                          kindLabels[node.kind]
                        }}</span
                        ><strong>{{ node.title }}</strong></span
                      ><i
                        class="org-card-status"
                        :class="`org-status--${node.state}`"
                        :title="statusLabels[node.state]"
                    /></button>
                    <p>{{ node.role }}</p>
                    <div class="org-card-meta"
                      ><span>{{
                        node.kind === 'company' || node.kind === 'department'
                          ? `负责人 ${node.owner}`
                          : statusLabels[node.state]
                      }}</span
                      ><strong
                        v-if="
                          node.kind === 'company' || node.kind === 'department'
                        "
                        >{{ node.memberTotal }}<small> 人</small></strong
                      ></div
                    >
                  </div>
                </template>
              </C_OrgChart>
              <C_OrgChart
                v-else
                ref="defaultChart"
                v-model:selected-key="selectedKey"
                v-model:expanded-keys="expandedKeys"
                :data="organization"
                :direction="direction"
                :line-style="lineStyle"
                :line-color="dark ? '#536c7e' : '#bcced6'"
                :fit-on-init="true"
                @node-click="selectChart"
              />
            </div>
            <div class="org-locate-bar"
              ><Icon
                icon="mdi:target"
                width="18"
              /><NSelect
                v-model:value="locateKey"
                :options="locateOptions"
                size="small"
                filterable
                aria-label="选择待定位的组织节点"
              /><NButton
                size="small"
                type="primary"
                secondary
                @click="locate()"
                >定位节点</NButton
              ><span>收起后仍可定位到深层成员</span></div
            >
          </section>
        </div>

        <section class="org-bottom-grid">
          <article
            class="org-surface org-selection"
            aria-labelledby="selection-title"
            ><p class="org-eyebrow">CURRENT SELECTION</p
            ><h2 id="selection-title">{{
              selectedNode?.label ?? '尚未选择'
            }}</h2
            ><p>{{ selectedNode?.subtitle ?? '选择目录或架构图中的节点' }}</p
            ><dl
              ><div
                ><dt>节点类型</dt
                ><dd>{{
                  selectedNode ? kindLabels[selectedNode.kind] : '—'
                }}</dd></div
              ><div
                ><dt>业务状态</dt
                ><dd>{{
                  selectedNode ? statusLabels[selectedNode.status] : '—'
                }}</dd></div
              ><div
                ><dt>唯一键</dt><dd>{{ selectedKey ?? '—' }}</dd></div
              ></dl
            ></article
          >
          <article
            class="org-surface org-activity"
            aria-labelledby="activity-title"
            ><div class="org-activity-heading"
              ><h2 id="activity-title">交互反馈</h2
              ><span
                class="org-source-check"
                :class="{ 'org-source-check--error': !sourceUnchanged }"
                ><Icon
                  :icon="
                    sourceUnchanged ? 'mdi:check-circle-outline' : 'mdi:close'
                  "
                  width="15"
                />{{
                  sourceUnchanged ? '原始数据未改写' : '数据检查失败'
                }}</span
              ></div
            ><ol aria-live="polite"
              ><li
                v-for="(event, index) in events"
                :key="`${index}-${event}`"
                ><span>{{ String(index + 1).padStart(2, '0') }}</span
                >{{ event }}</li
              ></ol
            ><p class="org-activity-boundary">{{
              busyKey
                ? '正在运行约 1 秒的本地模拟操作。'
                : '演示只持有选择、展开与忙碌状态；权限来源、统计口径及业务请求由使用侧管理。'
            }}</p></article
          >
        </section>
        <footer class="org-footer"
          >独立组件演示 · 无后端依赖 · Tree 与 OrgChart 可分别按需引入</footer
        >
      </div>
    </main>
  </NConfigProvider>
</template>
