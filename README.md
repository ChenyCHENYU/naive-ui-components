# @agile-team/naive-ui-components

基于 **Naive UI** 的 Vue 3 企业级组件库，从 Robot Admin 中提炼的 51 个高质量业务组件。

支持 **全量注册**、**按需导入（Tree-Shaking）** 和 **子路径独立导入**，配合多入口构建输出 ESM / CJS / DTS，满足不同集成场景。

## 📦 安装

```bash
bun add @agile-team/naive-ui-components
```

必需的对等依赖：

```bash
bun add vue@^3.5.0 naive-ui@^2.35.0
```

## 🚀 快速开始

### 全局注册

```typescript
import { createApp } from 'vue'
import NaiveUIComponents from '@agile-team/naive-ui-components'
import '@agile-team/naive-ui-components/style.css'

const app = createApp(App)
app.use(NaiveUIComponents)
app.mount('#app')
```

### 按需导入（主入口 Tree-Shaking）

```vue
<script setup lang="ts">
  import { C_Icon, C_Table, C_Form } from '@agile-team/naive-ui-components'
  import '@agile-team/naive-ui-components/style.css'
</script>
```

### 子路径独立导入（推荐，最小打包体积）

每个组件都提供独立的子路径入口，仅加载目标组件的代码和类型：

```vue
<script setup lang="ts">
  import { C_Form } from '@agile-team/naive-ui-components/C_Form'
  import { C_Table } from '@agile-team/naive-ui-components/C_Table'
  import { C_Icon } from '@agile-team/naive-ui-components/C_Icon'
  import '@agile-team/naive-ui-components/style.css'
</script>
```

> 子路径导入提供完整的 TypeScript 类型支持（`.d.ts`），IDE 可自动补全 props / emits / slots。

### Composables 单独使用

```typescript
import {
  useTableManager,
  useFormState,
  usePlayerCore,
} from '@agile-team/naive-ui-components'
```

## 📋 组件清单（51 个）

> 💡 所有组件均提供 **在线交互演示**，访问 [组件文档](https://www.tzagileteam.com/robot/components/preface) 可直接在页面中体验真实效果（通过 iframe 嵌入 Robot Admin 生产环境）。

### 基础组件

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

### 内容 & 编辑组件

| 组件              | 说明                 | 外部依赖             |
| ----------------- | -------------------- | -------------------- |
| `C_Editor`        | 富文本编辑器         | `@wangeditor/editor` |
| `C_Markdown`      | Markdown 编辑器/预览 | `@kangc/v-md-editor` |
| `C_FormulaEditor` | 公式编辑器           | `expr-eval`          |
| `C_Signature`     | 电子签名             | -                    |
| `C_QRCode`        | 二维码生成器         | `qrcode`             |
| `C_ImageCropper`  | 图片裁剪器           | `vue-cropper`        |

### 数据展示组件

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

### 表单 & 布局组件

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

### 交互 & 业务组件

| 组件            | 说明                                   | 外部依赖 |
| --------------- | -------------------------------------- | -------- |
| `C_Chat`        | 聊天组件（联系人/消息气泡/输入框）     | -        |
| `C_ContextMenu` | 右键菜单（嵌套子菜单/快捷键/危险操作） | -        |
| `C_Login`       | 登录组件（5种模式/验证码/记住密码）    | -        |

### 流程 & 通知组件

| 组件                   | 说明                                 | 外部依赖         |
| ---------------------- | ------------------------------------ | ---------------- |
| `C_WorkFlow`           | 工作流编辑器（审批/抄送/条件节点）   | `@vue-flow/core` |
| `C_NotificationCenter` | 通知中心（WebSocket/轮询）           | -                |
| `C_Upload`             | 大文件上传（分片/断点续传/哈希校验） | `spark-md5`      |

## 🔌 可选依赖

包含外部依赖的组件以 `optionalDependencies` 声明。**按需安装**：

```bash
# 视频播放器
bun add xgplayer xgplayer-hls

# 图编辑器
bun add @antv/x6

# 工作流
bun add @vue-flow/core

# 文件预览
bun add xlsx mammoth @tato30/vue-pdf

# 表格打印
bun add print-js html2canvas

# 公式编辑器
bun add expr-eval
```

## 🏗️ 构建架构

### 四阶段构建流水线

```
bun run build
  ├── 1. tsdown          → 多入口打包（51 组件 ESM/CJS/DTS）
  ├── 2. sass CLI        → 编译 global.scss → global-scss.css
  ├── 3. merge-css.js    → 合并 SFC CSS + global SCSS → style.css
  └── 4. gen-exports.js  → 自动生成 package.json exports 映射
```

### 技术要点

- **构建引擎**：[tsdown](https://github.com/rolldown/tsdown)（基于 Rolldown），51 个独立入口并行编译
- **SCSS 处理**：自定义 `scssTransformPlugin` 在 Rolldown 管线内编译 SFC SCSS，独立 Sass CLI 编译全局样式
- **CSS 合并**：构建后将分散的 per-chunk CSS 与 `global-scss.css` 合并为单一 `style.css`
- **类型导出**：统一 `export *` barrel 模式，自动生成完整 `.d.ts`
- **子路径导出**：`gen-exports.js` 自动扫描 `dist/` 并写入 `package.json` 的 `exports` 字段
- **导出冲突检测**：`check-export-conflicts.js` 确保组件间无命名冲突

### 输出产物

```
dist/
├── index.js / index.cjs / index.d.ts     # 主入口
├── C_Form.js / C_Form.cjs / C_Form.d.ts  # 子路径入口（49 组件）
├── style.css                              # 合并后的全量样式
└── [chunk].js                             # 共享代码块
```

## 🔧 开发

```bash
bun install              # 安装依赖
bun run dev              # 开发模式（SCSS watch + tsdown watch）
bun run build            # 完整构建
bun run build:scss       # 仅编译全局 SCSS
bun run build:css        # 仅合并 CSS
bun run build:exports    # 仅生成 exports 映射
bun run check:exports    # 检测导出命名冲突
bun run type-check       # TypeScript 类型检查
```

### 项目结构

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

### 添加新组件

1. 创建 `src/components/C_NewComponent/` 目录
2. 编写 `index.vue`、`index.ts`（barrel）、`types.ts`
3. 在 `src/index.ts` 中添加 `export * from './components/C_NewComponent'`
4. 运行 `bun run build`—构建脚本会自动生成子路径入口和 exports 映射

### 发布

```bash
bun run release:patch   # 0.3.0 → 0.3.1
bun run release:minor   # 0.3.0 → 0.4.0
bun run release:major   # 0.3.0 → 1.0.0
```

## 📄 许可证

MIT License

## 🔗 相关链接

- [组件在线文档（含交互演示）](https://www.tzagileteam.com/robot/components/preface)
- [Robot Admin 主项目](https://github.com/ChenyCHENYU/robot_admin)
- [Robot Admin 在线体验](https://www.robotadmin.cn)
- [GitHub](https://github.com/ChenyCHENYU/naive-ui-components)
- [NPM](https://www.npmjs.com/package/@agile-team/naive-ui-components)
