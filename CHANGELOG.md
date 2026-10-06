# @robot-admin/naive-ui-components

## 0.13.6

### Patch Changes

- 新增 `C_Loading`：内置机器人数据扫描 SVG，随 Naive UI 主色变化，支持尺寸、文案和颜色配置，无在线图标、定时器或新增依赖。动画尊重系统减少动态效果设置，提供读屏状态说明。
- `C_Table` 默认使用新的加载态，并开放 `loading` 插槽；全量、按需及 base 样式入口均包含加载组件样式。加载过程继续保留已有表格内容，不改变请求或交互锁定逻辑。

## 0.13.5

### Patch Changes

- 发布构建同时校验第三方 CSS：将 Markdown 的通用动画类与关键帧、富文本编辑器的 no-scroll、地图的旧 VML 类限定在所属组件命名空间。兼容挂载在 body 的编辑器弹层；全量和按需样式共用同一隔离流程，宿主无需新增覆盖规则。供应商升级引入裸全局选择器时阻止发布。

## 0.13.4

### Patch Changes

- 移除 C_GlobalSearch 常驻导航按钮的背景模糊，保留渐变、边框和交互状态，修复 Chrome 高分屏窗口放大后正文区域被错误裁切的合成异常；搜索弹层仍保留独立的模糊效果，宿主无需添加样式覆盖或业务配置。

## 0.13.3

### Patch Changes

- 发布阶段生成组件自有的 scoped 工具类与图标样式，日期等组件不再依赖宿主 UnoCSS 扫描或额外 safelist；新增组件样式边界发布检查。隔离表格编辑标记、拖拽状态及引导触发器样式，聊天、时间线、穿梭框、菜单和音频组件使用通用主题变量及稳定的默认值。
- 修复 C_Icon 的真实加载与错误回退：处理不存在的图标、API 超时、来源切换竞态、UnoCSS 样式缺失及数字字符串尺寸，回退失败时始终保留内置离线 SVG；取消失效回调与定时器。C_AudioPlayer 在 KeepAlive 离开时暂停播放并取消待完成的播放状态更新。
- C_ContextMenu 获得、移动和恢复焦点时保留背景位置；区分打开前已完成的滚动通知、无关区域滚动和调用目标真正移动，避免菜单刚打开就消失。

## 0.13.2

### Patch Changes

- C_Login 增加通用密码表单扩展插槽、账号变化事件和提交禁用状态，支持宿主在登录前配置业务字段。

## 0.13.1

### Patch Changes

- 303f3b6: 完善 C_Guide：引擎在用户打开时加载，统一图文弹层随 Naive UI 主题变化，自动跳过缺失或不可见目标，支持动态目标和停止 API。增加可配置的“跳过引导”按钮及 skip 事件，补充概览、通知、全屏、语言、主题和布局等通用示意图。修复完成事件、完成持久化及步骤离开回调，补齐首帧前退出的清理，防止动画期间快速切换残留高亮，并取消卸载或配置变化后的待启动任务。跳过不记录为完成，用户可随时重新查看。通用组件不依赖宿主路由、菜单或业务 Store。

## 0.13.0

### Minor Changes

- fc872e4: Release C_GlobalSearch's keyboard shortcut listener on unmount.

  Keep CRUD delete feedback consistent with structured `{ data, error }` results and make tree `defaultExpandAll` work with controlled row expansion. Restore C_Table summaries in Naive UI's keyed-row format, validate persisted column settings, and avoid mutating caller-owned columns. Expose submit state and action in C_Form step slots, and harden C_FilePreview URL, auto-preview, loading, object-URL, and spreadsheet value handling. Tighten C_Icon's public types, isolate C_Editor focus styling to the component, make C_Chat preview, file, and retry actions keyboard accessible, and keep C_AudioPlayer state honest when playback fails or its playlist changes. Repair C_AntV BPMN domain-data round-trips and honor initial external BPMN/UML data. Make C_VtableGantt option merging prototype-safe and synchronize fullscreen state with the actual DOM lifecycle. Validate persisted C_CollapsePanel/C_TagsView state and avoid path interpolation in tag selectors. Isolate C_Upload's initial file list, consistently filter accepted picker/drop/paste files, label image actions, show per-file hashing progress, and make chunk cancellation effective throughout resume lookup, requests, and merging. Load initial C_WorkFlow models, isolate emitted snapshots and condition edits, honor readonly boundaries, prevent ID collisions, and clean up deferred view actions. Support timestamp and formatted string date ranges in C_FormSearch, hide decorative C_ActionBar icons from accessible names, and include Vue source templates in the verification gate.

### Patch Changes

- fc872e4: Harden smaller interaction components: keep login's remembered username current and reject malformed SMS recipients, load city data only when opened and scope letter navigation to each instance, make code actions keyboard-accessible and report modal close events, bound skeleton render counts, and synchronize menu expansion when route options arrive. Improve markdown, organization chart, timeline, tree, transfer, date/time, cascade, context menu, split pane, progress, avatar and step state and accessibility behavior.
- fc872e4: Make image crop exports use one canvas snapshot, report failures, honor disabled state, and apply flips to the actual image. Make signature readonly mode effective, preserve imported/background images across redraws, and replace placeholder SVG output with a raster-backed SVG. Fix calendar local-date saving and reactive editable mode. Prevent stale QR renders, keep logo-bearing SVG exports consistent with previews, and relayout waterfall images by aspect ratio while suppressing duplicate infinite-load requests.
- fc872e4: Keep C_NotificationCenter server read state authoritative, avoid duplicate popover toggles, forward WebSocket events, and validate action links before navigation. Prevent C_VideoPlayer from creating a player after unmount, remove duplicate shortcut/cleanup paths, and make mini-player controls keyboard accessible. Reject malformed C_Cron expressions without rewriting them, preview second-level schedules across the full search horizon, and honor disabled controls. Fix C_FormulaEditor logical operator evaluation, read-only input behavior, and keyboard accessibility.

## 0.12.1

### Minor Changes

- Enhance `C_ActionBar` with semantic action presets, getter-based reactive states, guarded async loading, and icon-first compact `tiny` defaults, including consistent create/save/cancel/close actions for forms and details. Allow `C_Table` toolbars to consume the same left/right action model while preserving existing slots, configurable sizing, and independent table engines.

- Polish the C_Captcha and C_Login verification flow with package-owned SVG state icons, explicit verification copy, theme variables, a visibility event for pausing expensive host effects, and a clearer verification-before-submit layout. Add an opt-in, lazily loaded ALTCHA provider for free self-hosted proof-of-work challenges while preserving the existing puzzle provider by default.

- 新增公开的 `C_Tabs` 数据驱动紧凑标签页，支持 render、插槽、异步切换守卫、徽标、图标、关闭和 tabs-only 场景，并接入按需 Resolver 与独立样式入口。

- Add `C_FormModal`, a compact data-driven create/edit modal that reuses `C_Form` and `C_ActionBar`, accepts any structurally compatible headless CRUD editor without coupling the component package to a request library, and keeps fields, validation, loading and footer actions out of business templates.

## 0.11.8

### Patch Changes

- 修复 `C_Map` 在 Vite 深层按需加载、未整体预构建组件库时的 Leaflet CommonJS/ESM 互操作错误；组件同时兼容命名空间和 `default` 导出，并在 API 形态异常时返回明确错误。同步关闭 `C_VtableGantt` 在组件快速卸载或配置连续变化时的异步初始化竞态，避免向已经失效的容器创建实例。

## 0.11.7

### Patch Changes

- 修复按需消费场景中的登录验证码与功能引导回归：恢复验证码拼图标识和空文本的图标模式，避免未配置引导遮罩透明度时覆盖 driver.js 默认值，并让组件独立样式入口自动包含内部公共组件样式。`C_Menu` 同时新增非破坏性的 `intent` 事件，便于宿主在用户点击前按需预取目标路由。

## 0.11.6

### Patch Changes

- ba569c2: 为 C_Map 增加高德 JS API 2.0 安全密钥/服务端代理配置，并阻止同页混用不同 Key 或安全配置，兼容 2021-12-02 后签发的高德 Key。

## 0.11.5

### Patch Changes

- b5d6611: 修复 C_Map 的 Leaflet 图层图片发布、AMap 坐标顺序、标记点击和 SDK 重试问题；隔离组件自有标记清理，补齐强类型配置、瓦片自定义及 `getMap`、`refresh`、`fitToMarkers` 实例能力。

## 0.11.4

### Patch Changes

- c98137f: Forward and type the `C_Form` tabs and steps layout action slots so custom layout controls work through the public component boundary.

## 0.11.3

### Patch Changes

- 27b8dfa: Preserve the form model generic across `C_Form` model, options, config, validation, and submit bindings for fully typed Vue template consumers.

## 0.11.2

### Patch Changes

- a8ddc1e: Allow `C_Table` CRUD bindings to accept column refs produced by external data packages without requiring both packages to share an identical `TableColumn<T>` declaration.

## 0.11.1

### Patch Changes

- 1b09ddd: Preserve the row model generic across `C_Table` Vue props so typed `CrudBinding<T>` values can be passed directly without consumer-side casts.

## 0.11.0

### Minor Changes

- f0a9254: 增强组件库公共契约与使用体验：C_Form 新增业务模型泛型、嵌套字段路径和 `useCForm`；C_Table 新增类型助手、远程查询控制器、行键诊断及可靠的异步展开；C_Date、C_Time、C_Menu、C_FormSearch 统一支持标准 `v-model`。同时引入可选的全局反馈、语言和组件默认配置，修复跨实例、异步竞态、重复副作用、受控状态同步及发布产物问题，并补齐契约与回归测试。
- 48dc8fe: Add lightweight/full C_Form and C_Table style entries, deduplicate the full stylesheet and reject leaked Vue deep selectors, harden C_Captcha with cancellable server verification, stabilize Naive UI public type imports, remove unused/runtime validation dependencies, improve async error and keyboard behavior, and enforce dependency, SSR, declaration, and package-size release contracts.

### Patch Changes

- 0c5ecf2: 深度治理 C_Form、C_Table 及其他组件的状态同步、异步竞态、资源清理、输入输出安全与依赖漏洞，并补齐回归测试和推荐用法文档。

## 0.10.3

### Patch Changes

- 修复内部共享入口与根声明文件重名导致的类型导出丢失，并增加构建后公共 JS/DTS 入口校验。

## 0.10.2

### Patch Changes

- 从 `C_Menu` 子路径导出菜单适配工具与公共类型，避免消费者为 `createMenuOptions` 引入组件库根入口及无关重依赖。

## 0.10.1

### Patch Changes

- 将表单验证库改为 peer dependency，避免消费端安装重复版本导致规则类型冲突；通知中心 Popover 直接桥接 Naive UI 主题变量，修复 Teleport 场景下文本颜色无法随明暗主题切换的问题。

## 0.10.0

### Minor Changes

- 默认从组件子路径按需解析组件，避免总入口将编辑器、Office、图表等重依赖带入应用首屏；同时为动态表单状态补充稳定的公共返回类型，修复消费项目生成声明时的内部类型泄漏。

## 0.8.1

### Minor Changes

- C_Form 新增8项能力：
  - 🧹 脏检查系统（isDirty / getChangedFields / isFieldDirty / markAsClean），独立 useFormDirty Composable
  - ✏️ 编辑模式（mode: "edit" + initialValues 自动回填 + 脏状态重置）
  - 🔒 字段级 disabled / readonly（支持 boolean | (model) => boolean 动态判断）
  - 🔄 联动赋值引擎（valueWhen 根据其他字段自动计算回填）
  - 🌐 异步选项加载（asyncOptions 远程数据源 + asyncLoadingMap loading 状态）
  - 📐 动态校验规则（rulesWhen 根据表单状态动态切换验证规则）
  - 🔗 跨字段校验（crossFieldValidator 声明式跨字段验证）
  - 💡 Help Tooltip（help 字段标签旁 ℹ️ 图标 + NTooltip 帮助文本）
  - useFormRenderer 重构为 Options 对象参数模式
  - 新增导出：FormMode 类型、useFormDirty、UseFormRendererOptions

## 0.7.2

### Patch Changes

- C_Table 类型系统清理：移除 6 个废弃类型（TestRecord、SelectedChildGroup、DemoConfig、DataMapping、CommonMappings），集中定义 ColumnWithKey 消除跨文件重复，修复所有 TypeScript 类型错误

## 0.7.0

### Minor Changes

- C_Table 新增10项能力：全局配置 provide/inject、列级 formatter 格式化引擎、树形表格、行拖拽排序、跨页多选、CSV/XLSX 导出、列配置持久化、编辑校验、错误状态、批量操作栏

## 0.6.2

### Patch Changes

- 修复菜单图标在生产环境下错位问题
  - menuAdapter 的 defaultRenderIcon 中 `inline-flex items-center` 原子类改为内联 style
  - 组件库不应依赖宿主项目的 UnoCSS/Tailwind 原子类，否则生产构建时可能丢失样式

## 0.6.1

### Patch Changes

- 修复 C_Table loading 状态在 crud 模式下失效的问题
  - `loading` prop 默认值从 `false` 改为 `undefined`，使 `??` 运算符能正确回退到 `crud.loading.value`
  - 之前 `false ?? crud.loading.value` 始终返回 `false`（`??` 不回退 falsy 值，只回退 null/undefined）

## 0.6.0

### Minor Changes

- 依赖架构优化 + CSS 按需导入 + Changesets 集成
  - 将 optionalDependencies 迁移至 dependencies，消费端自动传递安装
  - 新增按组件 CSS 导出 (`C_*/style.css`)，支持样式按需导入
  - 修复 merge-css.js 中 esm/cjs CSS 重复合并问题
  - Resolver 新增 `importStyle` 选项，自动注入组件样式
  - 集成 @changesets/cli 自动化版本管理

- 提取 C_Menu / C_Breadcrumb / C_TagsView 布局组件 + 适配器架构
  - 新增 `_shared` 模块：统一类型定义（RouteItem, TagItem, BreadcrumbItem）+ menuAdapter 适配器
  - `createMenuOptions(routes, config)` 工厂函数：将 RouteItem[] 转换为 NMenu MenuOption[]
  - `flattenRoutes()` 辅助：扁平化嵌套路由用于标签页匹配
  - C_Menu：支持双输入（options / routes），内置 labelFormatter 回调解耦 i18n
  - C_Breadcrumb：auto（route.matched）+ manual（items）双模式
  - C_TagsView：useTagsView composable + localStorage 持久化 + 右键菜单
  - vue-router ^4.0.0 新增为 peerDependency

## 0.5.0

### Minor Changes

- 依赖架构优化 + CSS 按需导入 + Changesets 集成
  - 将 optionalDependencies 迁移至 dependencies，消费端自动传递安装
  - 新增按组件 CSS 导出 (`C_*/style.css`)，支持样式按需导入
  - 修复 merge-css.js 中 esm/cjs CSS 重复合并问题
  - Resolver 新增 `importStyle` 选项，自动注入组件样式
  - 集成 @changesets/cli 自动化版本管理
