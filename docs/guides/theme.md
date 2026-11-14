# 主题与视觉标准

组件库维护语义色、控件尺寸和圆角角色；Naive UI 负责原生控件的主题计算。两者使用同一个 `NConfigProvider`，不需要额外的主题容器或全局状态。

## 一次配置

```vue
<script setup lang="ts">
  import { computed, ref } from 'vue'
  import { NConfigProvider } from 'naive-ui'
  import { createComponentTheme } from '@robot-admin/naive-ui-components/config'

  const dark = ref(false)
  const theme = computed(() =>
    createComponentTheme({
      mode: dark.value ? 'dark' : 'light',
      primary: '#2563eb',
      radius: 6,
    })
  )
</script>

<template>
  <NConfigProvider v-bind="theme">
    <slot />
  </NConfigProvider>
</template>
```

`createComponentTheme()` 是可选的。已有项目继续传自己的 `theme` / `themeOverrides` 即可，自绘区域默认跟随当前 Provider。嵌套 Provider 可以使用不同品牌和明暗主题，不会改写父级或兄弟实例。

工厂接受 `mode`、`primary`、`success`、`warning`、`error`、`info`、`radius`。颜色接受 `#RGB` / `#RRGGBB`，以便 Naive 与第三方 SDK 正确计算衍生色。圆角接受非负有限像素值。返回配置可以按 Naive 的标准方式继续补充组件级覆盖。

## 色彩角色

| 角色                     | 浅色      | 深色      | 用途                 |
| ------------------------ | --------- | --------- | -------------------- |
| primary                  | `#2563eb` | `#60a5fa` | 主操作、选中、焦点   |
| success                  | `#15803d` | `#4ade80` | 成功、通过           |
| warning                  | `#b45309` | `#fbbf24` | 提醒、待处理         |
| error                    | `#b91c1c` | `#f87171` | 错误、拒绝           |
| info                     | `#0369a1` | `#38bdf8` | 一般信息             |
| bg-body                  | `#f6f8fc` | `#111827` | 页面背景             |
| bg-card                  | `#ffffff` | `#1f2937` | 内容面板             |
| bg-surface               | `#ffffff` | `#253246` | 浮层、编辑工具       |
| text-1 / text-2 / text-3 | 深到浅    | 浅到深    | 正文、辅助、次要信息 |
| border                   | `#dce3ed` | `#40516a` | 分隔与边框           |

完整标准由 `COMPONENT_COLOR_PALETTES` 导出；修改主题时集中维护，不在业务页面重复写色值。实色按钮前景会依据品牌色计算黑/白文字；自定义内容仍需根据实际字号和背景检查可读性。

## 尺寸与形状

| 尺寸     | tiny | small | medium | large |
| -------- | ---- | ----- | ------ | ----- |
| 控件高度 | 22px | 28px  | 34px   | 40px  |

`C_Density` 将区域密度传给表单、表格、搜索、操作组、日期时间和独立选择控件。显式 `size` 优先；没有密度容器时保留各组件原有默认值及 Naive Form 的尺寸继承。

圆角按角色区分：控件使用 `radius`，小工具使用 `radius-sm`，面板使用 `radius-panel`，大卡片使用 `radius-lg`。分割手柄、头像、聊天气泡、流程节点保留自己的形状，避免机械地统一成同一种圆角。

步骤条 `icon` 可直接传 `mdi:account`，也兼容单个 `i-mdi:account`。这两种写法使用共享图标组件；已有自定义 CSS 类和组合类仍按原方式渲染。自定义 Iconify 图标沿用 `C_Icon` 的本地注册与加载机制，不要求业务生成 UnoCSS 图标类。

## 局部覆盖与边界

公开的 `--c-primary`、`--c-bg-card`、`--c-text-1`、`--c-border`、`--c-radius` 等 CSS 变量可以局部覆盖自绘区域。内部 `--c-theme-*` 只提供来自 Provider 的默认值，不应由业务代码依赖。公开变量优先于内部默认值。

```vue
<C_Steps style="--c-primary: #8b5cf6" :steps="steps" />
```

涉及 Naive 原生控件的品牌和明暗，请优先配置 Provider，避免只改某个 CSS 变量后原生按钮和自绘区域不一致。组件显式传入的旧 `theme` / `isDark` 设置继续优先于默认的 Provider 明暗。

库自有弹层会携带当前 Provider 及直接传入组件 `style` 中的 `--c-*` 变量。普通祖先节点的 CSS 继承不会自动跨过 Teleport；需要弹层使用的自定义变量应直接传给对应组件，或通过 Provider 配置。

富文本通过编辑器官方 `--w-e-*` 变量适配；图形和甘特图通过 SDK 公开配置适配。Markdown SDK 的原生 body 弹窗只支持其明暗主题，无法承诺独立实例的自定义品牌色；库不会为此写全局选择器或修改其他实例 DOM。二维码、条码、文档纸张、地图瓦片与业务节点配色保留各自语义。

样式限定在组件与其弹层作用域内，不修改全局 Naive 规则。Naive 升级仍需执行主题、尺寸和 SDK 回归；宿主的全局 `!important` 样式也仍可能覆盖局部外观。

## 独立演示

在组件库目录执行 `bun run build`、`bun run dev:search-workflows`，打开 `http://127.0.0.1:4188/visual-standards.html`。可切换明暗、品牌与密度，检查城市浮层、导航、穿梭框、长时间线、富文本及代码全屏。演示使用正式公开入口和离线图标子集；不依赖 Robot_Admin，也不进入 npm 运行时产物。
