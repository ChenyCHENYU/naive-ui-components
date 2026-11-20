[← 项目首页](../README.md) · [English](./components.en.md)

# 组件目录

78 个公开组件均提供 `@robot-admin/naive-ui-components/C_组件名` 子路径和对应的 `/style.css`。优先按场景选组件，运行依赖和可选 peer 见[文末](#依赖与样式)。

## 按场景接入

| 要完成的任务                   | 推荐入口                                                                                                                               |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| 多列下拉选实体，确认后回填表单 | [`C_DataPicker`](./guides/data-picker.md#表单内嵌选择)的 `createDataPickerField` 与 `mapFields`                                        |
| 多个页签共享筛选，各自记住分页 | [`C_Tabs`、`C_FormSearch`、`C_Table` 组合](./guides/data-workflows.md#多页签共享查询)，通过独立 `/workflows` 入口接入 `useTabbedQuery` |
| 按本页、已选、全部匹配导出     | [`C_Table` 导出范围](./guides/table-density.md#异步导出的快照与卸载)，由应用将服务端任务投递给 [`C_TaskPanel`](./guides/task-panel.md) |
| 看审批进度、从消息直达具体实例 | [`C_ApprovalViewer`](./guides/approval-viewer.md)查看实例，[`C_WorkFlow`](./guides/workflow.md)编辑流程定义                            |
| 文件导入、字段审阅、排班、待办 | [业务场景接入总览](./guides/scene-components.md)                                                                                       |
| 固定主从布局、自由停靠工作区   | [`C_SplitPane`](./guides/split-pane.md)与[停靠方案](./guides/dockable-workbench.md)                                                    |

## 表单、查询与选择

| 组件              | 能力                                   | 指南                                                       |
| ----------------- | -------------------------------------- | ---------------------------------------------------------- |
| `C_Form`          | 配置驱动表单、动态字段、分区布局和校验 | [表单密度与布局](./guides/form-density.md)                 |
| `C_FormModal`     | 新增编辑弹窗、提交锁、未保存草稿保护   | [表单弹窗用法](./guides/usage.md#c_form--c_table-推荐用法) |
| `C_FormSearch`    | 草稿、提交与重置、已执行查询快照       | [搜索工作流](./guides/search-workflows.md)                 |
| `C_Select`        | 单选、多选、自由标签与远程分页         | [远程选项](./guides/remote-options.md)                     |
| `C_AutoComplete`  | 自由文本与本地或远程建议               | [远程选项](./guides/remote-options.md)                     |
| `C_DataPicker`    | 多列查看、候选分页、批量粘贴和关联回填 | [实体选择器](./guides/data-picker.md)                      |
| `C_UserPicker`    | 组织筛选、跨页草稿与人员多选           | [人员选择](./guides/user-picker.md)                        |
| `C_Tree`          | 树形选择、懒加载、搜索与路径定位       | [树组件](./guides/tree.md)                                 |
| `C_OrgChart`      | 组织架构布局与节点展示                 | [组织架构](./guides/org-chart.md)                          |
| `C_Transfer`      | 双栏穿梭、表格列和树形分组             | [穿梭框](./guides/transfer.md)                             |
| `C_FilterBuilder` | 嵌套条件组、字段与运算符配置           | [组合筛选](./guides/filter-builder.md)                     |
| `C_Cascade`       | 级联面板选择                           |                                                            |
| `C_City`          | 省、市、区三级联动                     |                                                            |
| `C_Date`          | 单日、范围与日期时间选择               |                                                            |
| `C_Time`          | 单时刻或时间段选择                     |                                                            |

## 表格、记录与操作

| 组件             | 能力                                     | 指南                                                            |
| ---------------- | ---------------------------------------- | --------------------------------------------------------------- |
| `C_Table`        | 表格编辑、远程分页、跨页选择、导出与打印 | [表格配置](./guides/table-density.md)                           |
| `C_ActionBar`    | 预设动作、异步执行锁与工具栏溢出         | [场景用法](./guides/scene-components.md#记录详情列表和窄工具栏) |
| `C_BatchResult`  | 批量结果、状态筛选与显式重试             | [批量结果](./guides/batch-results.md)                           |
| `C_ChangeReview` | 字段差异、审阅和选择采纳                 | [字段审阅](./guides/change-review.md)                           |
| `C_Descriptions` | 类型化详情、分组与复制                   | [场景用法](./guides/scene-components.md#记录详情列表和窄工具栏) |
| `C_RecordList`   | 受控记录列表或卡片、状态与行级操作       | [场景用法](./guides/scene-components.md#记录详情列表和窄工具栏) |
| `C_ErrorSummary` | 跨区域错误摘要与定位                     | [多区域校验](./guides/data-workflows.md#多区域校验和导航)       |
| `C_ContextMenu`  | 上下文菜单、子菜单与快捷键               |                                                                 |
| `C_Draggable`    | 同列表排序与可选的跨列表拖动             |                                                                 |
| `C_WaterFall`    | 瀑布流、变高卡片与长列表窗口化           | [瀑布流](./guides/waterfall.md)                                 |

## 流程、任务与消息

| 组件                     | 能力                                   | 指南                                                           |
| ------------------------ | -------------------------------------- | -------------------------------------------------------------- |
| `C_WorkFlow`             | 流程定义编辑、预览与结构校验           | [流程定义](./guides/workflow.md)                               |
| `C_ApprovalViewer`       | 只读查看历次审批、处理人和记录         | [审批实例](./guides/approval-viewer.md)                        |
| `C_TaskPanel`            | 后台任务进度、分项结果、下载与重试入口 | [后台任务](./guides/task-panel.md)                             |
| `C_TaskBoard`            | 状态列、泳道和受控移动                 | [任务看板](./guides/task-board.md)                             |
| `C_NotificationCenter`   | 顶部通知、演示与共享控制器             | [通知接入](./guides/notification-center.md)                    |
| `C_NotificationInbox`    | 可配置待办视图、连续序号与宿主操作     | [全页收件箱](./guides/notification-center.md#全页待办与收件箱) |
| `C_Chat`                 | 对话、消息输入、活动与来源引用         | [会话用法](./guides/scene-components.md#引导命令和会话)        |
| `C_Guide`                | 页面引导与可恢复的完成清单             | [引导配置](./guides/usage.md#c_guide-配置引导)                 |
| `C_SectionNav`           | 分区导航、错误计数与键盘定位           | [多区域校验](./guides/data-workflows.md#多区域校验和导航)      |
| `C_RelationshipExplorer` | 有向关系、路径和当前记录详情           | [关系追溯](./guides/scene-components.md#关系追溯)              |
| `C_Timeline`             | 垂直、水平和可折叠时间线               |                                                                |

## 文件、内容与图像

| 组件               | 能力                             | 指南                                                    |
| ------------------ | -------------------------------- | ------------------------------------------------------- |
| `C_Upload`         | 文件管理、分片上传与断点续传     | [上传约定](./guides/usage.md#上传文档和长列表)          |
| `C_Attachments`    | 统一附件清单与按需预览           | [附件清单](./guides/attachments.md)                     |
| `C_FilePreview`    | PDF、Word、Excel 预览            | [文件预览约定](./guides/usage.md#上传文档和长列表)      |
| `C_ImportWizard`   | 文件映射、预检、确认和分项结果   | [导入向导](./guides/import-wizard.md)                   |
| `C_Code`           | 代码高亮                         |                                                         |
| `C_Editor`         | 富文本编辑                       |                                                         |
| `C_Markdown`       | Markdown 编辑与预览              |                                                         |
| `C_AudioPlayer`    | 音频播放、波形与播放列表         |                                                         |
| `C_VideoPlayer`    | 视频、HLS、字幕与书签            | [视频协议](./guides/usage.md#视频协议与通知预览)        |
| `C_ImageAnnotator` | 矩形标注与键盘坐标编辑           | [图片标注](./guides/image-annotator.md)                 |
| `C_ImageCropper`   | 图片裁剪、翻转和导出             |                                                         |
| `C_Signature`      | 签名绘制、历史数据和图片导出     |                                                         |
| `C_Barcode`        | 条形码生成                       |                                                         |
| `C_QRCode`         | 二维码和带标识的导出             |                                                         |
| `C_ScanInput`      | 普通输入、扫码枪、照片和相机识别 | [扫码用法](./guides/scene-components.md#重复计划和扫码) |

## 排班、计划与图形

| 组件                 | 能力                          | 指南                                                    |
| -------------------- | ----------------------------- | ------------------------------------------------------- |
| `C_ResourceSchedule` | 多资源占用、工作窗口与冲突    | [资源排班](./guides/resource-schedule.md)               |
| `C_RecurrenceEditor` | 日、周、月、年重复规则        | [重复计划](./guides/scene-components.md#重复计划和扫码) |
| `C_FullCalendar`     | 日历事件及拖动和时段更新      | [状态约定](./guides/usage.md#状态一致性与资源边界021)   |
| `C_VtableGantt`      | 甘特图、工期和全屏计划视图    |                                                         |
| `C_Cron`             | Cron 编辑、校验及运行时间预览 | [Cron 与公式](./guides/usage.md#cron-与公式工作区)      |
| `C_FormulaEditor`    | 受限表达式编辑与试算          | [Cron 与公式](./guides/usage.md#cron-与公式工作区)      |
| `C_AntV`             | ER、BPMN、UML 图编辑          |                                                         |
| `C_Map`              | 地图、标记与 OSM／高德底图    | [地图用法](./guides/usage.md#c_map-推荐用法)            |

## 导航、布局与基础控件

| 组件              | 能力                             | 指南                                                                   |
| ----------------- | -------------------------------- | ---------------------------------------------------------------------- |
| `C_Menu`          | 响应主题的菜单导航               |                                                                        |
| `C_Breadcrumb`    | 面包屑与目录导航                 | [面包屑](./guides/usage.md#面包屑与目录导航)                           |
| `C_Tabs`          | 受控或非受控标签页与延迟挂载     | [共享查询组合](./guides/data-workflows.md#多页签共享查询)              |
| `C_TagsView`      | 路由标签与访问位置恢复           | [路由标签](./guides/component-contracts.md#页签地址身份与访问位置分开) |
| `C_GlobalSearch`  | 菜单、关键词、远程结果与命令入口 | [全局搜索](./guides/global-search.md)                                  |
| `C_CollapsePanel` | 折叠区域                         |                                                                        |
| `C_SplitPane`     | 可嵌套、可用键盘调整的分栏       | [分割面板](./guides/split-pane.md)                                     |
| `C_Density`       | 子树密度默认值                   | [主题](./guides/theme.md)                                              |
| `C_Theme`         | 主题切换                         | [主题](./guides/theme.md)                                              |
| `C_Language`      | 语言切换                         |                                                                        |
| `C_Login`         | 登录表单与字段扩展               | [登录扩展](./guides/usage.md#c_login-扩展表单)                         |
| `C_Captcha`       | 拼图与可选服务端人机校验流程     | [服务端校验](./guides/usage.md#c_captcha-服务端校验)                   |
| `C_Icon`          | Iconify 图标                     |                                                                        |
| `C_AvatarGroup`   | 多头像与溢出提示                 |                                                                        |
| `C_Progress`      | 进度条                           |                                                                        |
| `C_Steps`         | 步骤条                           |                                                                        |
| `C_Skeleton`      | 骨架屏                           |                                                                        |
| `C_Loading`       | 主题加载态                       |                                                                        |
| `C_PageLoading`   | 页面切换反馈                     | [页面加载](./guides/usage.md#页面切换加载)                             |

## 依赖与样式

- `vue` 和 `naive-ui` 是必需的 peer。`vue-router` 用于 `C_Breadcrumb`、`C_TagsView` 和全量插件入口。启用 `C_Table` 行列拖拽时安装 `sortablejs`。
- 组件运行依赖随包解析。用于 Excel 预览和导出的 SheetJS 随发布产物分发，Word 文档解析按需加载 `mammoth`。表单与表格基础样式分别由 `/C_Form/base.css` 和 `/C_Table/base.css` 提供。完整的样式选择见[导入方式](./guides/usage.md#导入方式)。
