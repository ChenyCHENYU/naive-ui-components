import { defineConfig } from "tsdown";
import fs from "fs";
import path from "path";
import Vue from "unplugin-vue/rolldown";
import Components from 'unplugin-vue-components/rolldown'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'
import * as sass from "sass";

// ====== 动态生成多入口：主入口 + resolver + 每个组件独立入口 ======
function buildEntryMap(): Record<string, string> {
  const componentsDir = path.resolve(__dirname, "src/components");
  const entries: Record<string, string> = {
    index: 'src/index.ts',
    resolver: 'src/resolver.ts',
  }
  for (const dir of fs.readdirSync(componentsDir)) {
    const fullDir = path.join(componentsDir, dir);
    if (!fs.statSync(fullDir).isDirectory()) continue;
    const tsEntry = path.join(fullDir, "index.ts");
    if (fs.existsSync(tsEntry)) {
      entries[dir] = `src/components/${dir}/index.ts`;
    }
  }
  return entries;
}

/**
 * 前置 SCSS 编译插件（在 Vue 之前运行）：
 * 将 SFC <style lang="scss"> 虚拟模块通过 dart-sass 编译为 CSS，
 * 供 Vue 插件做 scoped 属性注入。
 */
function scssPrePlugin() {
  return {
    name: 'scss-pre',
    transform(code: string, id: string) {
      const isScssVirtual = id.includes('lang.scss')
      const isScssFile = id.endsWith('.scss') && !id.includes('node_modules')
      if (!isScssVirtual && !isScssFile) return null

      const filePath = id.split('?')[0]
      const result = sass.compileString(code, {
        loadPaths: [path.resolve(__dirname, 'src'), path.dirname(filePath)],
        silenceDeprecations: ['legacy-js-api'],
      })
      const css = result.css.replace(/@charset "UTF-8";\n?/g, '')
      return { code: css }
    },
  }
}

/**
 * 后置 CSS 模块类型标记插件（在 Vue 之后运行）：
 * 确保所有 SFC 样式虚拟模块的 moduleType 为 "css"，
 * 使 Rolldown 正确提取到独立 CSS 文件。
 */
function cssPostPlugin() {
  return {
    name: 'css-post',
    transform(code: string, id: string) {
      const isStyleModule =
        id.includes('vue&type=style') ||
        id.includes('lang.scss') ||
        id.includes('lang.css')
      if (!isStyleModule) return null
      return { code, moduleType: 'css' }
    },
  }
}

export default defineConfig({
  entry: buildEntryMap(),
  format: ['esm', 'cjs'],
  platform: 'neutral',
  outputOptions: {
    chunkFileNames: '[name].js',
  },
  plugins: [
    // ⚠️ 插件顺序关键（unplugin-vue 7.1.x 兼容）：
    // 1. scssPrePlugin：编译 SCSS → CSS（在 Vue 之前，避免 PostCSS 解析 SCSS 报错）
    // 2. Vue：编译模板 → 产生 resolveComponent()，处理 scoped 属性注入
    // 3. Components：将 resolveComponent() 替换为 naive-ui 静态导入
    // 4. cssPostPlugin：标记 moduleType: "css"（在 Vue 之后，防止被覆盖）
    scssPrePlugin(),
    Vue({
      isProduction: true,
      style: {
        preprocessOptions: {
          scss: {
            loadPaths: [path.resolve(__dirname, 'src')],
            silenceDeprecations: ['legacy-js-api'],
          },
        },
      },
    }),
    Components({
      resolvers: [NaiveUiResolver()],
      // 库构建模式：不生成 dts / 不写入 components.d.ts
      dts: false,
    }),
    cssPostPlugin(),
  ],
  dts: { vue: true },
  // v0.20+ 自动外部化所有 node_modules 依赖（含 CSS 深层导入），
  // 无需手动维护 external 列表，新增依赖也自动生效
  skipNodeModulesBundle: true,
  minify: true,
  sourcemap: true,
  clean: true,
})
