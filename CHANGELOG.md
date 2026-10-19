# @robot-admin/naive-ui-components

## 0.17.1

### Patch Changes

- ace86bc: 地图标记改为内置矢量图标，避免 CSS 资源重命名后 Leaflet 自动探测失效。组织架构增加 fitOnInit 和 fitView，按真实节点尺寸适配视野，支持容器变化及卸载清理。

  文件预览增加 inline 容器内阅读模式，保持原有弹窗默认用法。PDF 使用浏览器原生阅读器进行翻页、缩放与打印，移除固定一页及未作用到 iframe 的重复控件。组织架构的自定义节点插槽透传到全部层级。上传 change 事件同步发送状态、进度与暂停恢复的独立快照，支持宿主自定义队列。

  甘特图修复原生任务条、任务表点击及日期、进度、单元格编辑事件桥接，并正确合并配置中的表格主题、注册默认文字和日期编辑器，保留宿主已有注册。瀑布流按卡片实际高度布局，避免标题和自定义内容被下一行素材遮挡。

- 73cda31: 为穿梭框、聊天消息/联系人和全局搜索复用公开虚拟列表引擎，默认减少大列表 DOM，保留完整选择与键盘语义。完善聊天历史锚点、流式与迟到图片滚底、面板尺寸变化、模式切换和输入法确认。

  缓存菜单搜索索引及字幕时间索引；合并瀑布流同帧图片布局并丢弃过期测量。修复代码语言异步高亮与复制快照，二维码任务支持独立导出快照、Logo 主动取消及卸载清理。保持 Naive UI 2.35 兼容和既有按需入口。

- 65e9b81: 完善分割面板手柄质感与可操作性：细轨道搭配居中胶囊握柄、轻阴影和局部状态高亮；折叠按钮靠近握柄，触屏及折叠状态持续可见。保留现有布局间距与 API，胶囊溢出轨道部分可真实拖动，折叠边缘避免裁切，箭头使用不依赖网络的内联 SVG。
- c8f1934: 收敛表格展开、选择和序号列默认宽度，用自然弹性业务列吸收剩余空间，保留显式列元数据和布局覆盖；修正自动横向滚动与响应式显示配置。为批量展开和程序化跨页选择建立惰性索引，树行遍历改为迭代。

  修复图库实例深代理、甘特图重复初始化、表单脏检查短路与嵌套集合追踪，以及登录、裁剪、签名、工作流、字幕的异步边界。完善固定标签批量关闭、聊天历史滚动、条码参数和拖拽业务事件身份，保持现有公开接入方式。

## 0.17.0

### Minor Changes

- 统一表单、搜索、表格的 default/compact/comfortable 密度，补齐布局、编辑器、分页与按钮尺寸，保留显式配置优先级与未配置时的原有布局。

  表格支持 edit 字符串简写，切换编辑模式清理旧草稿并阻止旧保存结果回写；密度切换保留草稿。修复默认上传按钮和搜索配置变更重置输入的问题。

  修复 CRUD 编辑按钮误调用保存适配器的问题：点击编辑只进入编辑态，确认后才自动保存；显式自定义编辑入口保持优先。

  分割面板新增受控 size、像素最小尺寸、嵌套多表作用域插槽和完整拖拽/键盘清理；树新增受控选择/展开/勾选、treeProps 原生能力聚合、可清空受控搜索、虚拟滚动密度与主题适配。

  补充真实组件挂载、消费者类型和独立导入验证，以及 wl-ui-produce 场景覆盖与迁移边界说明。

### Patch Changes

- 68a96a1: 为日历补充响应式工作区配置，并补齐及隔离图片裁剪器的画布、遮罩与拖动手柄样式。

- c4cc5b2: 修复 C_ActionBar 换行未作用于组内按钮的问题，并让紧凑配置在行内模式下通过默认按钮间距即时生效。显式 gap 保持优先，透传按钮尺寸与图标尺寸同步。

## 0.16.0

### Minor Changes

- 完善通知中心的共享控制器与可靠异步状态，支持独立演示和明确的远端接入边界。

  - 新增可选 `controller`，让顶部预览与完整收件箱共用应用状态；外部控制器由应用管理请求、轮询和连接生命周期。
  - 使用服务端全局与分类未读统计，修复分页计数、并发已读与删除失败回滚覆盖新状态的问题。
  - 演示删除、清空和已读状态完整持久化；远端缺少接口时显示错误，提供等待状态及失败重试，不回退到演示数据。
  - 新增 `viewAll` 入口、可选心跳超时与重连后刷新，并增加状态、挂载和传输回归验证。

## 0.15.0

### Minor Changes

- df0f8d4: 收敛组件发布与实例边界，为独立 UI 适配建立有界的内部协议层。

  - 修复 ESM/CJS 条件类型映射，消除公共可达声明中的 Naive 内部路径，并增加真实 tarball 消费者验证。
  - 全量插件按公开的 C_* 名称注册，修复多个 index.vue 以 index 名称互相覆盖的问题。
  - 拆分无 UI 依赖的反馈／语言协议、Vue 上下文与 Naive 反馈适配，保留现有配置导入。
  - 高亮默认按应用／实例隔离，不再隐式写 window.hljs；旧窗口用法需显式 exposeToWindow。
  - 全量安装默认使用应用独立的表单渲染器 registry；原 registerRenderer 全局路径保留给 legacy 消费者，插件项目改用 formRenderers 配置。
  - 现有组件、子路径与样式继续专注 Naive UI，Element Plus 将通过真实业务试点独立适配和发布。

- cb2d13a: 收敛常用 Naive 组件的状态、异步执行和按需加载，保留既有配置与接入方式。

  - 表单统一回填、重置、派生字段和关联选项更新，修复 Tab/Steps 校验、只读控件与公开实例类型，并提供 setValues/getValues/reset 便捷操作。
  - FormInstance 状态声明对齐 Vue 实例的自动解包行为；读取 isSubmitting/isDirty/formModel 时移除原先错误的一层 .value。Tabs 就绪后挂载全部面板，以保证未访问字段也参与整表校验。
  - 基础表单延迟加载复杂字段和高级布局，展示表格延迟加载编辑表单，保留完整与基础样式入口。
  - 表格先筛选和排序再本地分页，远程模式保留服务端结果；原生分页兼容入口只显示一个分页器。
  - 编辑在校验前锁定行和快照，防止重复保存及回写过期查询结果；跨页选择保留已访问远程行，展开失败通过显式重试恢复。
  - 修复清空值、自定义编辑上下文、树形行身份和动态行深克隆；新增导出范围和服务端导出数据回调。
  - 查询先校验并统一防重，重置先同步模型再提供最终快照；按钮及菜单按稳定动作 key 管理异步状态，表格动作复用同一轻量执行器。
  - 增加组合场景、SSR、发布消费者和首屏体积回归；使用 Changesets 官方本地生成器生成变更日志，无需额外 GitHub 令牌。

## 0.14.3

- `C_Table` 新增 `wrapper-class` 公开根容器属性；原生 `class/style` 继续转发到内部 `NDataTable`，保持已有消费行为。
- `flex-height` 统一根容器、表格主体与分页的高度链；宿主只需给根容器明确高度，短页、加载与错误切换保持容器和分页位置稳定，默认自然高度行为不变。
- 增加真实 Vue 挂载测试与独立类型检查：覆盖表格属性转发、选中与清空、实例隔离、加载/错误切换，以及表单校验、防重复提交、失败重试和卸载取消。验证纳入发布门禁，测试图标使用离线 SVG，无运行时新增依赖。

## 0.14.2

- 公式键盘默认展开，支持随时收起；数字、四则、比较、括号与条件分区展示，函数快捷键直接消费现有 functions 配置，无新增接入参数。
- 键帽层次、交互反馈与颜色统一跟随主题，按容器宽度自适应；保留原生光标与选择区插入、变量整体退格和只读限制。清空后继续聚焦输入，所有样式限定组件作用域。

## 0.14.1

- Cron 标题与校验标签在极窄嵌入容器中自动换行，避免宿主展开侧栏后的横向溢出。保留原有模型、预览和配置接口；补齐 144px 容器、亮暗主题及真实宿主布局的验证。

## 0.14.0

### Minor Changes

- 修复按需样式丢失的构建根因：样式归属改为源模块编译记录，移除按 chunk 文件名猜测及别名补丁；Cron / 公式按需入口包含内部依赖和主题默认变量，发布门禁验证实际选择器。

- `C_Cron` 与 `C_FormulaEditor` 推荐使用 `v-model + config` 扁平接入；保留原有独立属性和实例方法，组件内部统一处理模板、编辑、校验、重置与结果反馈。
- Cron 重构为计划模板、时间字段与执行预览三段工作区；非法或待应用表达式清除过期预览，隐藏预览不启动计算，卸载取消待执行任务。空指定值不再意外扩大为每个值执行；日与星期始终互斥。重置恢复挂载时的初始规则。
- 公式使用有界安全语法树统一校验与求值，不运行 JavaScript。新增完整语法和函数参数校验、错误字符定位、IF/三元/AND/OR 短路语义；同一公式编译结果随试算数据复用。常量也能直接试算，字符串中的括号和变量名称不会误报。
- 公式输入改用原生 textarea，保留中文输入、纯文本粘贴和选择区插入；高亮使用 Vue 转义后的独立结构预览。试算值可编辑、与调用方数据隔离，空数字区别于零；只读状态阻止编辑入口，重置同时恢复公式和试算值。
- 两个工作区按组件容器宽度自适应，样式只使用组件作用域和主题变量；新增打包消费类型与真实浏览器回归，无额外依赖。

## 0.13.9

- 新增 `C_PageLoading`：同心轨道与波形 SVG、柔和主题卡片，支持明暗主题、按需导入、独立文案和减少动态效果；所有样式隔离，不依赖路由或宿主的 UnoCSS。
- 新增 `createPageLoading({ delay })`：默认延迟 160ms 显示，快速完成不闪烁；任务编号隔离并发完成，提供重置清理，不强制延长导航时间。

## 0.13.8

- 表格内置子表与主表统一默认居中；列类型保留 Naive UI 普通列的排序、筛选和单元格配置，原生表格迁移后不丢交互能力。
- `C_Loading` 改为渐变数据光环 SVG：双层轨道、数据芯片与细光束组合，参考柔和卡片风格；各实例使用独立渐变 ID，保留主题适配、尺寸、文案和颜色接口，无定时器或新增依赖，减少动态效果模式关闭所有动画。
- `C_Table` 用 `aria-busy` 同步真实加载状态，读屏可识别等待阶段；页面无需重复配置动画。
- `C_Table` 内置异步展开行复用统一加载组件，状态引擎通过可选 `renderLoading` 接收 UI 内容，保持可独立调用；自定义展开内容与已有请求、选择、分页行为不变。
- 异步展开行立即展示等待内容，不再等到数据返回后才展开；保留请求去重与收起优先，迟到响应不能重新打开已收起的行。

## 0.13.7

- `C_Form` 正式集成 `@robot-admin/form-validate@3.4.2`，统一消费原生规则、验证库规则和 `RuleSpec`，并通过表单入口导出已适配的 `PRESET_RULES`、`NAIVE_COMBOS` 与 `SPEC_RULES`。
- 提供默认步骤提交按钮和 `action-extra` 业务操作插槽，复用组件内部的校验、防重复提交、加载与错误反馈；成功/重置提示由业务按需配置。
- 修复规则回调异常后提交跳过校验的问题；提交支持取消信号，组件卸载后不继续触发提交事件或成功提示，禁用/只读状态不能通过实例方法绕过。

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
