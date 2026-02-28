/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Description: 自定义布局组件配置文件
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
 */
import type { FormOption } from "../../types";

/* ================= 核心类型定义 ================= */

export interface CustomArea {
  id: string;
  type: AreaType;
  title: string;
  showTitle: boolean;
  width?: number;
  columns?: number;
  fields: FormOption[];
}

export type AreaType = "horizontal" | "vertical" | "grid";

interface LayoutTemplate {
  key: string;
  name: string;
  icon: string;
  description: string;
  areas: Omit<CustomArea, "id" | "fields">[];
}

/* ================= 静态配置 ================= */

export const AREA_TYPE_OPTIONS = [
  { label: "水平排列", value: "horizontal" as const },
  { label: "垂直排列", value: "vertical" as const },
  { label: "网格布局", value: "grid" as const },
] as const;

const FIELD_TYPE_MAPPING: Record<string, string> = {
  input: "输入框",
  textarea: "文本域",
  select: "选择器",
  checkbox: "复选框",
  radio: "单选框",
  inputNumber: "数字",
  datePicker: "日期",
  switch: "开关",
  upload: "文件上传",
  editor: "富文本",
  rate: "评分",
  slider: "滑块",
} as const;

const AREA_LAYOUT_TYPE_MAPPING: Record<AreaType, string> = {
  horizontal: "inline",
  vertical: "default",
  grid: "grid",
} as const;

export const LAYOUT_TEMPLATES: readonly LayoutTemplate[] = [
  {
    key: "leftRight",
    name: "左右分栏",
    icon: "◗",
    description: "经典的左右两栏布局，适用于主次信息分离",
    areas: [
      { type: "horizontal", title: "主要信息", showTitle: true, width: 60 },
      { type: "horizontal", title: "辅助信息", showTitle: true, width: 40 },
    ],
  },
  {
    key: "topBottom",
    name: "上下分区",
    icon: "◫",
    description: "上下分区布局，适用于分层级信息展示",
    areas: [
      { type: "vertical", title: "基础信息", showTitle: true },
      { type: "vertical", title: "详细信息", showTitle: true },
    ],
  },
  {
    key: "threeColumn",
    name: "三列布局",
    icon: "≡",
    description: "均匀的三列布局，适用于信息量较大的表单",
    areas: [
      { type: "horizontal", title: "区域 1", showTitle: true, width: 33 },
      { type: "horizontal", title: "区域 2", showTitle: true, width: 33 },
      { type: "horizontal", title: "区域 3", showTitle: true, width: 33 },
    ],
  },
] as const;

/* ================= 工具函数 ================= */

export const getFieldTypeName = (type: string): string =>
  FIELD_TYPE_MAPPING[type] || type;

export const getAreaLayoutType = (areaType: AreaType): string =>
  AREA_LAYOUT_TYPE_MAPPING[areaType] || "default";

export const generateUniqueId = (prefix = "area"): string =>
  `${prefix}_${Math.random().toString(36).substring(2, 11)}`;

export const cloneField = (field: FormOption): FormOption => ({
  ...field,
  id: generateUniqueId("field"),
});

export const createNewArea = (type: AreaType, index: number): CustomArea => {
  const typeNames: Record<AreaType, string> = {
    horizontal: "水平",
    vertical: "垂直",
    grid: "网格",
  };

  const baseArea: CustomArea = {
    id: generateUniqueId(),
    type,
    title: `${typeNames[type]}区域 ${index + 1}`,
    showTitle: true,
    fields: [],
  };

  if (type === "horizontal") baseArea.width = 50;
  if (type === "grid") baseArea.columns = 2;

  return baseArea;
};

export const applyLayoutTemplate = (templateKey: string): CustomArea[] => {
  const template = LAYOUT_TEMPLATES.find((t) => t.key === templateKey);

  if (!template) {
    console.warn(`[CustomLayout] 未找到模板: ${templateKey}`);
    return [];
  }

  return template.areas.map((areaConfig) => ({
    ...areaConfig,
    id: generateUniqueId(),
    fields: [],
  })) as CustomArea[];
};

export const exportLayoutConfig = (areas: CustomArea[]): void => {
  try {
    const config = {
      areas,
      version: "1.0.0",
      timestamp: Date.now(),
      exportTime: new Date().toISOString(),
    };

    const dataStr = JSON.stringify(config, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    Object.assign(link, {
      href: url,
      download: `custom-layout-${Date.now()}.json`,
      style: { display: "none" },
    });

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("[CustomLayout] 导出布局配置失败:", error);
    throw new Error("导出布局配置失败");
  }
};

export const getAreaStyle = (area: CustomArea): Record<string, any> => {
  const style: Record<string, any> = {};

  if (area.type === "horizontal" && area.width) {
    style.width = `${area.width}%`;
    style.minWidth = "200px";
  }

  return style;
};

export const getAreaFieldCount = (area: CustomArea): number =>
  area.fields.length;
