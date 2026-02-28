/**
 * 本地存储封装
 *
 * 组件库内部使用的 localStorage 工具函数。
 * 提供类型安全的序列化/反序列化。
 */

const isSerializable = (value: unknown): value is object =>
  typeof value === "object" && value !== null && !(value instanceof Date);

/** 存储数据 */
export const setItem = <T extends string | number | boolean | object | null>(
  key: string,
  value: T,
): void => {
  const storageValue = isSerializable(value)
    ? JSON.stringify(value)
    : value instanceof Date
      ? value.toISOString()
      : String(value);

  window.localStorage.setItem(key, storageValue);
};

/** 获取数据（安全反序列化） */
export const getItem = <T = unknown>(key: string): T | null => {
  const data = window.localStorage.getItem(key);
  if (data === null) return null;

  try {
    return JSON.parse(data) as T;
  } catch {
    return data as T;
  }
};

/** 删除指定数据 */
export const removeItem = (key: string) => window.localStorage.removeItem(key);

/** 删除所有数据 */
export const removeAllItem = () => window.localStorage.clear();
