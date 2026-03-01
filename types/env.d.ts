/// <reference types="vite/client" />

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare module "*.scss" {
  const classes: { readonly [key: string]: string };
  export default classes;
}

// 缺少类型声明的第三方模块
declare module "vue3-puzzle-vcode" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<any, any, any>;
  export default component;
}

declare module "wangeditor" {
  const E: any;
  export default E;
}

declare module "leaflet" {
  const L: any;
  export default L;
  export const map: any;
  export const tileLayer: any;
  export const marker: any;
  export const icon: any;
  export const latLng: any;
  export const divIcon: any;
  export const control: any;
  export const layerGroup: any;
}

declare module "@kangc/v-md-editor" {
  import type { Plugin } from "vue";
  const VMdEditor: Plugin & any;
  export default VMdEditor;
}

declare module "qrcode" {
  const QRCode: {
    toCanvas(
      canvas: HTMLCanvasElement,
      text: string,
      options?: any,
    ): Promise<void>;
    toDataURL(text: string, options?: any): Promise<string>;
    toString(text: string, options?: any): Promise<string>;
  };
  export default QRCode;
}


