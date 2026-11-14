<script setup lang="ts">
  import { computed, ref, type CSSProperties } from 'vue'
  import { useRouter } from 'vue-router'
  import hljs from 'highlight.js/lib/core'
  import typescript from 'highlight.js/lib/languages/typescript'
  import {
    NConfigProvider,
    NButton,
    NSwitch,
    NRadioGroup,
    NRadioButton,
    NTag,
    zhCN,
  } from 'naive-ui'
  import {
    createComponentTheme,
    COMPONENT_COLOR_PALETTES,
  } from '@robot-admin/naive-ui-components/config'
  import {
    C_Density,
    type ComponentDensity,
  } from '@robot-admin/naive-ui-components/C_Density'
  import {
    C_Form,
    defineFormOptions,
  } from '@robot-admin/naive-ui-components/C_Form'
  import { C_Select } from '@robot-admin/naive-ui-components/C_Select'
  import { C_AutoComplete } from '@robot-admin/naive-ui-components/C_AutoComplete'
  import { C_City } from '@robot-admin/naive-ui-components/C_City'
  import {
    C_ActionBar,
    type ActionItem,
  } from '@robot-admin/naive-ui-components/C_ActionBar'
  import { C_Steps } from '@robot-admin/naive-ui-components/C_Steps'
  import {
    C_Tabs,
    type TabsValue,
  } from '@robot-admin/naive-ui-components/C_Tabs'
  import { C_TagsView } from '@robot-admin/naive-ui-components/C_TagsView'
  import { C_Transfer } from '@robot-admin/naive-ui-components/C_Transfer'
  import {
    C_Timeline,
    type TimelineItem,
  } from '@robot-admin/naive-ui-components/C_Timeline'
  import { C_Editor } from '@robot-admin/naive-ui-components/C_Editor'
  import { C_Code } from '@robot-admin/naive-ui-components/C_Code'
  import '@robot-admin/naive-ui-components/C_Form/style.css'
  import '@robot-admin/naive-ui-components/C_Select/style.css'
  import '@robot-admin/naive-ui-components/C_ActionBar/style.css'
  import '@robot-admin/naive-ui-components/C_City/style.css'
  import '@robot-admin/naive-ui-components/C_Steps/style.css'
  import '@robot-admin/naive-ui-components/C_Tabs/style.css'
  import '@robot-admin/naive-ui-components/C_TagsView/style.css'
  import '@robot-admin/naive-ui-components/C_Transfer/style.css'
  import '@robot-admin/naive-ui-components/C_Timeline/style.css'
  import '@robot-admin/naive-ui-components/C_Editor/style.css'
  import '@robot-admin/naive-ui-components/C_Code/style.css'
  import './visual-standards.css'

  defineOptions({ name: 'VisualStandards' })
  hljs.registerLanguage('typescript', typescript)
  const router = useRouter()
  const dark = ref(false)
  const brand = ref('purple')
  const density = ref<ComponentDensity>('compact')
  const primary = computed(() => {
    if (brand.value === 'purple') return dark.value ? '#b8a4ff' : '#7c5ce7'
    return COMPONENT_COLOR_PALETTES[dark.value ? 'dark' : 'light'].primary
  })
  const themeConfig = computed(() =>
    createComponentTheme({
      mode: dark.value ? 'dark' : 'light',
      primary: primary.value,
      radius: 8,
    })
  )
  const pageStyle = computed<CSSProperties>(() => {
    const { common = {} } = themeConfig.value.themeOverrides
    return {
      '--vs-bg': common.bodyColor,
      '--vs-surface': common.cardColor,
      '--vs-muted': common.actionColor,
      '--vs-border': common.borderColor,
      '--vs-text': common.textColor1,
      '--vs-secondary': common.textColor2,
      '--vs-quiet': common.textColor3,
      '--vs-accent': primary.value,
    }
  })
  const fieldSize = computed(() =>
    density.value === 'compact' ? 'small' : 'large'
  )
  const receipt = ref('交互就绪')
  const form = ref({ project: '统一设计语言', owner: '陈予' })
  const fields = defineFormOptions<typeof form.value>([
    {
      prop: 'project',
      label: '项目名称',
      type: 'input',
      attrs: { placeholder: '输入项目名称' },
    },
    {
      prop: 'owner',
      label: '负责人',
      type: 'input',
      attrs: { placeholder: '输入负责人' },
    },
  ])
  const team = ref<string | null>('platform')
  const command = ref('')
  const city = ref('杭州')
  const teams = [
    { label: '平台设计组', value: 'platform' },
    { label: '应用研发组', value: 'application' },
    { label: '交付保障组', value: 'delivery' },
  ]
  const actions: ActionItem[] = [
    {
      key: 'add',
      onClick: () => {
        receipt.value = '已创建一项演示记录'
      },
    },
    {
      key: 'save',
      onClick: () => {
        receipt.value = '当前配置已保留在本页'
      },
    },
    {
      key: 'refresh',
      onClick: () => {
        receipt.value = '演示数据已就绪'
      },
    },
    {
      key: 'export',
      onClick: () => {
        receipt.value = '这是交互演示，不会生成业务文件'
      },
    },
  ]
  const step = ref(1)
  const steps = [
    {
      title: '基础资料',
      description: '保持字段清晰可读',
      icon: 'mdi:form-select',
    },
    {
      title: '协作配置',
      description: '确认当前处理阶段',
      icon: 'i-mdi:tune-variant',
    },
    { title: '完成发布', description: '让结果有明确反馈' },
  ]
  const activeTab = ref<TabsValue>('overview')
  const tabs = [
    { key: 'overview', label: '设计总览', icon: 'mdi:palette-outline' },
    { key: 'standards', label: '控件规范', icon: 'mdi:tune-variant', badge: 6 },
    { key: 'history', label: '变更记录', icon: 'mdi:history' },
  ]
  const capabilities = [
    {
      key: 'form',
      label: '表单与校验',
      description: '扁平配置、清晰反馈',
      icon: 'mdi:form-select',
    },
    {
      key: 'search',
      label: '候选与搜索',
      description: '本地或远程来源',
      icon: 'mdi:magnify',
    },
    {
      key: 'workflow',
      label: '流程与协作',
      description: '选人、节点与审批',
      icon: 'mdi:source-branch',
    },
    {
      key: 'files',
      label: '附件与预览',
      description: '上传、裁剪与文档',
      icon: 'mdi:file-document-outline',
    },
    {
      key: 'chart',
      label: '数据与图表',
      description: '多维信息保持可读',
      icon: 'mdi:chart-box-outline',
    },
    {
      key: 'editor',
      label: '内容工作区',
      description: '编辑体验与主题协同',
      icon: 'mdi:text-box-edit-outline',
    },
  ]
  const selected = ref<string[]>(['form', 'search'])
  const timeline: TimelineItem[] = [
    {
      id: 'review',
      title: '视觉与交互复核',
      time: '进行中',
      icon: 'mdi:eye-check-outline',
      status: 'info',
      content:
        '<p>切换主题与品牌色，检查输入、浮层、导航和编辑工作区是否保持一致。</p>',
      tags: [{ text: '当前阶段', type: 'info' }],
    },
    {
      id: 'details',
      title: '完整长说明',
      time: '验收示例',
      icon: 'mdi:text-long',
      status: 'success',
      collapsible: true,
      content:
        '<p><strong>展开后应自然展示全部内容，末尾验收标记需要始终可见。</strong></p>' +
        Array.from(
          { length: 24 },
          (_, index) =>
            `<p>${String(index + 1).padStart(2, '0')} · 此条用于验证长审批说明、交付记录和操作指引的自然高度。内容展开后不应被固定高度裁切，键盘与页面滚动仍可正常使用。</p>`
        ).join('') +
        '<p><strong>长说明验收完成 · END OF RECORD</strong></p>',
    },
  ]
  const showEditor = ref(true)
  const article = ref(
    '<h2>让每一次操作，都有清晰的回应。</h2><p>编辑、选择与导航共享同一组设计规则。切换页面上方的主题，内容和输入状态会被保留。</p><p><strong>质感来自一致的细节。</strong></p>'
  )
  const integration = computed(
    () =>
      `const theme = createComponentTheme({\n  mode: '${dark.value ? 'dark' : 'light'}',\n  primary: '${primary.value}',\n  radius: 8,\n})\n\n// 交给应用已有的 NConfigProvider\n<NConfigProvider v-bind="theme">...</NConfigProvider>`
  )
</script>

<template>
  <NConfigProvider
    v-bind="themeConfig"
    :hljs="hljs"
    :locale="zhCN"
  >
    <main
      class="vs-page"
      :style="pageStyle"
    >
      <div class="vs-shell">
        <header class="vs-header">
          <div
            ><a
              class="vs-back"
              href="./people-workflow.html"
              >← 协作与审批体验</a
            ><p class="vs-eyebrow">ROBOT UI · VISUAL STANDARD</p
            ><h1>一套语言，贯穿每个界面。</h1
            ><p class="vs-intro"
              >从字段到工作区，让密度、色彩与交互保持清晰、一致。</p
            ></div
          >
          <div class="vs-controls">
            <label class="vs-switch"
              ><span>深色外观</span
              ><NSwitch
                v-model:value="dark"
                aria-label="深色外观"
            /></label>
            <div class="vs-control"
              ><span>品牌强调</span
              ><NRadioGroup
                v-model:value="brand"
                size="small"
                aria-label="品牌强调"
                ><NRadioButton value="purple">灵感紫</NRadioButton
                ><NRadioButton value="blue">标准蓝</NRadioButton></NRadioGroup
              ></div
            >
            <div class="vs-control"
              ><span>内容密度</span
              ><NRadioGroup
                v-model:value="density"
                size="small"
                aria-label="内容密度"
                ><NRadioButton value="compact">紧凑</NRadioButton
                ><NRadioButton value="comfortable"
                  >舒适</NRadioButton
                ></NRadioGroup
              ></div
            >
          </div>
        </header>
        <div class="vs-summary"
          ><div><span class="vs-dot" />{{ dark ? '深色' : '浅色' }}外观</div
          ><div>{{
            density === 'compact'
              ? '紧凑密度 · 适合高频操作'
              : '舒适密度 · 留足阅读空间'
          }}</div
          ><div
            class="vs-summary-status"
            aria-live="polite"
            >{{ receipt }}</div
          ></div
        >
        <C_Density :density="density">
          <div class="vs-grid">
            <section class="vs-card">
              <div class="vs-card-heading"
                ><div
                  ><span class="vs-number">01 / INPUT</span
                  ><h2>字段与动作，整齐落位。</h2
                  ><p>使用相同密度，保持表单与独立字段的高度一致。</p></div
                ><NTag
                  :bordered="false"
                  type="info"
                  >{{ fieldSize }}</NTag
                ></div
              >
              <C_Form
                v-model="form"
                :options="fields"
                :config="{
                  labelPlacement: 'top',
                  showActions: false,
                  grid: { cols: 2, minItemWidth: 160 },
                }"
              />
              <div class="vs-fields"
                ><label
                  ><span>所属团队</span
                  ><C_Select
                    v-model="team"
                    :options="teams"
                    clearable /></label
                ><label
                  ><span>快捷搜索</span
                  ><C_AutoComplete
                    v-model="command"
                    :options="['查看执行记录', '打开审批设计', '管理协作成员']"
                    placeholder="试试输入“查看”"
                    clearable /></label
                ><label class="vs-city"
                  ><span>服务城市</span><C_City v-model="city" /></label
              ></div>
              <div class="vs-actions"
                ><C_ActionBar
                  :actions="actions"
                  :config="{
                    inline: true,
                    size: fieldSize,
                    compact: density === 'compact',
                    wrap: true,
                  }"
              /></div>
            </section>
            <section class="vs-card">
              <div class="vs-card-heading"
                ><div
                  ><span class="vs-number">02 / NAVIGATION</span
                  ><h2>所处位置，一眼明了。</h2
                  ><p>步骤、内容标签和路由标签表达不同层级。</p></div
                ></div
              >
              <C_Steps
                v-model:current="step"
                :steps="steps"
                clickable
              />
              <div class="vs-navigation"
                ><C_Tabs
                  v-model="activeTab"
                  :items="tabs"
                  size="large"
                  tabs-only
                /><div class="vs-tab-body"
                  ><strong>{{
                    tabs.find(item => item.key === activeTab)?.label
                  }}</strong
                  ><p
                    >当前标签的字号与品牌强调跟随配置，内容切换不会改变其他输入。</p
                  ></div
                ></div
              >
              <div class="vs-route-actions"
                ><NButton
                  size="tiny"
                  quaternary
                  @click="router.push('/overview')"
                  >总览</NButton
                ><NButton
                  size="tiny"
                  quaternary
                  @click="router.push('/standards')"
                  >规范</NButton
                ><NButton
                  size="tiny"
                  quaternary
                  @click="router.push('/records')"
                  >记录</NButton
                ></div
              >
              <C_TagsView
                home-path="/overview"
                home-title="设计总览"
                home-icon="mdi:palette-outline"
                persist-key=""
              />
            </section>
            <section class="vs-card vs-span">
              <div class="vs-card-heading"
                ><div
                  ><span class="vs-number">03 / COMPOSITION</span
                  ><h2>复杂信息，也能从容组织。</h2
                  ><p>穿梭选择保留清晰状态，时间线完整呈现过程。</p></div
                ><NTag :bordered="false"
                  >已选 {{ selected.length }} 项</NTag
                ></div
              >
              <div class="vs-composition"
                ><C_Transfer
                  v-model="selected"
                  :data="capabilities"
                  :titles="['可选能力', '已加入方案']"
                  :size="fieldSize"
                  filterable
                /><div class="vs-timeline"
                  ><C_Timeline :items="timeline" /><p class="vs-help"
                    >展开“完整长说明”，可检查超过 800px 的内容是否完整显示。</p
                  ></div
                ></div
              >
            </section>
            <section class="vs-card vs-span">
              <div class="vs-card-heading"
                ><div
                  ><span class="vs-number">04 / WORKSPACE</span
                  ><h2>同一主题，延伸到编辑工作区。</h2
                  ><p
                    >工具栏、正文与弹出菜单跟随外观切换，编辑草稿持续保留。</p
                  ></div
                ><label class="vs-switch"
                  ><span>显示编辑器</span
                  ><NSwitch
                    v-model:value="showEditor"
                    aria-label="显示编辑器" /></label
              ></div>
              <C_Editor
                v-if="showEditor"
                v-model="article"
                :height="290"
                placeholder="在这里继续创作……"
              />
              <div
                v-else
                class="vs-editor-placeholder"
                >开启右侧开关，即可检查编辑器的真实工具栏与菜单。</div
              >
              <details class="vs-integration"
                ><summary>查看主题接入方式</summary
                ><C_Code
                  :code="integration"
                  language="typescript"
                  title="一个配置，交给现有 Provider"
                  show-fullscreen
              /></details>
            </section>
          </div>
        </C_Density>
        <footer class="vs-footer"
          ><span>ROBOT UI SYSTEM</span><p>一致的细节，让复杂界面更易理解。</p
          ><span>NAIVE UI · VUE 3</span></footer
        >
      </div>
    </main>
  </NConfigProvider>
</template>
