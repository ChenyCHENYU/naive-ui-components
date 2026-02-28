import C_Upload from "./index.vue";

export { C_Upload };

// 导出 composables 供高级用户使用
export { useUploadCore } from "./composables/useUploadCore";
export { useDragDrop } from "./composables/useDragDrop";
export { useFileHash } from "./composables/useFileHash";
export { useChunkUpload } from "./composables/useChunkUpload";
export { useUploadQueue } from "./composables/useUploadQueue";

// 导出工具函数
export { formatFileSize, getFileIcon } from "./constants";

// 导出类型
export type {
  UploadProps,
  UploadExpose,
  UploadEmits,
  UploadFileItem,
  UploadFileStatus,
  UploadChunk,
  ChunkProgress,
  UploadRequestOptions,
  CustomUploadRequest,
  InstantCheckFn,
  UploadedChunksQueryFn,
  MergeChunksFn,
} from "./types";
