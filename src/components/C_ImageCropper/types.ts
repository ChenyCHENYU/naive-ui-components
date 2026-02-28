export type CropOutputFormat = "png" | "jpeg" | "webp";

export interface AspectRatioPreset {
  label: string;
  value: number;
}

export interface CropResult {
  base64: string;
  blob: Blob;
  width: number;
  height: number;
  format: CropOutputFormat;
}

export interface ImageCropperProps {
  src?: string;
  aspectRatio?: number;
  outputFormat?: CropOutputFormat;
  outputQuality?: number;
  maxOutputWidth?: number;
  maxOutputHeight?: number;
  showPreview?: boolean;
  showToolbar?: boolean;
  circular?: boolean;
  disabled?: boolean;
  height?: string | number;
  modal?: boolean;
  modalTitle?: string;
}

export interface ImageCropperExpose {
  getCropResult: () => Promise<CropResult>;
  rotate: (angle: number) => void;
  zoom: (scale: number) => void;
  flipX: () => void;
  flipY: () => void;
  reset: () => void;
  setAspectRatio: (ratio: number) => void;
  loadFile: (file: File) => void;
  open: (src?: string) => void;
  close: () => void;
}

export interface ImageCropperEmits {
  crop: [result: CropResult];
  ready: [];
  error: [error: Event];
  confirm: [result: CropResult];
  cancel: [];
}
