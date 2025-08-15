declare global {
  interface Window {
    // 如果有全局的 window 扩展
  }
}

// 组件库相关的全局类型
export interface ComponentTheme {
  primary: string;
  secondary: string;
  background: string;
}

export interface ComponentSize {
  small: string;
  medium: string;
  large: string;
}
