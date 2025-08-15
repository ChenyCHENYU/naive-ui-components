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
            additionalData: `
              @use "@/styles/global.scss" as *;
            `,
            // 如果你的 @ 符号没配过，要在 tsconfig.json / vite alias 里加:
            // "paths": { "@/*": ["src/*"] }
          },
        },
      },
    }),
    scssPlugin({
      // 只处理独立 SCSS 文件，Vue 中的交给 unplugin-vue 处理
      include: ["**/*.scss", "!**/*.vue"],
      output: "dist/style.css",
      sourceMap: true,
    }),
  ],
  dts: { vue: true },
  external: ["vue", "naive-ui", "@vueuse/core", "@iconify/vue", "highlight.js"],
  clean: true,
});