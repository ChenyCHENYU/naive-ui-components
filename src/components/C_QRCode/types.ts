export type ErrorCorrectionLevel = "L" | "M" | "Q" | "H";
export type RenderMode = "canvas" | "svg";
export type ExportType = "png" | "jpeg" | "svg";

export interface LogoOptions {
  src: string;
  size?: number;
  borderRadius?: number;
  padding?: number;
  bgColor?: string;
}

export interface QRCodeProps {
  value: string;
  size?: number;
  color?: string;
  bgColor?: string;
  errorCorrectionLevel?: ErrorCorrectionLevel;
  margin?: number;
  mode?: RenderMode;
  logo?: LogoOptions;
  showBorder?: boolean;
  label?: string;
  showLabel?: boolean;
}

export interface QRCodeExpose {
  toDataURL: (type?: ExportType, quality?: number) => Promise<string>;
  download: (filename?: string, type?: ExportType) => Promise<void>;
  refresh: () => Promise<void>;
}
