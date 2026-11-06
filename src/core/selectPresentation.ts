/** 摘要限制常驻标签数量，完整选中值仍由下拉列表管理。 */
export function shouldSummarizeSelectTags(
  multiple: unknown,
  maxTagCount: unknown
): boolean {
  return multiple === true && maxTagCount === undefined
}
