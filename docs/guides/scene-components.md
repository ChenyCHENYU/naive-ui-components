[← 组件目录](../components.md) · [English catalog](../components.en.md)

# 业务场景组件

各场景支持独立组件入口和对应的 `style.css`。应用提供业务数据、接口适配器和权限，组件处理交互、显示与会话状态。

| 场景                               | 接入入口                                                                                                                                      |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 粘贴物料号、订单号或工号后逐项确认 | `C_DataPicker` 的 `batchPaste`。编码与提交 ID 不同的来源提供 `resolveCodes`。 [实体选择](./data-picker.md)                                    |
| 确认实体后同步填入多个字段         | `createDataPickerField` 配置 `mapFields`，表单一次提交主字段和关联字段。 [关联回填](./data-picker.md#表单内嵌选择)                            |
| 页签共用筛选，各自分页             | `useTabbedQuery` 连接 `C_Tabs`、`C_FormSearch` 和当前 `C_Table`。 [共享查询](./data-workflows.md#多页签共享查询)                              |
| 筛选后导出本页、已选行或全部匹配   | `C_Table` 配置 `export.scopes`，远程全量由宿主回调创建任务。 [导出范围](./table-density.md#异步导出的快照与卸载)                              |
| 可视化组合条件与子组               | `C_FilterBuilder` 接受字段和 `v-model` 条件树。 [组合筛选](./filter-builder.md)                                                               |
| 表格穿梭与树形候选                 | `C_Transfer` 的 `columns` 和 `groupBy` 可以同时配置，同一份 `data` 和 `v-model` 用于左右面板。 [穿梭框](./transfer.md)                        |
| 字段级变更审阅                     | `C_ChangeReview` 接受 `before`、`after` 和 `fields`。页面收到采纳字段键后决定如何应用。 [字段审阅](./change-review.md)                        |
| 文件映射、预检、确认与分项结果     | `C_ImportWizard` 接受 `fields` 和 `adapter`，文件解析及业务提交由适配器处理。 [导入向导](./import-wizard.md)                                  |
| 混合附件、文档与媒体预览           | `C_Attachments` 共用附件清单，打开文档时加载预览器，Word 或 Excel 解析器按文件类型加载。 [附件资料](./attachments.md)                         |
| 资源占用、工作窗口和冲突           | `C_ResourceSchedule` 接受资源、时间范围和预约数据。 [资源排班](./resource-schedule.md)                                                        |
| 按状态和泳道显示任务               | `C_TaskBoard` 发出移动请求，页面应用成功结果后更新任务。 [泳道看板](./task-board.md)                                                          |
| 缺陷照片框选与说明                 | `C_ImageAnnotator` 用受控标注列表和归一化坐标编辑图片。 [图片标注](./image-annotator.md)                                                      |
| 待办、已办、星标或归档             | `C_NotificationInbox` 接受当前视图的 `views`、`items` 和 `v-model:active-view`，与顶部通知共用消息模型。 [通知接入](./notification-center.md) |
| 查看审批进度、历史和实例详情       | `C_ApprovalViewer` 接收数据源，可按实例 ID 直达。 [审批实例](./approval-viewer.md)                                                            |
| 显示后台任务进度、结果与下载       | `C_TaskPanel` 接收应用持有的任务列表与操作状态，展开时按需加载分项结果。 [后台任务](./task-panel.md)                                          |

## 记录详情、列表和窄工具栏

`C_Descriptions` 从 `data` 推导字段。`fields` 可配置 `group`、`show`、`format` 和 `copyable`。复制取格式化文本，复杂展示使用 `#value`。`columns` 限定最大列数，实际列数随容器宽度变化。

`C_RecordList` 接收 `items`、`item-key` 和 `item-view`。`layout="cards"` 可将同一组记录显示为卡片，`selectable` 搭配 `v-model` 保持当前选中记录。操作可放入 `#actions="{ item }"`。

`C_ActionBar` 配置 `:config="{ overflowAt: 480 }"` 后，会在容器低于 480 像素时把标记了 `overflow: true` 的普通动作放入「更多」。操作继续沿用原有禁用状态和执行锁。带自定义按钮属性、指令、提示或下拉菜单的动作保留完整按钮交互。

## 引导、命令和会话

`C_Guide` 的 `checklist.completedIds` 由应用提供，`steps` 通过稳定的 `id` 对应清单项。步骤可声明 `action: 'save-succeeded'`，应用在保存成功后调用 `guide.completeAction('save-succeeded')`。跨路由时可在目标挂载后用 `guide.startGuide(true, stepId)` 恢复。

`C_GlobalSearch` 在既有 `options` 中接收 `commands.sources`，适合把菜单、远程单据和快捷操作放在一个对话框。`command-select` 交给应用处理当前命令，权限上下文变化时更新 `commands.scope`。

`C_Chat` 的 `#message` 可定制消息正文，`activities` 和 `sources` 随消息提供。消息来源由 `source-click` 交给应用打开。模型交互、用户确认和权限位于应用层。

## 重复计划和扫码

`C_RecurrenceEditor` 用 `v-model` 编辑结构化重复规则。`parseRecurrenceRule` 与 `formatRecurrenceRule` 支持日、周、月、年、次数和全天截止日期，请在提交前序列化。全天规则的 `UNTIL` 使用 `YYYYMMDD`。应用保存带时区的精确起止时间，并通过相应日历协议处理带时间的截止条件。超出此编辑器范围的规则会被明确拒绝。 [RFC 5545](https://www.rfc-editor.org/rfc/rfc5545#section-3.3.10)

`C_ScanInput` 保留普通输入和扫码枪的回车提交，结果保持字符串。设置 `camera` 或 `photo` 后可启用相应入口。支持原生 `BarcodeDetector` 的环境可直接识别，其他环境可提供 `decode(source, signal)` 适配器。摄像头退出、业务 `scope` 更新与卸载都会释放媒体资源。 [BarcodeDetector](https://developer.mozilla.org/en-US/docs/Web/API/BarcodeDetector)

## 关系追溯

`C_RelationshipExplorer` 接受 `nodes` 和有方向的 `edges`，用 `v-model` 找到当前记录，`edgeTypes` 限定可见关系。提供 `trace-from` 后标出已加载数据中的最短有向路径。业务可通过 `expand` 追加邻居，通过 `#details` 展示当前记录。数据授权和跨系统查询继续由应用提供。

## 多面板工作台

固定主从布局继续用 `C_SplitPane`。自由停靠、组合页签、保存并恢复布局支持在具体业务路由接入 Dockview。 [固定分栏与自由停靠](./dockable-workbench.md)
