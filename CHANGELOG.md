# @robot-admin/naive-ui-components

## 0.24.6

### Patch Changes

- 修复普通下拉列转换为弹窗表单时遗漏选项的问题，保留标签、原始值和选项隔离，不要求配置字典。

- 修复 C_Table 将 modalWidth 作为无效原生属性传递导致编辑弹窗通栏的问题，移除宿主原子类依赖。与 C_FormModal 共用轻量原生分区样式，按配置居中、受视口宽高约束，窄屏表单自动单列，超高内容内部滚动并保留标题和页脚。保留原有编辑、校验与保存会话。

## 0.24.5

### Patch Changes

- 修复表单弹窗首行贴标题的问题，使用原生 Card 分区样式统一紧凑留白、内容滚动与固定页脚，约束宽高并避免样式穿透内嵌业务卡片。移除失效的 scoped 弹窗样式，不增加字段监听或渲染测量。

## 0.24.4

### Patch Changes

- 表单脏状态订阅数组迭代变化：稀疏空位被填充、删除或追加后，字段/整表状态和修改报告正确失效与恢复；纯值比较器继续保持值语义，不增加键列表分配。
- 数组空位与显式 undefined 保持原有值语义等价，长度及有效值仍严格比较，避免 Vue 不通知空位写入 undefined 时产生不一致；快照继续保留真实索引和空位。

## 0.24.3

### Patch Changes

- 隔离 Tabs/Steps 与公开行/单元格编辑 hook 的迟到校验结果，来源切换、草稿更新、取消和销毁后不回写旧状态或继续保存；移除 Tabs 未读取的校验状态 Map。
- C_Table 编辑与只读展示共用状态色和字典渲染；列拖拽按实际列身份映射、保护辅助列、先还原 DOM 再更新状态，统一初始化路径，内容或测宽变化不重建实例。
- 字典初始读取、订阅、加载与同步重入均保持请求所有权，销毁后释放订阅并停止后续分发；搜索历史容忍旧记录和非法数量边界。
- 数据路径不借用原型分支，保留 Vue 缺失键与 literal dotted key 的响应式语义；克隆回退保留稀疏索引与自有原型键，数组比较保持对称。
- 视频小窗支持动态启停并观察稳定原位锚点，避免 fixed 回跳与迟到通知；非流式视频尊重固定尺寸，小窗容器覆盖 SDK 流式占位。X6 初始化可取消并移除不可达重试，高德加载失败归还仍由加载器持有的宿主配置。
- 高亮诊断回调与任务结果隔离，上传删除不积累失效 UID；增加对应回归并收紧类型债务预算，不新增运行时依赖。
- 精准升级现代 glob/minimatch 开发依赖。旧 glob 7 的 minimatch 3.1.5 保留兼容接口，按维护者公告、固定源码指纹与放大模式回归单独核验；原始审计结果保持可见，详见 SECURITY。
- 维护者 packageManager 与全部 CI 任务固定到 Bun 1.4.2，以支持实际使用的锁格式和条件依赖覆盖；消费者 Bun 最低版本不变，增加锁格式和 CI 版本一致性检查。

## 0.24.2

### Patch Changes

- C_FormModal 移除与受控模型重复的 initialValues 订阅，避免单字段输入重建整份配置；400 字段普通表单与弹窗均验证局部控件更新。

- 紧凑表单与搜索改为 4px 纵向间距、2px 空反馈预留，错误仍自然撑高。收紧紧凑表单弹窗壳并建立内部滚动高度链；移除 Grid/Dynamic 逐字段入场及 Inline/Card 布局尺寸动画，保留原生控件反馈。增加 400 字段局部更新回归，不引入额外观察器或逐字段动画节点。

## 0.24.1

### Patch Changes

- C_Table 默认完整展示所有列头，解除单元格 ellipsis 对表头的连带省略。完整标题及排序筛选控件作为初始宽度、列设置及拖拽缩列的统一下限，内容测宽上限只约束数据单元格，保留原生滚动和主题。

## 0.24.0

### Minor Changes

- C_Table 未指定宽度的列改为有界内容测宽，保留显式列宽、列设置、原生尺寸和横向虚拟化。增加 status 精简配置，复用主题标签，支持默认语义色、字典显示、自定义文字与颜色，不修改原值及输出契约。

## 0.23.3

### Patch Changes

- C_Table 默认保留 Naive UI 原生空态，继承 Provider 的主题、语言和 renderEmpty，自定义 empty 插槽按需转发，与 MachTable 插画空态保持区分。

## 0.23.2

### Patch Changes

- C_Table 内置与 MachTable 一致的淡蓝表格插画空态，适配亮暗主题、文案覆盖及 empty 插槽，加载和错误状态不误报无数据。

## 0.23.1

### Patch Changes

- 分割面板在指针拖动开始时保留键盘焦点并禁止隐式滚动，避免高面板把页面标题和查询区滚到固定头部之后。实体选择器默认撑满所在字段宽度，与输入框和下拉框保持一致；显式宽度仍可覆盖。

## 0.23.0

### Minor Changes

- 补齐密集业务页面的共享能力：实例级字典 Provider 接入表单、搜索与表格；搜索支持容器自适应栅格、数值与日期控件、显式序列化、预设及成功查询快照。新增局部密度、分区导航、错误摘要、跨页选择器和批量结果组件。

  提供可选 `/data` 与 `/workflows` 入口，包含精确数值编解码、主从资源取消与竞态隔离、跨区域验证、动态明细行及 keep/clear/set 批量补丁。表单支持容器字段宽度及可取消的字段揭示与焦点导航；保留现有默认行为和业务接口所有权。

  完善异步来源、KeepAlive、卸载、错误隔离、类型消费者与大结果集有界渲染回归。日期搜索按需加载，完整组件样式通过本地共享依赖减少物理重复，原有首屏和发布体积预算保持不变。

## 0.22.1

### Patch Changes

- 完善紧凑表单与搜索的统一密度：空校验区保留 4px，弹窗默认紧凑布局及 22px 页脚按钮，搜索继承应用密度并收紧字段宽度。紧凑数字输入默认隐藏步进按钮，保留键盘、精度、上下限和可访问语义，字段显式配置继续优先。按需配置入口导出共享表单默认值，保持轻量加载与各实例隔离。

  修复响应式网格在窄容器中因累计列间距导致的横向溢出，继续使用 Naive UI 的数值栅格与偏移计算，并在停用、恢复和卸载时管理尺寸观测。

## 0.22.0

### Minor Changes

- 瀑布流 100 项起自动窗口化，按列索引查询可见范围，保留原始事件与插槽索引，支持变高卡片、嵌套滚动、键盘导航及 KeepAlive 释放恢复。普通接入不增加必填配置，`virtualScroll: false` 可保留全量 DOM。

  表单脏检查按字段复用响应式比较结果，保留 Date、raw 路径和普通对象的实时检查；修复 Map 对象键与 Set 对象成员在深拷贝快照后被误判为修改的问题，基础值集合保留线性查找。

  SheetJS 官方原始发布包改为经过完整性校验的本地构建依赖，运行时代码随按需产物分发并附带许可证，消费者不再为本库访问外部 SheetJS CDN。基础表单与表格首屏仍执行原体积预算，新增无独立 xlsx 依赖的双格式真实解析回归。

  补齐日期兼容事件的弃用提示、主 API 消费示例、只读 AST 迁移检查与指南，保留现有兼容入口。

  Markdown 卸载时通过公开 API 销毁 CodeMirror，并忽略迟到的保存与上传回调。富文本同步持有官方 createEditor 返回实例，修复创建通知晚于卸载导致的资源残留，保持模型、禁用与工具栏接口。

## 0.21.1

### Patch Changes

- 工作流保存、导出和变更事件仅序列化公开节点与连线数据，保留坐标、业务数据及配置，剥离 VueFlow 内部节点引用、事件和计算状态。补充真实拖动后的快照边界、保存恢复与只读回归，避免 SDK 运行态污染业务持久化数据。

  修正 Markdown 供应商样式合并，内联主题样式并移除失效的字符集声明，避免主题导入在全局样式之后被消费端构建器丢弃；增加实际主题选择器与样式边界回归。

  Excel 工作表标签通过官方插槽显式渲染，修复空默认插槽遮蔽标签导致的空白页签，保持惰性解析与往返切换数据隔离。

## 0.21.0

### Minor Changes

- 修复表单插槽模型、折叠搜索校验、表格展开与父子选择的异步边界，以及默认短信登录被密码验证码阻挡的问题；保留既有精简配置和使用侧类型推导。

  补齐菜单数字键、递归菜单事件类型、联系人草稿隔离和折叠面板原地更新。常用组件统一使用应用级语言上下文；新增轻量 `/config` 入口、消息中心分类显示配置与过滤/条目操作插槽。

  完善 ER 与工作流拖动保存、连线校验，普通和分片上传共享并发额度并可取消哈希。Excel 保留原始类型与显示格式，按需解析工作表并限制预览体积和单元格工作量；DASH/FLV 支持显式按需适配器，缺失时提供确定的错误反馈。

  瀑布流在视口未填满时继续加载并限制连续自动请求。拖拽实例默认隔离，需要跨实例拖拽时显式传入相同 group。新增真实挂载、消费者类型与最小/最新依赖矩阵回归，更新依赖安全控制及接入文档。

## 0.20.0

### Minor Changes

- 面包屑增加可选授权菜单输入，保留自动路由与手动 items 用法；统一相对路径、深层目录、隐藏项与动态详情页的解析，组件只发出选择事件，权限和实际导航由宿主负责。
- 完善路径层级、目录箭头和当前页样式，父级点击打开主题化目录卡片；提供当前页高亮、有效页面计数、目录展开、键盘导航、Escape 焦点恢复及窄容器完整路径入口。
- 路由、查询参数、菜单和容器尺寸变化会关闭旧浮层；只读输入不被修改，组件卸载清理观察器。增加真实路由挂载与消费者类型、独立入口体积回归，Robot_Admin 复用现有授权菜单直接接入。

## 0.19.0

### Minor Changes

- `TableProps` 与实际组件共用运行属性定义，移除从未生效的旧编辑、展开和选择属性，保留原生显示属性透传与真实事件监听器。编辑、展开和选择统一通过 `config` 配置。
- 表单提交、表格保存和按钮操作可直接接收业务函数返回值，包括 `Promise<Row>`、`Promise<boolean>`，无需额外包装；保留参数类型校验和原有异步状态、异常处理。
- 升级校验包至 3.4.4，预设规则直接兼容 Naive 官方规则，移除组件内重复类型映射和断言。增加 Vue 模板与 ESM/CJS 发布包的正反类型回归。

## 0.18.0

### Minor Changes

- 贯通表格、搜索、树、拖拽与穿梭框的业务模型泛型，配置、事件、插槽和公开实例共用准确类型；展开表格保留子记录与子选择状态，使用侧无需重新断言数据。
- 表单字段路径增加内部递归边界，初始值与联动赋值关联字段值类型；搜索支持普通查询接口，日期和时间标准 v-model 根据静态 mode 推导单值或范围，继续兼容旧别名。
- 工作流节点改用类型与数据关联的判别联合；为工作流、图编辑和甘特提供稳定实例、配置及 SDK 回调契约。甘特配置更新保留完整配置，尺寸变化复用 SDK 自有观察机制。
- 明确业务模型启用动态增行时要求已有 defaultRowData 工厂提供完整行；保留工厂主键类型并拒绝无效或重复身份。开放动态记录继续兼容空行简写。
- 增加源码与发布包的消费者正反例、真实 Vue 模板推导及组件生命周期回归；Robot_Admin 配套迁移到精简用法。

## 0.17.6

### Patch Changes

- 补齐行与单元格编辑的校验反馈：失败保留草稿，同时通过既有 feedback 通道提示原因；编辑会话取消或卸载后的异步校验不再提示。同步禁用校验/保存中的内置编辑控件，避免快速输入被锁定状态丢弃；弹窗沿用字段自定义占位文案。无需新增使用侧配置。

## 0.17.5

### Patch Changes

- 统一表格弹窗、行编辑和单元格编辑的列规则提取：必填、自定义、类型、嵌套、转换与异步校验使用 Naive 同源的 async-validator；保留 false、0 与异步保存的状态隔离。功能列与只读列不再进入编辑表单，数字字段键继续有效。
- 表格字段转换复用 C_Form 公开类型，移除重复字段结构和宽泛断言；修正 C_Time / C_Menu 公开实例的 Ref 解包类型，内部组合函数仍保留响应式 Ref。
- 工作流配置弹窗和整体校验复用同一条件完整性判断，拒绝空白字段和无效操作符。质量门禁改为 AST 统计显式 any，并收紧总量及核心组件回退预算。
- 增加真实组件组合、各类规则、异步回调及发布包消费者类型回归，保持现有配置入口、按需加载和兼容路径。

## 0.17.4

### Patch Changes

- 修复搜索选择字段的多选数组和布尔值回显，搜索、清空、重置及外部模型更新保留原始业务类型，区分 `false`、`0` 与字符串值；沿用 `list` 和 `attrs.multiple`，无需新增配置。
- 补齐 `TableProps` 的 config / crud / remote / virtualScrollX 与原生分页类型，CRUD 模式不再要求重复列和数据；`TableInstance` 补齐已存在的跨页选择与管理器接口，保留现有运行行为和属性透传。
- 修正 `TreeExpose` 的公开状态为 Vue 实际解包后的数组，内部组合函数仍使用 Ref；`useCForm().validate()` 在未挂载或卸载后拒绝执行，保留挂载前草稿操作。
- 增加真实组件回归和发布包消费者类型验证，更新中英文接入说明。

## 0.17.3

### Patch Changes

- 补齐视频同源测验配置更新的状态隔离：移除或修改题目时清理旧弹窗、答案和过期完成记录，保留内容未变的答题记录。使用侧无需为了切换场景强制重建播放器，也不会因题目配置变化自动继续播放。

## 0.17.2

### Patch Changes

- 修复复杂组件的数据与资源边界：视频切源隔离播放实例、进度、书签和字幕，保留原生清晰度配置与倍速事件契约；音频支持原地替换、删除与清空列表；文件预览清空时取消解析并释放资源；甘特初始化失败清空旧实例并提供错误状态与重试。

- 保留日历跨日、全天排他结束日期和原始时间精度。ER 图完整保留字段元数据与连线身份；ER/UML/BPMN 统一只读保护，键盘删除限定当前画布；UML 取消编辑不再污染原数据。

- 工作流补齐节点、连线、起点及可达性验证，并新增兼容默认开启的 `allowCycles` 配置。树表按稳定行身份排序，仅允许顶层同层拖拽；导航标签关闭先完成路由跳转，修复空标签、禁用标签与异步切换守卫。

- 新增真实组件、原生图模型与 Sortable 回归，保持既有按需入口和选择/展开/序号列默认 40/40/50 px。Robot_Admin 配套使用正式版本并补充实际页面验收。

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
