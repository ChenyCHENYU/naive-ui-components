import type { EraserConfig, PenConfig, WatermarkConfig } from "./types";

export const DEFAULT_PEN_CONFIG: PenConfig = {
  color: "#000000",
  width: 2,
  opacity: 1,
};

export const DEFAULT_ERASER_CONFIG: EraserConfig = { size: 20 };

export const DEFAULT_WATERMARK_CONFIG: WatermarkConfig = {
  show: false,
  text: "",
  fontSize: 12,
  color: "#999999",
  position: "bottom-right",
};

export const PRESET_COLORS = [
  "#000000",
  "#FF0000",
  "#0000FF",
  "#00AA00",
  "#FF6600",
  "#9900FF",
];

export const PRESET_WIDTHS = [1, 2, 3, 5, 8];

export const EXPORT_FORMAT_OPTIONS = [
  { label: "PNG", value: "png" },
  { label: "JPEG", value: "jpeg" },
  { label: "SVG", value: "svg" },
  { label: "Blob", value: "blob" },
] as const;

export const WATERMARK_POSITION_OPTIONS = [
  { label: "左上", value: "top-left" },
  { label: "右上", value: "top-right" },
  { label: "左下", value: "bottom-left" },
  { label: "右下", value: "bottom-right" },
] as const;
