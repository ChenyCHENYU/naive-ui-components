/** 画笔模式 */
export type PenMode = "pen" | "eraser";

/** 导出格式 */
export type SignatureExportFormat = "png" | "jpeg" | "svg" | "blob";

/** 画笔配置 */
export interface PenConfig {
  color: string;
  width: number;
  opacity: number;
}

/** 橡皮擦配置 */
export interface EraserConfig {
  size: number;
}

/** 水印配置 */
export interface WatermarkConfig {
  show: boolean;
  text: string;
  fontSize: number;
  color: string;
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}

/** 导出配置 */
export interface ExportOptions {
  format?: SignatureExportFormat;
  quality?: number;
  includeBackground?: boolean;
  backgroundColor?: string;
  includeWatermark?: boolean;
}

/** 签名路径点 */
export interface SignaturePoint {
  x: number;
  y: number;
  pressure?: number;
  timestamp?: number;
}

/** 签名笔画 */
export interface SignatureStroke {
  points: SignaturePoint[];
  color: string;
  width: number;
  opacity: number;
  mode: PenMode;
}

/** 签名历史快照 */
export interface SignatureSnapshot {
  strokes: SignatureStroke[];
  timestamp: number;
}

/** 组件 Props */
export interface SignatureProps {
  width?: number | string;
  height?: number | string;
  penConfig?: Partial<PenConfig>;
  eraserConfig?: Partial<EraserConfig>;
  disabled?: boolean;
  readonly?: boolean;
  backgroundImage?: string;
  backgroundColor?: string;
  watermark?: Partial<WatermarkConfig>;
  showToolbar?: boolean;
  maxHistory?: number;
}

/** 组件暴露方法 */
export interface SignatureExpose {
  clear: () => void;
  undo: () => boolean;
  redo: () => boolean;
  export: (options?: ExportOptions) => Promise<string | Blob>;
  download: (filename?: string, options?: ExportOptions) => Promise<void>;
  loadImage: (imageUrl: string) => Promise<void>;
  getSignatureData: () => SignatureStroke[];
  loadSignatureData: (data: SignatureStroke[]) => void;
  isEmpty: () => boolean;
}

/** 组件事件 */
export interface SignatureEmits {
  "start-draw": [];
  drawing: [point: SignaturePoint];
  "end-draw": [stroke: SignatureStroke];
  clear: [];
  undo: [];
  redo: [];
  change: [data: SignatureStroke[]];
}
