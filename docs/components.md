[← 项目首页](../README.md) · [English](./components.en.md)

# 组件目录

组件用法见在线文档与本仓库指南，组合场景可在 Robot Admin 演示中体验。

## 基础组件

| 组件             | 说明                    | 外部依赖                      |
| ---------------- | ----------------------- | ----------------------------- |
| `C_Icon`         | Iconify 图标封装        | `@iconify/vue`                |
| `C_Loading`      | 主题化 SVG 加载态       | -                             |
| `C_PageLoading`  | 主题化页面切换加载      | -                             |
| `C_Code`         | 代码高亮显示            | `highlight.js`                |
| `C_Barcode`      | 条形码生成器            | `@chenfengyuan/vue-barcode`   |
| `C_Captcha`      | 拼图/ALTCHA 人机验证    | `vue3-puzzle-vcode`、`altcha` |
| `C_Cascade`      | 级联面板选择器          | -                             |
| `C_Guide`        | 新手引导                | `driver.js`                   |
| `C_Progress`     | 增强进度条              | -                             |
| `C_Steps`        | 步骤条                  | -                             |
| `C_ActionBar`    | 操作按钮栏              | -                             |
| `C_Theme`        | 主题切换器              | -                             |
| `C_Language`     | 语言切换器              | -                             |
| `C_Date`         | 日期选择器增强          | -                             |
| `C_City`         | 省市区三级联动          | -                             |
| `C_Breadcrumb`   | 面包屑导航              | -                             |
| `C_Menu`         | 导航菜单                | -                             |
| `C_Tabs`         | 数据驱动标签页/场景切换 | -                             |
| `C_TagsView`     | 标签页导航              | -                             |
| `C_GlobalSearch` | 全局搜索面板            | -                             |
| `C_AvatarGroup`  | 头像组合展示            | -                             |
| `C_OrgChart`     | 组织架构图              | -                             |
| `C_Skeleton`     | 骨架屏占位组件          | -                             |

## 内容 & 编辑组件

| 组件              | 说明                         | 外部依赖                  |
| ----------------- | ---------------------------- | ------------------------- |
| `C_Editor`        | 富文本编辑器                 | `@wangeditor-next/editor` |
| `C_Markdown`      | Markdown 编辑器/预览         | `md-editor-v3`            |
| `C_FormulaEditor` | 公式编辑器（安全表达式引擎） | 内置                      |
| `C_Signature`     | 电子签名                     | -                         |
| `C_QRCode`        | 二维码生成器                 | `qrcode`                  |
| `C_ImageCropper`  | 图片裁剪器                   | `vue-cropper`             |

## 数据展示组件

| 组件             | 说明                                      | 外部依赖                   |
| ---------------- | ----------------------------------------- | -------------------------- |
| `C_Table`        | 高级数据表格（CRUD/行列编辑/动态行/打印） | `print-js`、`html2canvas`  |
| `C_Map`          | 地图组件（OSM/高德）                      | `leaflet`                  |
| `C_VtableGantt`  | 甘特图                                    | `@visactor/vtable-gantt`   |
| `C_AntV`         | 图编辑器（ER/BPMN/UML）                   | `@antv/x6`、`html2canvas`  |
| `C_WaterFall`    | 瀑布流布局                                | -                          |
| `C_FullCalendar` | 日历事件                                  | `@fullcalendar/*`          |
| `C_VideoPlayer`  | 视频播放器（HLS/字幕/书签/章节）          | `xgplayer`、`xgplayer-hls` |
| `C_AudioPlayer`  | 音频播放器（波形/进度/播放列表）          | -                          |
| `C_FilePreview`  | 文件预览（PDF/Word/Excel）                | `xlsx`、`mammoth`          |
| `C_Timeline`     | 时间线（垂直/水平/可折叠）                | -                          |

图片/日历类组件的使用边界：`C_ImageCropper` 翻转会更新实际图片源并重置当前裁剪位置，加载和导出失败通过 `error: Error` 报告；`C_Signature` 的 `readonly` 只禁止用户交互，暴露方法仍可用于加载历史数据，其 SVG 导出是保留画布效果的栅格嵌入 SVG；`C_QRCode` 带 Logo 的 SVG 同样采用栅格嵌入，以保持预览与导出一致。`C_FullCalendar` 使用本地日历日期创建当日事件；`C_WaterFall` 会根据图片实际宽高比自动重排，建议以稳定唯一的 `id` 标识每项。

## 表单 & 布局组件

| 组件              | 说明                                              | 外部依赖             |
| ----------------- | ------------------------------------------------- | -------------------- |
| `C_Form`          | 动态表单引擎（Grid/Tabs/Steps/Card/Dynamic 布局） | -                    |
| `C_FormModal`     | 数据驱动的新增/编辑表单弹窗                       | -                    |
| `C_FormSearch`    | 搜索表单                                          | -                    |
| `C_CollapsePanel` | 折叠面板                                          | -                    |
| `C_SplitPane`     | 分割面板                                          | -                    |
| `C_Draggable`     | 拖拽排序                                          | `vue-draggable-plus` |
| `C_Tree`          | 高级树形控件                                      | -                    |
| `C_Time`          | 时间选择器增强                                    | -                    |
| `C_Cron`          | Cron 表达式编辑器                                 | -                    |
| `C_Transfer`      | 穿梭框（搜索/全选/批量操作）                      | -                    |

## 交互 & 业务组件

| 组件            | 说明                                   | 外部依赖 |
| --------------- | -------------------------------------- | -------- |
| `C_Chat`        | 聊天组件（联系人/消息气泡/输入框）     | -        |
| `C_ContextMenu` | 右键菜单（嵌套子菜单/快捷键/危险操作） | -        |
| `C_Login`       | 登录组件（5种模式/验证码/记住用户名）  | -        |

## 流程 & 通知组件

| 组件                   | 说明                                 | 外部依赖                                    |
| ---------------------- | ------------------------------------ | ------------------------------------------- |
| `C_WorkFlow`           | 工作流编辑器（审批/抄送/条件节点）   | `@vue-flow/core`                            |
| `C_NotificationCenter` | 通知中心（演示/远程/共享控制器）     | [接入指南](./guides/notification-center.md) |
| `C_Upload`             | 大文件上传（分片/断点续传/哈希校验） | `spark-md5`                                 |

## 依赖说明

`C_FilePreview` 的 URL 入口仅接受 HTTPS 或当前站点同源 HTTP（便于本地开发）；不接受脚本、数据 URL、带凭据 URL 或跨站明文 HTTP。`autoPreview` 会在有文件源时自动打开预览，已打开时切换文件源会刷新内容。重复预览会释放旧 PDF 对象 URL，并忽略过期加载结果。Excel 单元格的 `0` 与 `false` 会原样保留。

`C_AntV` 的 BPMN 对外数据保持 `{ nodes, flows }` 领域结构；组件内部转换为 X6 单元格，并在 `data-change` / `getData()` 中还原节点位置、类型、属性和连线条件。BPMN/UML 仅在未提供 `data` 时加载内置示例；显式传入空数据会显示空画布。

`C_VtableGantt` 合并预设与 `options` 时会保留未覆盖的嵌套配置、以新数组整体替换旧数组，并忽略原型相关键；全屏按钮状态仅反映该甘特图容器的实际全屏状态。

甘特图初始化或重建失败时，会清空已释放的 `ganttInstance`、显示错误及重试按钮，并触发 `error` 事件（参数为 `Error`）。组件实例公开 `loading`、`error` 和异步 `reload()`，使用侧可据此展示状态或主动重试；等待 `ganttCreated` 后再操作新的底层实例。

`C_AudioPlayer` 只在浏览器确认 `play()` 成功后进入播放状态并触发 `play`；自动播放被拒绝时会触发 `error`，空播放列表不会产生虚假的播放事件。静音、曲目和进度条均可用键盘操作。

`C_CollapsePanel` 与 `C_TagsView` 会校验本地持久化数据结构；损坏或旧格式数据会安全回退，不会阻断组件初始化。持久化标签仅恢复站内路径，特殊字符路径的定位不会拼接 CSS 选择器。

`C_Table` 列设置只恢复有效的列键、可见性、列宽和固定方向；损坏的 `persistKey` 存储会回退到传入列。列设置在本地副本上操作，不会修改调用方的列对象。`C_Upload` 的默认文件列表同样会复制后再管理，文件选择、拖拽和粘贴共用 `accept` 过滤，图片操作可通过键盘识别和访问；并发计算哈希时，各文件显示自己的进度。分片上传在查询断点、请求或合并阶段取消后，不会继续派发请求或发出过期的完成事件。自定义上传请求的 `abort()` 即使不回调，也会释放分片等待任务。

`C_WorkFlow` 会在首次渲染时加载传入的 `modelValue`，并在 `getCurrentWorkflowData()` / `save` / `change` / `node-click` 中输出隔离的数据快照，避免调用方意外修改内部节点。条件编辑弹窗在保存前不会修改画布数据，未填完整的条件不会被静默丢弃。`readonly` 禁止节点拖拽、连线、配置、增删与保存，但仍允许预览、验证和适应视图；节点与条件 ID 在同一时刻连续创建时保持唯一。

流程校验要求节点与连线标识唯一且非空、恰有一个开始节点、连线两端存在，且所有节点可从开始节点按连线方向到达。`allowCycles` 默认 `true`，兼容包含回路的通用流程；无环审批流程使用 `:allow-cycles="false"`，发现循环时阻止保存并定位结构错误。该选项可动态更新；校验结果仅代表图结构与节点配置合法，审批执行、权限和业务规则仍由业务后端负责。

类型验证同时覆盖 TypeScript 源码、Vue 单文件组件模板和发布后的使用侧示例。`C_Table` 合计行的 `summary.render` 应返回按列键组织的对象（`{ columnKey: { value, colSpan? } }`）；`C_FormSearch` 的日期范围兼容原有数字时间戳数组，也支持格式化字符串数组，两种值会分别绑定 Naive UI 对应的值接口。

组件运行依赖已由本包声明，安装组件库时会自动解析。所有场景都需要：

```bash
bun add vue naive-ui
```

按功能安装可选 peer：使用 `C_Breadcrumb`/`C_TagsView` 时安装 `vue-router`；启用 C_Table 行/列拖拽时安装 `sortablejs`。子路径导入不会要求无关的可选 peer。公式编辑器使用组件库内置的受限表达式解析器，不执行动态 JavaScript。

## 业务工作台组件

| 组件             | 说明                             |
| ---------------- | -------------------------------- |
| `C_Density`      | 子树密度默认值，无额外 DOM       |
| `C_SectionNav`   | 分区导航、错误计数与键盘焦点     |
| `C_ErrorSummary` | 可导航错误摘要，分页限制 DOM     |
| `C_DataPicker`   | 分页实体选择、跨页草稿与批量回显 |
| `C_BatchResult`  | 分项结果、筛选分页与显式重试     |

[数据与工作流指南](./guides/data-workflows.md)：共享字典、数值转换、主从资源、跨区域校验及重复表单。
