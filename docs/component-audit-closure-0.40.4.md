# 0.40.4 逐组件审计闭环

日期：2026-11-15。基线：0.40.3 / `d5d3816`。本轮依据 63 个公开组件的主实现、类型、关键状态与相关回归审查修复；不把“覆盖全部组件”解释为任意业务组合、辅助文件或浏览器条件下零缺陷。Robot_Admin、MachTable、Element Plus 适配和后端审批执行引擎不在本次修改范围。

## 审计事项与最终行为

| 事项                     | 最终行为                                                                                                          | 正式回归                                                               |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| H01 / AntV               | ER/UML/BPMN 编辑只持有当前记录基线，实质换源后旧保存/删除失效；等值回填和无关节点更新保留，提交前结束会话避免重入 | `antv-edit-session.test.ts`、`antv-data-permissions.component.ts`      |
| F01 / Table              | 公开子行选择复用界面已有的资格校验、去重、父子联动和完整记录事件；保持现有方法                                    | `table-child-selection-api.component.ts`，包括真实 C_Table 实例        |
| F02 / FormSearch         | 历史内存归属存储键；切换关闭旧面板、恢复新范围，未聚焦直接保存也隔离；显式默认建议保留，已清空记录不会复活        | `search-history-boundaries.component.ts`                               |
| N01 / Captcha            | provider/challenge/verifier/服务验证要求变化取消旧任务并清空证明；主题、语言变化只更新外观                        | `navigation-boundaries.component.ts`                                   |
| N09 / Captcha            | SDK 使用与包装文案相同的有效 locale；不要求额外语言属性                                                           | `navigation-boundaries.component.ts`、`navigation-locale.component.ts` |
| N02 / CollapsePanel      | 头部只处理自己的 Enter/Space，插槽按钮保留原生操作                                                                | `navigation-boundaries.component.ts`                                   |
| N03 / Login              | 初始化、动态模式变化和提交入口共同尊重 feature；全部关闭时不允许旧表单提交                                        | `navigation-boundaries.component.ts`                                   |
| N04 / ContextMenu        | 动态 disabled 关闭菜单，同帧或旧菜单项回调不能执行选择                                                            | `navigation-boundaries.component.ts`                                   |
| N05 / GlobalSearch       | 模态面板 Tab/Shift+Tab 约束与关闭焦点还原；快速关闭/重开和卸载不被旧回调抢焦点                                    | `navigation-boundaries.component.ts`、`audit-contracts.browser.ts`     |
| N06 / TagsView           | 主导航为独立原生链接，关闭按钮分开；Router 生成 href，部署 base、hash/query、Ctrl/Meta 点击保留                   | `navigation-boundaries.component.ts`                                   |
| N07 / NotificationCenter | 默认正文有原生键盘查看入口，已读/删除操作保持独立                                                                 | `navigation-boundaries.component.ts`                                   |
| N08 / Login              | 忘记密码和注册为原生按钮，沿用原事件和样式                                                                        | `navigation-boundaries.component.ts`                                   |
| H02 / Word               | 目录仅定位当前文档容器内的精确 ID                                                                                 | `file-preview-pagination-boundaries.component.ts`                      |
| H03 / Excel              | 合并区域投影到当前页，截断 rowspan 并补延续锚点；不改变源数据                                                     | `file-preview-pagination-boundaries.component.ts`                      |
| H04 / Signature          | 已有 eraserConfig.size 生效，新笔画保存实际 eraserSize，旧快照缺字段仍按原20px回放                                | `signature-drawing-boundaries.component.ts`                            |
| H05 / Signature          | 单点按笔宽绘制，首次与历史回放共用路径，数据非空与画面一致                                                        | `signature-drawing-boundaries.component.ts`                            |
| R01 / Progress           | 动画终点保留精确小数，取消、即时值和 multiple-circle 继续工作                                                     | `display-contracts.component.ts`、`audit-contracts.browser.ts`         |
| W01 / WorkFlow           | 连线点击桥接现有公共事件，输出公开边快照而非 SDK 运行态                                                           | `workflow-designer.component.ts`                                       |
| W02 / WorkFlow           | 换源使打开中的旧预览失效；确认前核对当前模型，等值回填不误关闭                                                    | `workflow-designer.component.ts`                                       |
| F03 / ActionBar          | 既有 horizontal 配置呈现20px按钮间短横线，默认竖线和隐藏配置不变                                                  | `action-divider.component.ts`                                          |
| F04 / Cascade            | Props 同源导出，使用侧直接声明公共配置                                                                            | `C_Cascade.vue` 消费夹具                                               |
| F05 / Transfer           | group/description 保留为兼容元数据；注释准确说明默认行只呈现图标与标签、分组/详情由 item 插槽定制                 | 类型注释与中英指南                                                     |
| R02 / Timeline           | 实例内弱缓存按节点内容失效；折叠内容保持惰性，移除节点不被缓存强持有                                              | `display-contracts.component.ts`                                       |
| R03 / Timeline           | 已有标签 type 采用主题语义色，历史自定义字符串保留默认主色                                                        | `display-contracts.component.ts`、`audit-contracts.browser.ts`         |
| R04 / Skeleton           | repeat 文档明确用于 text/card/image；列表继续仅使用 list.items，避免双计数配置                                    | 同源 Props 注释与中英指南                                              |
| H06 / Upload             | 续传初始化后增量统计；每片只结算一次，重复成功、重试、取消和同步重入不重复计数                                    | `upload-core.test.ts`                                                  |

## 接入与维护收敛

- Barcode、Cascade、Progress、Steps、Code、Editor、Markdown 共用并导出各自 Props，根入口与组件子路径一致；公共配置可直接 `satisfies Props`，没有新配置工厂或必选 helper。
- 移除 Steps、Language、TagsView 与公开类型完全重复的私有 Legacy 声明；公开兼容入口不删除。
- WaterFall 从 items 推导布局、事件与插槽的业务字段。采用 Vue 自然类型推导，移除不准确的泛型断言，保留既有深只读与嵌套 Ref 解包行为；普通业务接口不需要索引签名、转换或显式泛型。消费夹具包含数字字段、readonly、Ref 解包及错误用法反例。
- AvatarGroup、City、GlobalSearch、Guide、Login 的默认辅助文案使用组件私有词表，继续沿用现有 ComponentLocale 注入和翻译优先级；显式文案、业务值和 Login 旧翻译器保持兼容。词条不加入公共全量字典。
- WorkFlow roles 明确为保留的兼容输入；不以修文档为由添加角色执行或后端审批引擎。

## 性能与体积

同一隔离上传探针中，100/1000分片的 filter 元素访问由20300/2003000降为100/1000。该记录证明统计成本由反复全量扫描变为一次扫描加增量更新，不是浏览器帧率或真实网络吞吐承诺。Timeline 的24条静态内容在无关 pending/reverse 更新时不再重复净化；真实浏览器另检验净化策略没有被缓存绕过。

相对0.40.3，双格式物理产物增加32226 B：ESM11787 B、CJS13030 B、声明4050 B、物理CSS3359 B。总物理预算按实测追加32 KiB；各组件首屏、首开及全部CSS限额保持原值。C_Table/base 约249.9 KiB/250 KiB，ActionBar约94.8 KiB/95 KiB。私有文案没有拖入无关入口。

## 验证范围

完整 `bun run verify` 已通过：586项逻辑测试、1011项组件挂载测试，包含源码/组件/正式消费类型、导出、vendor、旧API、包契约、构建、首屏/首开预算和dist消费者验证。

独立安装的最低组合为Vue3.5.3 / Naive UI2.35.0 / Router4.6.4，最新组合为Vue3.5.45 / Naive UI2.45.3 / Router5.5.1，两者均通过发布包契约。最低组合继续验证旧Naive UI的浏览器构建与CJS SSR；不声称旧Naive UI支持原生Node ESM。消费检查使用skipLibCheck验证本库使用契约，不扩大为第三方声明内部完整验证。

正式dist消费者的30项Chromium/Firefox/WebKit交互和3项Chromium性能回归全部通过，无重试，页面错误与浏览器console告警断言通过。新增浏览器回归覆盖GlobalSearch顺序Tab/Shift+Tab/关闭还原，以及进度小数终点、Timeline真实净化与标签主题色更新。

本机固定规模单次串行观察：100/500个展开组织卡片挂载46.2/57.8ms；300+300行、240个输入工作台挂载163.1ms、选择27.8ms、输入更新41.2ms，卸载后宿主DOM为零。沿用既有门禁，不以这些单次值声称P95、GC、堆内存无泄漏或任意规模性能。

依赖审计0项发现，67项行为保护检查通过。源码质量预算保持102个显式any、14个console，没有增加压制或动态求值。GitHub远端CI与本地执行分开核对，不能将未运行的远端任务计为通过。

组件原有的大图、长会话、组织树可见DOM和地图标记规模仍需真实业务数据确定；本轮不新增未经测量的虚拟化/缓存框架，不把源码审计等同所有wl页面已迁移验收。17条既有lint警告主要属于Cron/公式解析/Table多分支和少量风格提醒，本轮不靠压制规则或拆碎函数消除数字。
