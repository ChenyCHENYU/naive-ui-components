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
          },
        },
      },
    }),
    scssPlugin({
      include: ["**/*.scss", "!**/*.vue"],
      output: "dist/style.css",
      sourceMap: true,
    }),
  ],
  dts: { vue: true },
  external: ["vue", "naive-ui", "@vueuse/core", "@iconify/vue", "highlight.js"],
  clean: true,
});