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
 * 内联 SCSS 编译插件：
 * 将 SFC <style lang="scss"> 虚拟模块通过 dart-sass 编译为 CSS，
 * 并告知 Rolldown 按 CSS 模块类型处理。
 */
function scssTransformPlugin() {
  return {
    name: "scss-transform",
    transform(code: string, id: string) {
      const isScssVirtual = id.includes("lang.scss");
      const isScssFile = id.endsWith(".scss") && !id.includes("node_modules");
      if (!isScssVirtual && !isScssFile) return null;

      const filePath = id.split("?")[0];
      const result = sass.compileString(code, {
        loadPaths: [path.resolve(__dirname, "src"), path.dirname(filePath)],
        silenceDeprecations: ["legacy-js-api"],
      });
      // 去掉 Sass 输出的 @charset，Rolldown 自行处理编码
      const css = result.css.replace(/@charset "UTF-8";\n?/g, "");
      return { code: css, moduleType: "css" };
    },
  };
}

export default defineConfig({
  entry: buildEntryMap(),
  format: ['esm', 'cjs'],
  platform: 'neutral',
  outputOptions: {
    chunkFileNames: '[name].js',
  },
  plugins: [
    scssTransformPlugin(),
    Components({
      resolvers: [NaiveUiResolver()],
      // 库构建模式：不生成 dts / 不写入 components.d.ts
      dts: false,
    }),
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
  ],
  dts: { vue: true },
  // v0.20+ 自动外部化所有 node_modules 依赖（含 CSS 深层导入），
  // 无需手动维护 external 列表，新增依赖也自动生效
  skipNodeModulesBundle: true,
  minify: true,
  sourcemap: true,
  clean: true,
})
