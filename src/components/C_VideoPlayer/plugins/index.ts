/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-26
 * @Description: plugins 统一导出
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */

export {
  loadHlsPlayer,
  mergeHlsConfig,
  DEFAULT_HLS_CONFIG,
} from "./hls-adapter";
export type { HlsAdapterOptions } from "./hls-adapter";

export {
  loadDashPlayer,
  mergeDashConfig,
  DEFAULT_DASH_CONFIG,
} from "./dash-adapter";
export type { DashAdapterOptions } from "./dash-adapter";

export { createAnalyticsPlugin } from "./analytics-reporter";
