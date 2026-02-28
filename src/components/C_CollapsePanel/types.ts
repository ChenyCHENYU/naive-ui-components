export type CollapsePanelVariant = "default" | "card" | "ghost";
export type ExpandIconPosition = "left" | "right";

export interface CollapsePanelItem {
  key: string;
  title: string;
  subtitle?: string;
  icon?: string;
  disabled?: boolean;
  lazy?: boolean;
  destroyOnCollapse?: boolean;
}

export interface CollapsePanelProps {
  items: CollapsePanelItem[];
  activeKeys?: string[];
  defaultActiveKeys?: string[];
  accordion?: boolean;
  variant?: CollapsePanelVariant;
  expandIconPosition?: ExpandIconPosition;
  bordered?: boolean;
  persistKey?: string;
}

export interface CollapsePanelExpose {
  expandAll: () => void;
  collapseAll: () => void;
  toggle: (key: string) => void;
  getActiveKeys: () => string[];
  scrollToPanel: (key: string) => void;
}

export interface CollapsePanelEmits {
  "update:activeKeys": [keys: string[]];
  expand: [key: string];
  collapse: [key: string];
  change: [activeKeys: string[]];
}
