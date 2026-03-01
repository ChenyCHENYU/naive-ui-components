# Changesets

本项目使用 [Changesets](https://github.com/changesets/changesets) 管理版本发布。

## 工作流

1. 开发时：每次改动执行 `bun changeset` 记录变更
2. 发版时：执行 `bun version` 自动聚合 CHANGELOG 并 bump 版本
3. 发布：执行 `bun run build && bun release` 发布到 npm
