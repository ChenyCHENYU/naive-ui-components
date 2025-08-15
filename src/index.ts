import type { App, Component } from "vue";

// 导入所有组件
import C_Code from "./components/C_Code/index.vue";
import C_Icon from "./components/C_Icon/index.vue";

// 导入插件和类型
import { setupHighlight, useHighlight } from "./plugins/highlight";
import type { HighlightPluginOptions } from "./plugins/highlight"; // 从插件文件导入类型

// 删除重复的类型定义，只定义这个
export interface ComponentLibOptions {
  highlight?: HighlightPluginOptions; // 使用导入的类型
}

// 组件列表
const components: Component[] = [C_Code, C_Icon];

// 单独导出组件
export { C_Code, C_Icon };

// 导出插件
export { setupHighlight, useHighlight };

// 重新导出类型
export type { HighlightPluginOptions };

const install = (app: App, options: ComponentLibOptions = {}) => {
  components.forEach((component) => {
    const name =
      (component as any).__name ||
      (component as any).name ||
      "UnknownComponent";
    app.component(name, component);
  });

  if (options.highlight !== undefined) {
    setupHighlight(app, options.highlight);
  }
};

export default {
  install,
  version: "0.1.0",
};

declare global {
  interface Window {
    Vue?: App;
  }
}

if (typeof window !== "undefined" && window.Vue) {
  install(window.Vue);
}