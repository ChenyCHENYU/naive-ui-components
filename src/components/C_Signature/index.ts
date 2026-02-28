export { default as C_Signature } from "./index.vue";
export type {
  PenMode,
  SignatureExportFormat,
  PenConfig,
  EraserConfig,
  WatermarkConfig,
  ExportOptions,
  SignaturePoint,
  SignatureStroke,
  SignatureSnapshot,
  SignatureProps,
  SignatureExpose,
  SignatureEmits,
} from "./types";
export { useSignatureCanvas } from "./composables/useSignatureCanvas";
export { useSignatureExport } from "./composables/useSignatureExport";
export { useSignatureHistory } from "./composables/useSignatureHistory";
