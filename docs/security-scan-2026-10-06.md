[← 项目首页](../README.md)

# 安全扫描记录 · 2026-10-06

> 本文保留当次维护记录，不代表当前依赖、远端 CI 或最新扫描状态。

`0.13.5` 的 npm 产物与已验证产物内容一致。随后安全扫描更新了开发工具和解析依赖的锁文件，并将仓库 overrides 中的 `@xmldom/xmldom`、`fast-uri` 固定到 `0.8.15`、`3.1.8`；这部分仓库维护不覆盖已经发布的 npm 产物。

当次扫描仍报告 [braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) 和 [sprintf-js](https://github.com/advisories/GHSA-hp3w-g68c-fv3c) 两项上游尚无发布修复版本的告警，当次 `bun run check:audit` 非零退出。保留 CI 安全门禁和真实扫描结果；待上游发布修复后更新锁文件并复验。

当次本机完整 `verify` 通过。同步后的 [GitHub CI](https://github.com/ChenyCHENYU/naive-ui-components/actions/runs/37463121552) 因账号 billing issue 未启动，不能将其写成远端验证通过；账号恢复后需重新运行。
