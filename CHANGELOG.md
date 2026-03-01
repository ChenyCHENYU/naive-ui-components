# @robot-admin/naive-ui-components

## 0.5.0

### Minor Changes

- 依赖架构优化 + CSS 按需导入 + Changesets 集成
  - 将 optionalDependencies 迁移至 dependencies，消费端自动传递安装
  - 新增按组件 CSS 导出 (`C_*/style.css`)，支持样式按需导入
  - 修复 merge-css.js 中 esm/cjs CSS 重复合并问题
  - Resolver 新增 `importStyle` 选项，自动注入组件样式
  - 集成 @changesets/cli 自动化版本管理
