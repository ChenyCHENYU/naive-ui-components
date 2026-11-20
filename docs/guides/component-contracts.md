# 组件契约增强与兼容接入

本轮延续 0.32.0 的来源、密度和受控模型，优先补齐真实产销、质量、物流与 MDM 场景的公共配置。项目接口、权限、领域规则和真实审批执行仍由应用负责。

## 保留的旧行为

- 原有平坦列、列级 boolean 编辑开关、静态候选和 `editRender` 继续可用。
- 普通 C_Select 叶选项不需要增加组节点，也不会因为业务行含 children 就自动被当成分组。
- 搜索字段设置默认关闭；不启用时保留原显示/折叠/重置和查询载荷。设置字段可见性不会偷偷删除草稿值。
- Tree 不传远程来源时仍使用原数据、本地搜索与原生 `treeProps.onLoad`；原生透传继续可用。
- 全局搜索默认 `literal`，保留历史子串和结果顺序；新检索方式显式启用。
- 页签仍按 `path` 标识同一页面，旧持久化记录不需要迁移；query/hash 仅更新该标签保存的访问地址。
- 无页眉/页尾的打印继续使用原图片路径；显式打印 CSS 仍最后覆盖生成样式。

## 导航搜索：用配置启用更丰富的匹配

```ts
const options = {
  menuItems: () => authorizedMenus,
  matchMode: 'tokens' as const,
  onSelect: (key: string) => router.push(key),
}
```

`SearchMenuItem` 可选 `keywords: readonly string[]`、`breadcrumb: string`。tokens 模式归一化全角/大小写/空白，按词交集搜索标签、展示路径、所属目录和额外关键词；完整标题、标题前缀和标题子串优先，等权项保留源顺序。业务简称、拼音和领域别名由应用提供，组件不附带词库或额外搜索依赖。

需要自定义模糊匹配或范围策略时可提供 `options.search(query, currentItems)`，返回同步的匹配记录。组件按当前菜单键重新校验结果、去重并使用当前记录，避免旧菜单快照重新出现；当前菜单权限裁剪仍由应用负责。历史记录同样通过当前来源重新解析。

## 页签地址：身份与访问位置分开

`TagItem` 新增可选 `fullPath`。组件跟踪实际地址变化，将最新 query/hash 保存到原 path 的标签；点击标签、关闭后的回退均使用该完整地址。默认不会因为 query 变化创建新标签，也不会改变宿主路由/KeepAlive 缓存策略。

旧记录只有 path 时仍按原路径跳转。恢复 fullPath 时只接受属于该 path 的站内地址；损坏、跨站或与标签路径不符的地址回退到 path。独立使用 `useTagsView()` 的应用可以在 `addTag` 时一起传入 fullPath。

## 打印配置：传入参数具有实际行为

```ts
const printer = usePrintWatermark()
await printer.utils.printImage(imageUrl, {
  paperSize: 'A4',
  orientation: 'landscape',
  margin: '8mm 10mm',
  header: '库存盘点',
  footer: '复核签字：',
})
```

纸张/方向和边距生成 `@page` CSS；`style` 最后应用，可保留已有自定义打印样式。支持纸张名称或两项明确尺寸，例如 `100mm 150mm`；明确尺寸本身决定方向，不再追加 CSS 不支持的方向后缀。margin 接受一至四项长度，畸形值在打开引擎前报错。

页眉/页尾按**纯文本**转义，随图片前后排版，不执行 HTML。锁定的 print-js 1.6.0 图片路径没有页尾渲染，因此有页眉/页尾时使用该引擎的 raw-html 路径，并保留图片自适应。这里不是跨页重复页眉页脚或精准报表分页引擎。

异步打印引擎失败会拒绝 Promise，可通过 `onError` 接收错误；通知回调抛错不会阻断结束与清理。Promise 完成表示浏览器打印对话框关闭，不能当作实际出纸凭证。纸张和边距的最终结果仍受浏览器、打印设置与驱动影响。

## 图形、日历与媒体

- `C_AntV` 的 BPMN 接口使用 `{ nodes, flows }`。`data-change` 和 `getData()` 返回这个结构。BPMN、UML 在 `data` 省略时加载示例，显式空数据保留空画布。
- `C_VtableGantt` 的 `options` 保留未覆盖的嵌套默认值，数组整体替换。初始化或重建失败后公开 `error` 与 `reload()`，新的 `ganttInstance` 在 `ganttCreated` 后可用。全屏状态以当前组件容器为准。
- `C_FullCalendar` 按本地日历日期创建当日事件。`C_WaterFall` 按图片真实宽高比重新布局，条目使用稳定唯一的 `id`。
- `C_ImageCropper` 翻转会更新实际图片源并重置裁剪位置，加载和导出失败发出 `error`。`C_Signature` 在 `readonly` 下仍可通过实例方法载入历史签名。签名 SVG 与带 Logo 的二维码 SVG 均嵌入栅格内容，以保留预览效果。
- `C_AudioPlayer` 在浏览器确认播放成功后才发出 `play`。自动播放被拒绝时发出 `error`，静音、曲目和进度可以用键盘操作。

## 验证示例

```bash
bun run build
bun run dev:search-workflows
```

打开 `http://127.0.0.1:4188/contracts.html`。示例只存在于组件库 dev 目录，通过正式公开入口导入；支持离线来源、失败重试、范围切换、明暗主题、紧凑密度、分组 false/0、查询字段设置、分组表头与按行编辑。dev、测试和示例不会进入 npm 包。

Tree 的来源与方法见[树组件指南](./tree.md)，搜索字段与偏好见[搜索工作流](./search-workflows.md)。大树交互沿用 [Naive UI 官方 Tree](https://github.com/tusen-ai/naive-ui/blob/main/src/tree/demos/zhCN/index.demo-entry.md)；虚拟滚动时节点样式与测量高度必须一致，相关社区问题见 [#7529](https://github.com/tusen-ai/naive-ui/issues/7529)。

## 0.33.0 验证范围

- `bun run verify`：521 项单测、668 项组件回归、源码与消费者类型、导出冲突、发布清单、代码质量、构建、按需入口体积和打包消费者契约。
- `bun run check:consumer-contracts minimum`：全新安装 Vue 3.5.3、Naive UI 2.35.0、Vue Router 4.6.4、SortableJS 1.15.7，验证七个组件的浏览器构建、公开样式、CJS 运行和双格式声明。此历史最低组合仍不承诺原生 Node ESM，消费者检查使用 `skipLibCheck`，不代表第三方声明内部无错误。
- 浏览器离线交互：Tree 搜索路径自动展开、结果导航、未加载节点定位、失败重试和范围隔离；分组 false 原始值；查询字段锁定与范围偏好、树选择叶值序列化；分组表头、行锁定、三位精度与远程候选保存；多词菜单检索和键盘选择。检查明暗主题及 390px 视口，页面无横向溢出，宽表在自身容器滚动。
- 既有 400 字段用例保留单字段渲染次数及 DOM 身份断言，仅给予重型夹具 15 秒执行时限以容纳并行调度，并确保失败后卸载；它不是机器耗时基准。

所有按需入口预算保持不变；功能增加后的双格式运行代码与声明使物理总包预算增加 80 KiB，不以放宽入口门槛掩盖接入成本。大表数据量、远程接口延迟和节点高度仍需由真实业务数据验证。分组表头的跨组原生拖拽不启用，同组叶列顺序通过列设置调整。打印已验证配置与回调契约，未验证实体打印机出纸或驱动分页效果。
