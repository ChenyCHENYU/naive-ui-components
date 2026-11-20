[← 项目首页](../README.md) · [English](./engineering.en.md)

# 开发与构建

## 构建架构

### 六阶段构建流水线

```
bun run build
  ├── 1. tsdown          → 多入口打包（76 组件 ESM/CJS/DTS）
  ├── 2. sass CLI        → 编译共享变量入口 → global-scss.css
  ├── 3. merge-css.js    → 合并 Vue 编译后的 SFC CSS + 全局变量 → style.css
  ├── 4. gen-exports.js  → 自动生成 package.json exports 映射
  ├── 5. check:dist      → 校验根入口、子路径、SSR 及 DTS 公共导出
  └── 6. check:size      → 校验全量/基础样式与发布包体积预算
```

### 技术要点

- **构建引擎**：[tsdown](https://github.com/rolldown/tsdown)（基于 Rolldown），76 个组件入口，加主入口与 Resolver
- **SCSS 处理**：自定义 `scssTransformPlugin` 在 Rolldown 管线内编译 SFC SCSS，独立 Sass CLI 仅编译共享变量入口
- **CSS 合并**：构建后将 Vue 已完成 scoped 转换的 per-chunk CSS 与共享变量合并为单一 `style.css`，避免重复样式和原始 `:deep()` 选择器泄漏
- **类型导出**：统一 `export *` barrel 模式，自动生成完整 `.d.ts`
- **子路径导出**：`gen-exports.js` 自动扫描 `dist/` 并写入 `package.json` 的 `exports` 字段
- **导出冲突检测**：`check-export-conflicts.js` 确保组件间无命名冲突
- **产物入口校验**：`check-dist-entries.js` 防止内部 chunk 覆盖根声明，并保证组件工具的子路径类型完整
- **包契约校验**：禁止 Naive UI 内部类型路径、隐式可选依赖和插件控制台副作用
- **体积预算**：`check-size-budget.js` 阻止全量样式、C_Form/C_Table 样式和 dist 总量意外膨胀
- **消费端预算**：`check-consumer-size.js` 用 Vite 构建各独立组件的最小消费场景，沿实际静态导入图累计首屏 JS gzip，并检查重型依赖与首次打开的增量。
- **类型质量预算**：脚本、模板绑定／插值、插槽参数与 SFC 泛型属性统一统计显式 `any`；注释、字符串和静态 HTML 不计入。回归覆盖统计边界，预算按当前实际值约束后续回涨。

### 输出产物

```
dist/
├── index.js / index.cjs / index.d.ts     # 主入口
├── C_Form.js / C_Form.cjs / C_Form.d.ts  # 子路径入口（76 组件）
├── C_Form.base.css / C_Form.css         # 基础/完整样式层级
├── C_Table.base.css / C_Table.css       # 基础/完整样式层级
├── style.css                             # 合并后的全量样式
├── images/                               # Leaflet Marker/图层控件资源
└── [chunk].js                            # 共享代码块
```

## 消费环境矩阵

| 配置                                     | 检查范围                                    | 原生 Node ESM                            |
| ---------------------------------------- | ------------------------------------------- | ---------------------------------------- |
| `minimum`：Vue 3.5.3 / Naive UI 2.35.0   | 干净安装、浏览器打包、ESM/CJS 类型、CJS SSR | 旧 Naive CommonJS 分发不支持原生命名导入 |
| 本地已验证：Vue 3.5.42 / Naive UI 2.45.3 | 完整检查、生产浏览器交互、ESM/CJS SSR       | 已验证 Node 20.20.2                      |
| `latest`                                 | 干净安装并严格检查原生 ESM/CJS SSR          | 以当次工具结果为准                       |

两种类型格式都在最低组合检查。`minimum` 的浏览器打包通过不代表对旧依赖执行了整套浏览器交互验收；本轮交互验收使用上表的本地组合。原生 ESM 的区别来自上游分发格式，保留浏览器与 CJS 用户的现有 peer 范围。CI 任务名和检查输出明确标识覆盖范围。

### TypeScript 构建与消费

仓库的源码类型检查与声明构建使用锁文件中的 **TypeScript 5.9.3**。CI 的 `consumer-types-ts58` 任务先使用该编译器构建，再切换到 **TypeScript 5.8.3**，执行 `check:consumer-types` 与 `check:consumer-contracts`，验证正式声明的 Vue SFC 消费以及打包消费者契约。

因此，5.8.3 是额外验证的**消费编译器版本**，不是仓库源码的构建工具版本。检查沿用消费夹具的 `skipLibCheck` 设置，验证公开 API 的使用与推导，不宣称完整检查所有第三方声明或覆盖所有 TypeScript 版本。具体任务见 [CI 配置](../.github/workflows/ci.yml)。

## 开发

维护环境为 Node.js 20.19.0+ 与固定的 Bun 1.4.2；仓库通过 `.node-version`、`packageManager` 和冻结锁文件保持本地/CI 一致。消费者 Bun 最低版本仍为 1.3.14；维护环境使用能真实应用条件 overrides 的版本，并校验实际解析结果。

```bash
bun install --frozen-lockfile # 严格按锁文件安装依赖
bun run dev              # 开发模式（SCSS watch + tsdown watch）
bun run build            # 完整构建
bun run build:scss       # 仅编译全局 SCSS
bun run build:css        # 合并 tsdown 刚生成的 CSS chunk；已完成的 dist 会安全跳过
bun run build:exports    # 仅生成 exports 映射
bun run check:exports    # 检测导出命名冲突
bun run check:dist       # 校验构建后的 JS / DTS 公共入口
bun run check:consumer-contracts # 真实打包消费者类型与可选 peer 边界
bun run check:package    # 校验依赖、导出和源码公共边界
bun run check:quality    # 防止 any、console 与类型抑制债务反弹
bun run check:audit      # 审计直接与传递依赖漏洞
bun run check:size       # 校验发布产物体积预算
bun run check:consumer-size # 构建后检查常用组件的消费端首屏预算
bun run type-check       # TypeScript 类型检查
bun run test             # 运行 Bun 单元测试
bun run lint:check       # Oxlint + ESLint（只检查）
bun run lint:eslint      # ESLint 存量规则审计
bun run verify           # 类型、测试、导出和构建全量验证
```

消费端预算包含 Vue 和 Naive UI，各入口独立测量，不能相加当作同一应用的体积。`C_Form/base` 为单输入字段，`C_Table/base` 为单列单行展示表格；搜索、操作栏、树、组织图、选择器与流程等也有对应的最小消费场景。基础样式排除内置富文本编辑器样式。动态 JS 会完成构建检查，但不计入首屏；DataPicker、UserPicker 与 AntV 还分别检查首次打开的增量。此检查衡量传输体积，不替代真实浏览器的交互性能测量。`verify` 和发布前生命周期均包含该门禁。

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
bun run test:browser    # 在正式构建产物上运行三浏览器回归
npm pack --dry-run      # 核对 npm 包的实际文件清单
bun run release         # 发布 Changesets 中待发布版本
```

生成版本后，将中英文 README 的仓库版本同步到 `package.json`。`verify` 会校验版本一致性，并通过 ESM、CJS 和 TypeScript 消费项目检查实际打包文件。Changesets 使用本地生成器生成变更日志。发布前通过 `npm whoami` 确认当前身份，发布后核对 npm 的版本和 `latest` 标签。

## 文档资源

品牌源文件与 PNG 导出位于 [`assets/`](./assets/)，配色、Logo 使用及导出方式见[资源说明](./assets/README.md)。

## 架构边界

依赖方向、应用所有权与后续 Element Plus 适配要求见[架构与隔离](./architecture.md)。
