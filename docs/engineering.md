[← 项目首页](../README.md) · [English](./engineering.en.md)

# 开发与构建

## 构建架构

### 六阶段构建流水线

```
bun run build
  ├── 1. tsdown          → 多入口打包（55 组件 ESM/CJS/DTS）
  ├── 2. sass CLI        → 编译共享变量入口 → global-scss.css
  ├── 3. merge-css.js    → 合并 Vue 编译后的 SFC CSS + 全局变量 → style.css
  ├── 4. gen-exports.js  → 自动生成 package.json exports 映射
  ├── 5. check:dist      → 校验根入口、子路径、SSR 及 DTS 公共导出
  └── 6. check:size      → 校验全量/基础样式与发布包体积预算
```

### 技术要点

- **构建引擎**：[tsdown](https://github.com/rolldown/tsdown)（基于 Rolldown），55 个组件入口，加主入口与 Resolver
- **SCSS 处理**：自定义 `scssTransformPlugin` 在 Rolldown 管线内编译 SFC SCSS，独立 Sass CLI 仅编译共享变量入口
- **CSS 合并**：构建后将 Vue 已完成 scoped 转换的 per-chunk CSS 与共享变量合并为单一 `style.css`，避免重复样式和原始 `:deep()` 选择器泄漏
- **类型导出**：统一 `export *` barrel 模式，自动生成完整 `.d.ts`
- **子路径导出**：`gen-exports.js` 自动扫描 `dist/` 并写入 `package.json` 的 `exports` 字段
- **导出冲突检测**：`check-export-conflicts.js` 确保组件间无命名冲突
- **产物入口校验**：`check-dist-entries.js` 防止内部 chunk 覆盖根声明，并保证组件工具的子路径类型完整
- **包契约校验**：禁止 Naive UI 内部类型路径、隐式可选依赖和插件控制台副作用
- **体积预算**：`check-size-budget.js` 阻止全量样式、C_Form/C_Table 样式和 dist 总量意外膨胀

### 输出产物

```
dist/
├── index.js / index.cjs / index.d.ts     # 主入口
├── C_Form.js / C_Form.cjs / C_Form.d.ts  # 子路径入口（55 组件）
├── C_Form.base.css / C_Form.css         # 基础/完整样式层级
├── C_Table.base.css / C_Table.css       # 基础/完整样式层级
├── style.css                             # 合并后的全量样式
├── images/                               # Leaflet Marker/图层控件资源
└── [chunk].js                            # 共享代码块
```

## 开发

环境基线为 Node.js 20.19.0+ 与 Bun 1.3.14；仓库通过 `.node-version`、`packageManager`、`engines` 和冻结锁文件保持本地/CI 一致。

```bash
bun install --frozen-lockfile # 严格按锁文件安装依赖
bun run dev              # 开发模式（SCSS watch + tsdown watch）
bun run build            # 完整构建
bun run build:scss       # 仅编译全局 SCSS
bun run build:css        # 合并 tsdown 刚生成的 CSS chunk；已完成的 dist 会安全跳过
bun run build:exports    # 仅生成 exports 映射
bun run check:exports    # 检测导出命名冲突
bun run check:dist       # 校验构建后的 JS / DTS 公共入口
bun run check:package    # 校验依赖、导出和源码公共边界
bun run check:quality    # 防止 any、console 与类型抑制债务反弹
bun run check:audit      # 审计直接与传递依赖漏洞
bun run check:size       # 校验发布产物体积预算
bun run type-check       # TypeScript 类型检查
bun run test             # 运行 Bun 单元测试
bun run lint:check       # Oxlint + ESLint（只检查）
bun run lint:eslint      # ESLint 存量规则审计
bun run verify           # 类型、测试、导出和构建全量验证
```

### 项目结构

```
naive-ui-components/
├── src/
│   ├── index.ts                     # 库入口（全量注册 + export * barrel）
│   ├── styles/
│   │   ├── variables.scss           # CSS 变量 (--c-*)
│   │   └── global.scss              # 自动生成的共享变量入口
│   ├── components/
│   │   └── C_[Name]/
│   │       ├── index.vue            # 组件主文件
│   │       ├── index.ts             # Barrel 导出
│   │       ├── index.scss           # 组件样式
│   │       ├── types.ts             # 类型定义
│   │       ├── constants.ts         # 常量
│   │       ├── data.ts              # 静态数据
│   │       ├── composables/         # 组合式函数
│   │       ├── components/          # 子组件
│   │       └── layouts/             # 布局变体（C_Form/C_AntV）
│   ├── plugins/                     # highlight.js 等插件
│   └── utils/                       # 工具函数
├── scripts/
│   ├── gen-global-scss.js           # 生成 global.scss（仅共享变量）
│   ├── watch-global-scss.js         # 开发模式 SCSS 监听
│   ├── merge-css.js                 # 合并 CSS 产物
│   ├── gen-exports.js               # 自动生成 package.json exports
│   └── check-export-conflicts.js    # 导出命名冲突检测
├── types/
│   └── env.d.ts                     # .vue / .scss 模块声明
├── tsdown.config.ts                 # 构建配置（多入口 + SCSS 插件 + Vue 插件）
└── tsconfig.json
```

### 添加新组件

1. 创建 `src/components/C_NewComponent/` 目录
2. 编写 `index.vue`、`index.ts`（barrel）、`types.ts`
3. 在 `src/index.ts` 中添加 `export * from './components/C_NewComponent'`
4. 在 `src/index.ts` 中导入组件并加入 `components` 注册数组
5. 在 `src/resolver.ts` 的 `componentNames` 中登记名称
6. 运行 `bun run verify`—构建脚本会自动生成子路径入口和 exports 映射

### 发布

```bash
bun run changeset       # 记录变更及版本级别
bun run version         # 更新版本号与 CHANGELOG
bun run verify          # 发布前完整验证
bun run release         # 发布 Changesets 中待发布版本
```

本仓库的 GitHub 变更日志生成器要求在执行 `bun run version` 时提供 `GITHUB_TOKEN`，不要将令牌写入仓库。Windows 下如果 `bun run release` 在 npm 的 `prepublishOnly` 重复验证阶段停滞，可先单独确认 `bun run verify` 成功，再在 PowerShell 中用 `$env:npm_config_ignore_scripts='true'; bun run release` 发布；该设置仅跳过已手动完成的重复生命周期验证，不应省略前一步。

## 文档资源

品牌源文件与 PNG 导出位于 [`assets/`](./assets/)，配色、Logo 使用及导出方式见[资源说明](./assets/README.md)。
