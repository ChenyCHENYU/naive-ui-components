import type { Ref } from "vue";

export type TreeMode = "menu" | "file" | "org" | "custom";
export type StatusType = "success" | "warning" | "error" | "info";
export type ButtonType = "primary" | "info" | "warning" | "error" | "default";

export interface TreeOption {
  [key: string]: any;
  id?: string | number;
  key?: string | number;
  label?: string;
  children?: TreeOption[];
}

export interface DropInfo {
  node: TreeOption;
  dragNode: TreeOption;
  dropPosition: "before" | "inside" | "after";
  event: DragEvent;
}

export interface TreeNodeData {
  [key: string]: any;
  id: string | number;
  name: string;
  type?: string;
  children?: TreeNodeData[];
}

export interface StatusConfig {
  field: string;
  values: Record<
    string | number,
    {
      text: string;
      type: StatusType;
    }
  >;
}

export interface ActionConfig {
  key: string;
  text: string;
  icon: string;
  type?: ButtonType;
  show?: (node: TreeNodeData) => boolean;
  confirm?: string;
}

export interface IconConfig {
  default?: string;
  typeMap?: Record<string, string>;
  colorMap?: Record<string, string>;
}

export interface TreeProps {
  data: TreeNodeData[];
  mode?: TreeMode;
  keyField?: string;
  labelField?: string;
  childrenField?: string;
  searchPattern?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  draggable?: boolean;
  showLine?: boolean;
  showToolbar?: boolean;
  addable?: boolean;
  addText?: string;
  refreshable?: boolean;
  iconField?: string;
  iconConfig?: IconConfig;
  statusConfigs?: StatusConfig[];
  actions?: ActionConfig[];
  defaultExpandAll?: boolean;
  defaultExpandedKeys?: (string | number)[];
  defaultSelectedKeys?: (string | number)[];
}

export interface TreeExpose {
  expandAll: () => void;
  collapseAll: () => void;
  selectNode: (key: string | number) => void;
  getSelectedNode: () => TreeNodeData | null;
  expandedKeys: Ref<(string | number)[]>;
  selectedKeys: Ref<(string | number)[]>;
}

export interface TreeEmits {
  "node-select": [node: TreeNodeData | null, selectedKeys: (string | number)[]];
  "node-action": [action: string, node: TreeNodeData];
  "node-drop": [info: DropInfo];
  add: [parentNode?: TreeNodeData];
  refresh: [];
}
