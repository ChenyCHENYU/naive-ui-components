import type { Ref, Directive } from "vue";
import type { ButtonProps } from "naive-ui";

export type ActionButtonType =
  | "default"
  | "primary"
  | "info"
  | "success"
  | "warning"
  | "error";

export type ActionButtonSize = "tiny" | "small" | "medium" | "large";

export type ActionGroupAlign =
  | "left"
  | "center"
  | "right"
  | "space-between"
  | "space-around";

export interface ActionDropdownItem {
  key: string;
  label: string;
  icon?: string;
  disabled?: boolean | Ref<boolean>;
  show?: boolean | Ref<boolean>;
  onClick?: () => void | Promise<void>;
}

export interface ActionItem {
  key?: string;
  label: string;
  icon?: string;
  type?: ActionButtonType;
  size?: ActionButtonSize;
  loading?: boolean | Ref<boolean>;
  disabled?: boolean | Ref<boolean>;
  show?: boolean | Ref<boolean>;
  tooltip?: string;
  group?: "left" | "right";
  dropdown?: ActionDropdownItem[];
  onClick?: () => void | Promise<void>;
  buttonProps?: Partial<ButtonProps>;
  directives?: Array<
    | [Directive, any?]
    | [Directive, any, string?]
    | [Directive, any, string?, Record<string, boolean>?]
  >;
}

export interface ActionBarConfig {
  align?: ActionGroupAlign;
  size?: ActionButtonSize;
  gap?: number;
  wrap?: boolean;
  showDivider?: boolean;
  dividerType?: "vertical" | "horizontal";
  compact?: boolean;
  inline?: boolean;
}

export interface TableActionsProps {
  actions?: ActionItem[];
  leftActions?: ActionItem[];
  rightActions?: ActionItem[];
  config?: ActionBarConfig;
}

export interface TableActionsEmits {
  (e: "action-click", action: ActionItem): void;
  (e: "dropdown-click", item: ActionDropdownItem, action: ActionItem): void;
}
