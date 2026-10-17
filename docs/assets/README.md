# 品牌资源 / Brand assets

沿用 Robot 家族的几何 R、机器人双眼和天线，以绿色区分 Naive UI 组件库；右下角模块表示组件独立导入。标识用于本项目文档，不代表 Naive UI 官方品牌。

| 文件                                                               | 用途                             |
| ------------------------------------------------------------------ | -------------------------------- |
| [naive-ui-components-logo.svg](./naive-ui-components-logo.svg)     | 128 × 128，透明背景，可缩放 Logo |
| [naive-ui-components-logo.png](./naive-ui-components-logo.png)     | 512 × 512，透明背景，通用预览    |
| [naive-ui-components-banner.svg](./naive-ui-components-banner.svg) | 1280 × 420，可编辑封面源文件     |
| [naive-ui-components-banner.png](./naive-ui-components-banner.png) | 2560 × 840，README 高清封面      |

主色为 `#249D70` / `#0C5E47`，强调色为 `#A7F3CB`，封面底色为 `#0B1C19`。封面右侧是表单、表格与流程的示意插画。

SVG 自包含，无外部字体、脚本、图片或网络请求。中英文 README 共用英文封面；项目定位与操作说明在各自正文中提供。

修改 SVG 后，在具备 Playwright 和 Chromium 的环境中执行以下导出示例。`playwright` 是文档导出工具，组件库运行时无需安装。

```js
import { chromium } from 'playwright'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const browser = await chromium.launch()
try {
  for (const [name, width, height, scale] of [
    ['banner', 1280, 420, 2],
    ['logo', 128, 128, 4],
  ]) {
    const page = await browser.newPage({
      viewport: { width, height },
      deviceScaleFactor: scale,
    })
    const base = resolve(`docs/assets/naive-ui-components-${name}`)
    await page.goto(pathToFileURL(`${base}.svg`).href)
    await page
      .locator('svg')
      .first()
      .screenshot({
        path: `${base}.png`,
        omitBackground: true,
      })
    await page.close()
  }
} finally {
  await browser.close()
}
```
