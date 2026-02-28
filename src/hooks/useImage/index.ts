/**
 * @description: 图片路径解析函数（组件库版本）
 * 在组件库中，图片路径由宿主应用管理。
 * 如果传入的是完整 URL（http/https/data:）则直接返回；
 * 否则可通过 imageResolver 配置自定义解析逻辑。
 * @param {string} imagePath 图片路径或完整 URL
 * @param {Function} resolver 可选的自定义解析器
 * @return {Promise<string>} 处理后图片路径
 */
export const useImage = async (
  imagePath: string,
  resolver?: (path: string) => string | Promise<string>,
): Promise<string> => {
  if (!imagePath) return "";

  // 完整 URL 直接返回
  if (
    imagePath.startsWith("http://") ||
    imagePath.startsWith("https://") ||
    imagePath.startsWith("data:") ||
    imagePath.startsWith("blob:") ||
    imagePath.startsWith("/")
  ) {
    return imagePath;
  }

  // 如果提供了自定义解析器，使用自定义解析器
  if (resolver) {
    try {
      return await resolver(imagePath);
    } catch (e) {
      console.error(`[useImage] 自定义解析器处理失败: ${imagePath}`, e);
      return "";
    }
  }

  // 默认：直接返回路径（宿主应用应保证路径可访问）
  return imagePath;
};

/**
 * @description: 同步版本的图片路径处理函数
 * @param {string} imagePath 图片路径或完整 URL
 * @return {string} 图片URL
 */
export const useImageSync = (imagePath: string): string => {
  if (!imagePath) return "";

  // 完整 URL 直接返回
  if (
    imagePath.startsWith("http://") ||
    imagePath.startsWith("https://") ||
    imagePath.startsWith("data:") ||
    imagePath.startsWith("blob:") ||
    imagePath.startsWith("/")
  ) {
    return imagePath;
  }

  return imagePath;
};
