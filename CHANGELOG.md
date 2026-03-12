# @robot-admin/naive-ui-components

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
