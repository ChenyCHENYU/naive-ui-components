/**
 * Leaflet 样式引用的全部相对图片资源。
 * 该清单由构建复制、产物校验和测试共同消费，避免三处规则漂移。
 */
export const LEAFLET_IMAGE_FILES = Object.freeze([
  'layers-2x.png',
  'layers.png',
  'marker-icon-2x.png',
  'marker-icon.png',
  'marker-shadow.png',
])

/** 提取 CSS 中需要随包发布的相对 URL。 */
export function getRelativeCssAssets(css) {
  return [...css.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/giu)]
    .map(match => match[2].trim().replaceAll('\\', '/'))
    .filter(asset => !/^(?:#|data:|https?:|blob:|\/\/|\/)/iu.test(asset))
}
