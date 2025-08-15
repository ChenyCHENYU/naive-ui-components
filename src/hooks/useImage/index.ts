/**
 * @description: 图片引用处理函数
 * @param {string} imagePath 处理前的图片路径，带目录或不带
 * @return {Promise<string>} 处理后图片路径
 */
export const useImage = async (imagePath: string): Promise<string> => {
  // 处理路径，支持带或不带扩展名
  const path = imagePath.replace(/\..+$/, "");

  // 支持的图片格式
  const extensions = ["png", "jpg", "jpeg", "svg"];

  for (const ext of extensions) {
    try {
      const module = await import(`@/assets/images/${path}.${ext}`);
      return module.default || module;
    } catch {
      // 继续尝试下一个扩展名
      continue;
    }
  }

  console.error(`[useImage] 未找到图片: ${imagePath}`);
  return "";
};

/**
 * @description: 同步版本的图片引用函数（需要预先导入）
 * @param {string} imagePath 图片路径
 * @return {string} 图片URL
 */
export const useImageSync = (imagePath: string): string => {
  // 这个版本需要你在使用前手动导入图片
  // 主要用于你已经通过其他方式导入了图片的情况
  console.warn("[useImageSync] 请使用异步版本 useImage");
  return "";
};
