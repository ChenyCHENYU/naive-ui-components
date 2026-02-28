/** 搜索字段支持的控件类型 */
export type SearchFieldType = "input" | "select" | "date-range" | "spacer";

export interface SearchOptionItem {
  labelDefault?: string;
  label?: string;
  value?: string | number | boolean;
  disabled?: boolean;
  [key: string]: any;
}

export interface SearchFormItem {
  type: SearchFieldType;
  prop: string;
  placeholder?: string;
  list?: SearchOptionItem[];
  hisList?: string[];
  isFocus?: boolean;
  show?: boolean;
}

export interface SearchFormParams {
  pageNum?: number;
  pageSize?: number;
  [key: string]: any;
}

export interface SearchConfig {
  foldThreshold?: number;
  historyMaxItems?: number;
  requireValue?: boolean;
}
