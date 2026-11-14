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
      primary: dark.value ? '#a78bfa' : '#6d28d9',
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

项目的全局主题放在一份配置中即可。所有颜色都是可选的扁平属性，只填写项目需要改变的角色；其余沿用所选模式的默认值。省略 `mode` 时使用 `light`，省略 `radius` 时使用 `6px`；工厂不会自动读取父级 Provider，动态切换采用上方的 `computed` 写法。

```ts
// 项目 theme.ts
import { createComponentTheme } from '@robot-admin/naive-ui-components/config'

export const theme = createComponentTheme({
  primary: '#6d28d9',
  bgBody: '#faf7f1',
  bgCard: '#fffdf8',
  bgMuted: '#f3eddf',
  text1: '#362c22',
  border: '#ddcfb9',
})
```

App 中把这个对象绑定到现有 `NConfigProvider`。页面、表单和表格不重复传颜色，也不需要自行生成悬停色、维护 CSS 变量或声明 Naive 类型扩展。

| 配置                                             | 用途                                                              |
| ------------------------------------------------ | ----------------------------------------------------------------- |
| `primary`、`success`、`warning`、`error`、`info` | 品牌与状态色；原生控件的悬停和按下色自动生成                      |
| `onSolid`                                        | 品牌/语义实色面上的文字、图标和勾选标记，明暗模式均默认 `#ffffff` |
| `bgBody`、`bgCard`、`bgSurface`                  | 页面、内容面板、浮层背景                                          |
| `bgMuted`、`bgHover`、`bgActive`                 | 次要区域、悬停和按下背景，统一原生表头、输入和按钮等状态面        |
| `text1`、`text2`、`text3`、`text4`               | 正文、辅助、次要、禁用文字；相应图标和输入提示随语义角色映射      |
| `border`                                         | 边框和分隔线                                                      |
| `skeletonBg`                                     | 原生 `NSkeleton` 与 `C_Skeleton` 共用的占位色                     |
| `mode`、`radius`                                 | 明暗模式与控件圆角                                                |

颜色接受 `#RGB` / `#RRGGBB`，以便 Naive 与第三方 SDK 正确计算衍生色；无效颜色会在创建配置时明确报错。圆角接受非负有限像素值。输入对象和内置色板不会被修改，不同应用及作用域的配置相互独立。

函数已包含配置类型推导，一般不需要类型注解。需要声明可复用的项目色板时，可选用包内 `ComponentThemeColors`；不必对 `typeof` 默认色板做类型转换。

普通原生控件、自绘区域与库自有弹层共享上述角色。对单个 Naive 组件的特殊需求，继续使用原生 `themeOverrides`；组件显式的颜色、样式与业务配色仍有自己的优先级，主题工厂不抢占它们。

## 色彩角色

| 角色                     | 浅色      | 深色      | 用途                 |
| ------------------------ | --------- | --------- | -------------------- |
| primary                  | `#2563eb` | `#60a5fa` | 主操作、选中、焦点   |
| success                  | `#15803d` | `#4ade80` | 成功、通过           |
| warning                  | `#b45309` | `#fbbf24` | 提醒、待处理         |
| error                    | `#b91c1c` | `#f87171` | 错误、拒绝           |
| info                     | `#0369a1` | `#38bdf8` | 一般信息             |
| on-solid                 | `#ffffff` | `#ffffff` | 实色面上的文字与标记 |
| bg-body                  | `#f6f8fc` | `#111827` | 页面背景             |
| bg-card                  | `#ffffff` | `#1f2937` | 内容面板             |
| bg-surface               | `#ffffff` | `#253246` | 浮层、编辑工具       |
| text-1 / text-2 / text-3 | 深到浅    | 浅到深    | 正文、辅助、次要信息 |
| border                   | `#dce3ed` | `#40516a` | 分隔与边框           |

完整标准由 `COMPONENT_COLOR_PALETTES` 导出；修改主题时集中维护，不在业务页面重复写色值。实色主按钮与语义按钮在普通、悬停、按下、聚焦和禁用状态均使用 `onSolid`，继承 `currentColor` 的图标随文字保持一致。Checkbox 的选中勾、Radio 的选中圆点及实色单选按钮、Switch 的轨道文字使用同一角色；普通正文、文字按钮、描边按钮和 Switch 的滑块保留各自角色。

`onSolid` 不再依据品牌亮度自动切换。例如 `primary: '#409eff'` 默认显示白字和白图标；亮黄色品牌需要深色前景时，显式配置 `createComponentTheme({ primary: '#ffff00', onSolid: '#000000' })`。自定义内容仍需根据实际字号和背景检查可读性。自绘区域可用 `--c-on-solid` 局部覆盖这个角色。

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

## 新增和维护组件的约束

- 原生控件使用现有 Provider；自绘区域使用语义变量与局部主题桥接，不再维护另一套品牌色默认值。
- `--c-*` 公共语义变量留给项目覆盖，组件只写 `--c-theme-*` 私有默认。组件自己的 `--c-table-*`、`--cl-*` 等领域样式钩子继续可用。
- 库自有 Teleport 与 SDK 弹层显式携带本实例主题，使用 SDK 官方配置或渲染回调；不扫描或修改其他实例的 DOM。
- 发布样式边界检查会拒绝全局公共主题默认、越界全局选择器，以及藏在 `:is()` / `:where()` / `:not()` / `:has()` 中的作用域逃逸。主题回归覆盖实际原生控件和自绘区域，不能只检查配置对象包含字段。
- 业务显式状态色、头像、视频遮罩、文档纸张、地图瓦片和反色导航等保留领域语义；新增这类例外时说明原因，避免把固定通用色混进例外。

边界检查约束的是可验证的样式作用域与覆盖规则。颜色角色是否选对、组合后的可读性和 SDK 升级仍需组件回归与视觉验收，不能用一次扫描代替。
