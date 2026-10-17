---
'@robot-admin/naive-ui-components': minor
---

收敛组件发布与实例边界，为独立 UI 适配建立有界的内部协议层。

- 修复 ESM/CJS 条件类型映射，消除公共可达声明中的 Naive 内部路径，并增加真实 tarball 消费者验证。
- 全量插件按公开的 C_* 名称注册，修复多个 index.vue 以 index 名称互相覆盖的问题。
- 拆分无 UI 依赖的反馈／语言协议、Vue 上下文与 Naive 反馈适配，保留现有配置导入。
- 高亮默认按应用／实例隔离，不再隐式写 window.hljs；旧窗口用法需显式 exposeToWindow。
- 全量安装默认使用应用独立的表单渲染器 registry；原 registerRenderer 全局路径保留给 legacy 消费者，插件项目改用 formRenderers 配置。
- 现有组件、子路径与样式继续专注 Naive UI，Element Plus 将通过真实业务试点独立适配和发布。
