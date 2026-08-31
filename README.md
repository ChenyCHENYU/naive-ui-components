<div align="center">

# @robot-admin/naive-ui-components

**基于 Naive UI 的 Vue 3 企业级组件库**

从 Robot Admin 中提炼的 51 个高质量业务组件，支持全量注册、按需导入（Tree-Shaking）和子路径独立导入。

[![NPM Version](https://img.shields.io/npm/v/@robot-admin/naive-ui-components)](https://www.npmjs.com/package/@robot-admin/naive-ui-components)
[![License](https://img.shields.io/npm/l/@robot-admin/naive-ui-components)](./LICENSE)

[在线文档](https://www.tzagileteam.com/robot/components/preface) · [GitHub](https://github.com/ChenyCHENYU/naive-ui-components) · [NPM](https://www.npmjs.com/package/@robot-admin/naive-ui-components)

[English](./README_EN.md)

</div>

---

## 📦 安装

```bash
bun add @robot-admin/naive-ui-components
```

必需的对等依赖：

```bash
bun add vue@^3.5.0 naive-ui@^2.35.0 @robot-admin/form-validate@^2.0.0
```

### 🚀 快速开始

#### 全局注册

```typescript
import { createApp } from 'vue'
import NaiveUIComponents from '@robot-admin/naive-ui-components'
import '@robot-admin/naive-ui-components/style.css'

const app = createApp(App)
app.use(NaiveUIComponents)
app.mount('#app')
```

#### 按需导入（主入口 Tree-Shaking）

```vue
<script setup lang="ts">
  import { C_Icon, C_Table, C_Form } from '@robot-admin/naive-ui-components'
  import '@robot-admin/naive-ui-components/style.css'
</script>
```

#### 子路径独立导入（推荐，最小打包体积）

每个组件都提供独立的子路径入口，仅加载目标组件的代码和类型：

```vue
<script setup lang="ts">
  import { C_Form } from '@robot-admin/naive-ui-components/C_Form'
  import { C_Table } from '@robot-admin/naive-ui-components/C_Table'
  import { C_Icon } from '@robot-admin/naive-ui-components/C_Icon'
  import { createMenuOptions } from '@robot-admin/naive-ui-components/C_Menu'
  import '@robot-admin/naive-ui-components/style.css'
</script>
```

> 子路径导入提供完整的 TypeScript 类型支持（`.d.ts`），IDE 可自动补全 props / emits / slots。组件相关工具函数（如 `createMenuOptions`）也从对应组件子路径导出，避免为了单个工具加载组件库根入口。

#### Composables 单独使用

```typescript
import {
  useTableManager,
  useFormState,
  usePlayerCore,
} from '@robot-admin/naive-ui-components'
```

#### 自动按需导入（推荐）

Resolver 默认从组件子路径加载，避免只使用少量组件时把整个组件库及重型运行依赖带入首屏：

```typescript
import Components from 'unplugin-vue-components/vite'
import { RobotNaiveUiResolver } from '@robot-admin/naive-ui-components/resolver'

Components({
  resolvers: [RobotNaiveUiResolver({ importStyle: true })],
})
```

如需兼容旧项目的主入口导入，可显式设置 `importOnDemand: false`。

### C_Form / C_Table 推荐用法

将字段、列和配置对象定义在 `setup` 中，避免模板内临时创建对象；异步保存直接放入配置回调，组件会处理提交锁、校验和失败后的编辑态保留。

```vue
<script setup lang="ts">
  import { ref } from 'vue'
  import {
    C_Form,
    type FormConfig,
    type FormInstance,
    type FormModel,
    type FormOption,
  } from '@robot-admin/naive-ui-components/C_Form'

  const formRef = ref<FormInstance>()
  const model = ref<FormModel>({ name: '', departmentId: null })
  const fields: FormOption[] = [
    {
      type: 'input',
      prop: 'name',
      label: '名称',
      required: true,
      rules: [{ required: true, message: '请输入名称', trigger: 'blur' }],
    },
    {
      type: 'select',
      prop: 'departmentId',
      label: '部门',
      asyncOptions: async (_model, context) =>
        fetch('/api/departments', { signal: context?.signal }).then(response =>
          response.json()
        ),
    },
  ]
  const config: FormConfig = {
    mode: 'edit',
    validateOnChange: true,
    onSubmit: async ({ model: validatedModel }) => save(validatedModel),
    onError: (error, context) => reportError(error, context),
  }
</script>

<template>
  <C_Form
    ref="formRef"
    v-model="model"
    :options="fields"
    :config="config"
  />
</template>
```

远程分页时只传当前页数据，并设置 `remote` 与服务端 `total`；本地分页则传全量数据并省略 `remote`，组件会自动切片。`row-key` 必须稳定且唯一。

```vue
<script setup lang="ts">
  import { computed, ref } from 'vue'
  import {
    C_Table,
    type DataRecord,
    type TableColumn,
    type TableConfig,
  } from '@robot-admin/naive-ui-components/C_Table'

  const rows = ref<DataRecord[]>([])
  const total = ref(0)
  const query = ref({ page: 1, pageSize: 20 })
  const columns: TableColumn[] = [
    { key: 'name', title: '名称', editable: true },
  ]
  const config = computed<TableConfig>(() => ({
    pagination: {
      enabled: true,
      remote: true,
      total: total.value,
      ...query.value,
    },
    selection: { enabled: true },
    edit: {
      enabled: true,
      mode: 'row',
      onSave: row => saveRow(row),
      onError: error => reportError(error),
    },
  }))
  const handlePageChange = (page: number, pageSize: number) => {
    query.value = { page, pageSize }
    void loadPage()
  }
</script>

<template>
  <C_Table
    :columns="columns"
    :data="rows"
    :row-key="row => row.id as string"
    :config="config"
    @pagination-change="handlePageChange"
  />
</template>
```

### 📋 组件清单（51 个）

> 💡 所有组件均提供 **在线交互演示**，访问 [组件文档](https://www.tzagileteam.com/robot/components/preface) 可直接在页面中体验真实效果（通过 iframe 嵌入 Robot Admin 生产环境）。

#### 基础组件

| 组件             | 说明             | 外部依赖                    |
| ---------------- | ---------------- | --------------------------- |
| `C_Icon`         | Iconify 图标封装 | `@iconify/vue`              |
| `C_Code`         | 代码高亮显示     | `highlight.js`              |
| `C_Barcode`      | 条形码生成器     | `@chenfengyuan/vue-barcode` |
| `C_Captcha`      | 拼图验证码       | `vue3-puzzle-vcode`         |
| `C_Cascade`      | 级联面板选择器   | -                           |
| `C_Guide`        | 新手引导         | `driver.js`                 |
| `C_Progress`     | 增强进度条       | -                           |
| `C_Steps`        | 步骤条           | -                           |
| `C_ActionBar`    | 操作按钮栏       | -                           |
| `C_Theme`        | 主题切换器       | -                           |
| `C_Language`     | 语言切换器       | -                           |
| `C_Date`         | 日期选择器增强   | -                           |
| `C_City`         | 省市区三级联动   | -                           |
| `C_Breadcrumb`   | 面包屑导航       | -                           |
| `C_Menu`         | 导航菜单         | -                           |
| `C_TagsView`     | 标签页导航       | -                           |
| `C_GlobalSearch` | 全局搜索面板     | -                           |
| `C_AvatarGroup`  | 头像组合展示     | -                           |
| `C_OrgChart`     | 组织架构图       | -                           |
| `C_Skeleton`     | 骨架屏占位组件   | -                           |

#### 内容 & 编辑组件

| 组件              | 说明                         | 外部依赖                  |
| ----------------- | ---------------------------- | ------------------------- |
| `C_Editor`        | 富文本编辑器                 | `@wangeditor-next/editor` |
| `C_Markdown`      | Markdown 编辑器/预览         | `md-editor-v3`            |
| `C_FormulaEditor` | 公式编辑器（安全表达式引擎） | 内置                      |
| `C_Signature`     | 电子签名                     | -                         |
| `C_QRCode`        | 二维码生成器                 | `qrcode`                  |
| `C_ImageCropper`  | 图片裁剪器                   | `vue-cropper`             |

#### 数据展示组件

| 组件             | 说明                                      | 外部依赖                             |
| ---------------- | ----------------------------------------- | ------------------------------------ |
| `C_Table`        | 高级数据表格（CRUD/行列编辑/动态行/打印） | `print-js`、`html2canvas`            |
| `C_Map`          | 地图组件（OSM/高德）                      | `leaflet`                            |
| `C_VtableGantt`  | 甘特图                                    | `@visactor/vtable-gantt`             |
| `C_AntV`         | 图编辑器（ER/BPMN/UML）                   | `@antv/x6`、`html2canvas`            |
| `C_WaterFall`    | 瀑布流布局                                | -                                    |
| `C_FullCalendar` | 日历事件                                  | `@fullcalendar/*`                    |
| `C_VideoPlayer`  | 视频播放器（HLS/字幕/书签/章节）          | `xgplayer`、`xgplayer-hls`           |
| `C_AudioPlayer`  | 音频播放器（波形/进度/播放列表）          | -                                    |
| `C_FilePreview`  | 文件预览（PDF/Word/Excel）                | `xlsx`、`mammoth`、`@tato30/vue-pdf` |
| `C_Timeline`     | 时间线（垂直/水平/可折叠）                | -                                    |

#### 表单 & 布局组件

| 组件              | 说明                                              | 外部依赖                     |
| ----------------- | ------------------------------------------------- | ---------------------------- |
| `C_Form`          | 动态表单引擎（Grid/Tabs/Steps/Card/Dynamic 布局） | `@robot-admin/form-validate` |
| `C_FormSearch`    | 搜索表单                                          | -                            |
| `C_CollapsePanel` | 折叠面板                                          | -                            |
| `C_SplitPane`     | 分割面板                                          | -                            |
| `C_Draggable`     | 拖拽排序                                          | `vue-draggable-plus`         |
| `C_Tree`          | 高级树形控件                                      | -                            |
| `C_Time`          | 时间选择器增强                                    | -                            |
| `C_Cron`          | Cron 表达式编辑器                                 | -                            |
| `C_Transfer`      | 穿梭框（搜索/全选/批量操作）                      | -                            |

#### 交互 & 业务组件

| 组件            | 说明                                   | 外部依赖 |
| --------------- | -------------------------------------- | -------- |
| `C_Chat`        | 聊天组件（联系人/消息气泡/输入框）     | -        |
| `C_ContextMenu` | 右键菜单（嵌套子菜单/快捷键/危险操作） | -        |
| `C_Login`       | 登录组件（5种模式/验证码/记住密码）    | -        |

#### 流程 & 通知组件

| 组件                   | 说明                                 | 外部依赖         |
| ---------------------- | ------------------------------------ | ---------------- |
| `C_WorkFlow`           | 工作流编辑器（审批/抄送/条件节点）   | `@vue-flow/core` |
| `C_NotificationCenter` | 通知中心（WebSocket/轮询）           | -                |
| `C_Upload`             | 大文件上传（分片/断点续传/哈希校验） | `spark-md5`      |

### 🔌 依赖说明

组件运行依赖已由本包声明，安装组件库时会自动解析，一般不需要逐项安装。使用侧只需确保以下 peer dependencies 已安装：

```bash
bun add vue naive-ui vue-router @robot-admin/form-validate
```

若部署时显式跳过了可选依赖，同时启用了表格行/列拖拽，请额外确保 `sortablejs` 可用。公式编辑器使用组件库内置的受限表达式解析器，不执行动态 JavaScript，也无需安装 `expr-eval`。

### 🏗️ 构建架构

#### 五阶段构建流水线

```
bun run build
  ├── 1. tsdown          → 多入口打包（51 组件 ESM/CJS/DTS）
  ├── 2. sass CLI        → 编译 global.scss → global-scss.css
  ├── 3. merge-css.js    → 合并 SFC CSS + global SCSS → style.css
  ├── 4. gen-exports.js  → 自动生成 package.json exports 映射
  └── 5. check:dist      → 校验根入口、子路径及 DTS 公共导出
```

#### 技术要点

- **构建引擎**：[tsdown](https://github.com/rolldown/tsdown)（基于 Rolldown），51 个独立入口并行编译
- **SCSS 处理**：自定义 `scssTransformPlugin` 在 Rolldown 管线内编译 SFC SCSS，独立 Sass CLI 编译全局样式
- **CSS 合并**：构建后将分散的 per-chunk CSS 与 `global-scss.css` 合并为单一 `style.css`
- **类型导出**：统一 `export *` barrel 模式，自动生成完整 `.d.ts`
- **子路径导出**：`gen-exports.js` 自动扫描 `dist/` 并写入 `package.json` 的 `exports` 字段
- **导出冲突检测**：`check-export-conflicts.js` 确保组件间无命名冲突
- **产物入口校验**：`check-dist-entries.js` 防止内部 chunk 覆盖根声明，并保证组件工具的子路径类型完整

#### 输出产物

```
dist/
├── index.js / index.cjs / index.d.ts     # 主入口
├── C_Form.js / C_Form.cjs / C_Form.d.ts  # 子路径入口（51 组件）
├── style.css                              # 合并后的全量样式
└── [chunk].js                             # 共享代码块
```

### 🔧 开发

```bash
bun install              # 安装依赖
bun run dev              # 开发模式（SCSS watch + tsdown watch）
bun run build            # 完整构建
bun run build:scss       # 仅编译全局 SCSS
bun run build:css        # 仅合并 CSS
bun run build:exports    # 仅生成 exports 映射
bun run check:exports    # 检测导出命名冲突
bun run check:dist       # 校验构建后的 JS / DTS 公共入口
bun run type-check       # TypeScript 类型检查
bun run test             # 运行 Bun 单元测试
bun run lint:check       # 强制 Oxlint 正确性检查
bun run lint:eslint      # ESLint 存量规则审计
bun run verify           # 类型、测试、导出和构建全量验证
```

#### 项目结构

```
naive-ui-components/
├── src/
│   ├── index.ts                     # 库入口（全量注册 + export * barrel）
│   ├── styles/
│   │   ├── variables.scss           # CSS 变量 (--c-*)
│   │   └── global.scss              # 自动生成的全局样式聚合（@forward barrel）
│   ├── components/
│   │   └── C_[Name]/
│   │       ├── index.vue            # 组件主文件
│   │       ├── index.ts             # Barrel 导出
│   │       ├── index.scss           # 组件样式
│   │       ├── types.ts             # 类型定义
│   │       ├── constants.ts         # 常量
│   │       ├── data.ts              # 静态数据
│   │       ├── composables/         # 组合式函数
│   │       ├── components/          # 子组件
│   │       └── layouts/             # 布局变体（C_Form/C_AntV）
│   ├── plugins/                     # highlight.js 等插件
│   └── utils/                       # 工具函数
├── scripts/
│   ├── gen-global-scss.js           # 生成 global.scss（@forward barrel）
│   ├── watch-global-scss.js         # 开发模式 SCSS 监听
│   ├── merge-css.js                 # 合并 CSS 产物
│   ├── gen-exports.js               # 自动生成 package.json exports
│   └── check-export-conflicts.js    # 导出命名冲突检测
├── types/
│   └── env.d.ts                     # .vue / .scss 模块声明
├── tsdown.config.ts                 # 构建配置（多入口 + SCSS 插件 + Vue 插件）
└── tsconfig.json
```

#### 添加新组件

1. 创建 `src/components/C_NewComponent/` 目录
2. 编写 `index.vue`、`index.ts`（barrel）、`types.ts`
3. 在 `src/index.ts` 中添加 `export * from './components/C_NewComponent'`
4. 运行 `bun run build`—构建脚本会自动生成子路径入口和 exports 映射

#### 发布

```bash
bun run changeset       # 记录变更及版本级别
bun run version         # 更新版本号与 CHANGELOG
bun run verify          # 发布前完整验证
bun run release         # 发布 Changesets 中待发布版本
```

## 📄 许可证

MIT License

---

## 🔗 链接

- [组件在线文档（含交互演示）](https://www.tzagileteam.com/robot/components/preface)
- [Robot Admin 主项目](https://github.com/ChenyCHENYU/robot_admin)
- [Robot Admin 在线体验](https://www.robotadmin.cn)
- [GitHub](https://github.com/ChenyCHENYU/naive-ui-components)
- [NPM](https://www.npmjs.com/package/@robot-admin/naive-ui-components)
