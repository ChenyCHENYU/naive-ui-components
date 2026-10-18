export type SplitDirection = 'horizontal' | 'vertical'
export type CollapseTarget = 'first' | 'second'

export interface PanelInfo {
  /** Panel share of the available space, excluding the gutter (0–100). */
  size: number
  collapsed: boolean
}

export interface SplitPaneProps {
  /** Accessible name of the primary pane / splitter. */
  ariaLabel?: string
  direction?: SplitDirection
  /** Controlled first-panel percentage; use v-model:size to retain layout in the application. */
  size?: number
  defaultSize?: number
  minSize?: number
  maxSize?: number
  /** Minimum visible panel width/height in px, excluding the gutter. Explicit collapse bypasses it. */
  minFirstSize?: number
  minSecondSize?: number
  disabled?: boolean
  collapsible?: boolean
  showCollapseButton?: boolean
  /** Gutter size in px, at least 4. */
  gutterSize?: number
  /** Arrow key step in percentage points. Shift multiplies the step by 10. */
  step?: number
}

export interface SplitPaneExpose {
  collapse: (target?: CollapseTarget) => void
  expand: () => void
  toggle: (target?: CollapseTarget) => void
  resetSize: () => void
  getPanelInfo: () => { first: PanelInfo; second: PanelInfo }
  setSize: (size: number) => void
}

export interface SplitPaneEmits {
  'update:size': [size: number]
  resize: [firstSize: number, secondSize: number]
  collapse: [target: CollapseTarget]
  expand: [target: CollapseTarget]
  'drag-start': [size: number]
  'drag-end': [size: number]
}
