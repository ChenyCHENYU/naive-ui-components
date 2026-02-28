
export type SplitDirection = "horizontal" | "vertical";
export type CollapseTarget = "first" | "second";

export interface PanelInfo {
  size: number;
  collapsed: boolean;
}

export interface SplitPaneProps {
  direction?: SplitDirection;
  defaultSize?: number;
  minSize?: number;
  maxSize?: number;
  disabled?: boolean;
  collapsible?: boolean;
  showCollapseButton?: boolean;
  gutterSize?: number;
  step?: number;
}

export interface SplitPaneExpose {
  collapse: (target?: CollapseTarget) => void;
  expand: () => void;
  toggle: (target?: CollapseTarget) => void;
  resetSize: () => void;
  getPanelInfo: () => { first: PanelInfo; second: PanelInfo };
  setSize: (size: number) => void;
}

export interface SplitPaneEmits {
  resize: [firstSize: number, secondSize: number];
  collapse: [target: CollapseTarget];
  expand: [target: CollapseTarget];
  "drag-start": [size: number];
  "drag-end": [size: number];
}
