import { defineConfig } from "tsdown";
import Vue from "unplugin-vue/rolldown";
const scssPlugin = require("rollup-plugin-scss");

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  platform: "neutral",
  plugins: [
    Vue({
      isProduction: true,
      style: {
        preprocessOptions: {
          scss: {
            // 全局 SCSS 变量或导入
          },
        },
      },
    }),
    scssPlugin({
      // 只处理独立的 SCSS 文件，不处理 Vue 组件内的样式
      include: ["**/*.scss", "!**/*.vue"],
      output: "dist/style.css",
      sourceMap: true,
    }),
  ],
  dts: { vue: true },
  external: ["vue", "naive-ui", "@vueuse/core", "@iconify/vue", "highlight.js"],
  clean: true,
});